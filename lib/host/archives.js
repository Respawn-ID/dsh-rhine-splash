import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, basename, join, relative, isAbsolute } from 'node:path';
import { readJson, refuseRequest, reply } from './http.js';

const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Find archived entries with neither a stored nor a live conversation. */
export function staleArchivedIds(archivedIds, storedIds, isLive) {
  const stored = storedIds instanceof Set ? storedIds : new Set(storedIds);
  return archivedIds.filter((id) => !stored.has(id) && !isLive(id));
}

/** Accept only the folder named after the session, strictly beneath the persistence root. */
export function isSessionDirInside(root, dir, id) {
  const path = relative(root, dir);
  return path !== '' && !isAbsolute(path) && !path.startsWith('..')
    && basename(dir).startsWith('session-') && (id === undefined || basename(dir) === id);
}

/**
 * Forget a deleted session everywhere dsh keeps it, so it leaves every client at once.
 * Each step is best effort; the returned list names the ones that failed.
 */
export async function forgetSession(ctx, id) {
  const failed = [];
  const step = async (label, fn) => {
    try { await fn(); } catch (error) {
      failed.push(label);
      ctx.logger?.warn?.(`rhine-splash: cleanup "${label}" for ${id} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const registry = ctx.get('workspaceRegistry');
  // Clients drop the row first, so it never flashes back as unarchived.
  await step('list', () => ctx.emit('api-session/removed', id));
  await step('workspace', async () => {
    for (const workspace of registry?.list?.() ?? []) await workspace.detachSession?.(id);
  });
  // Internal header indexes (no public method): without this, the registry still treats the id as known.
  await step('index', () => {
    for (const key of ['headers', 'sessionPaths', 'missingSessionPaths', 'invalidSessionPaths']) registry?.[key]?.delete?.(id);
  });
  await step('pin', () => registry?.unpinSession?.(id));
  await step('archive', () => registry?.unarchiveSession?.(id));
  // Internal caches (no public method): the decoded log and the stored projection (title, stats).
  await step('memo', () => ctx.get('sessionPersistence')?.coldLogMemo?.delete?.(id));
  await step('cache', () => ctx.get('sessionProjectionCache')?.requireTable?.()?.delete?.(id));
  return failed;
}

/** Let the search index drop deleted sessions now: a search reconciles it with the stored logs first. */
export async function reconcileSearch(ctx) {
  await ctx.get('sessionQuery')?.searchSessions?.({
    query: 'rhine-splash',
    eventFilters: [{ kind: 'type', values: ['user/message', 'assistant/message'] }, { kind: 'surface', values: ['current'] }],
    limit: 1,
  });
}

/**
 * Permanently delete one archived, unloaded session.
 * @returns `[httpStatus, reply]`; a loaded session is left alone with status `loaded`.
 */
export async function deleteArchivedSession(ctx, id) {
  if (!ctx.get('workspaceRegistry')?.archivedSessionIds?.includes(id)) return [409, { status: 'not-archived' }];
  if (ctx.get('sessions')?.get(id) !== undefined) return [409, { status: 'loaded' }];
  const persistence = ctx.get('sessionPersistence');
  const snapshot = persistence && (await persistence.list()).find((entry) => entry.header.id === id);
  if (!snapshot) return [404, { status: 'missing' }];
  const dir = dirname(persistence.locate({ id, cwd: snapshot.header.cwd }).path);
  if (!isSessionDirInside(persistence.root, dir, id)) return [400, { status: 'invalid' }];
  // Resolve links before a recursive delete: the real folder must still sit inside the real root.
  const info = await lstat(dir);
  if (!info.isDirectory() || !isSessionDirInside(await realpath(persistence.root), await realpath(dir), id)) {
    return [400, { status: 'invalid' }];
  }
  // Windows refuses to remove a file another process (an indexer, an antivirus scan) briefly holds.
  await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  const failed = await forgetSession(ctx, id);
  ctx.logger?.info?.(`rhine-splash: permanently deleted archived session ${id}`);
  reconcileSearch(ctx).catch(() => {});
  return [200, failed.length ? { status: 'deleted', cleanup: failed } : { status: 'deleted' }];
}

/**
 * Deletions waiting for the next start. dsh keeps a conversation loaded for the rest of the run
 * once any window has shown it, and offers no way to unload it, so its folder can only go
 * before a window opens it again. The list sits beside the sessions folder (`$DSH_HOME/rhine-splash`).
 */
export function deletionQueue(persistence) {
  const path = join(dirname(persistence.root), 'rhine-splash', 'pending-deletions.json');
  const read = async () => {
    try {
      const ids = JSON.parse(await readFile(path, 'utf8'))?.ids;
      return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && SESSION_ID.test(id)) : [];
    } catch { return []; }
  };
  const write = async (ids) => {
    if (!ids.length) { await rm(path, { force: true }); return; }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path + '.tmp', JSON.stringify({ ids }));
    await rename(path + '.tmp', path);
  };
  return {
    path, read,
    async add(id) { const ids = await read(); if (!ids.includes(id)) await write([...ids, id]); },
    async keep(ids) { await write(ids); },
  };
}

/** Delete the queued sessions; keep those still loaded or whose deletion failed for the next start. */
export async function drainDeletions(ctx, queue, { isDisposed = () => false } = {}) {
  const kept = [];
  for (const id of await queue.read()) {
    if (isDisposed()) { kept.push(id); continue; }
    try {
      const [, { status }] = await deleteArchivedSession(ctx, id);
      // Unarchived since (`not-archived`) cancels the request; a vanished folder needs nothing more.
      if (status === 'loaded') kept.push(id);
    } catch (error) {
      kept.push(id);
      ctx.logger?.warn?.(`rhine-splash: queued deletion of ${id} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await queue.keep(kept);
  return kept;
}

/** Add archive cleanup and return its route registrar for the shared webServer inject. */
export function registerArchives(ctx, { warn }) {
  let deletionPending = Promise.resolve();
  if (typeof ctx.inject === 'function') ctx.inject(['workspaceRegistry', 'sessionPersistence'], (child) => {
    let disposed = false;
    child.effect(() => () => { disposed = true; });
    void (async () => {
      try {
        let ready = false;
        for (let attempt = 0; attempt < 30 && !disposed; attempt++) {
          try {
            const registry = child.workspaceRegistry ?? ctx.get('workspaceRegistry');
            registry.archivedSessionIds;
            ready = true;
            break;
          } catch {
            if (attempt < 29) await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        if (!ready || disposed) return;
        const registry = child.workspaceRegistry ?? ctx.get('workspaceRegistry');
        const persistence = child.sessionPersistence ?? ctx.get('sessionPersistence');
        // Queued deletions first, before a window can show (and so load) those conversations again.
        const queue = deletionQueue(persistence);
        await (deletionPending = deletionPending.then(() => drainDeletions(ctx, queue, { isDisposed: () => disposed })).catch((error) => {
          warn(ctx, error instanceof Error ? error.message : String(error));
        }));
        if (disposed) return;
        const stored = new Set((await persistence.list()).map((s) => s.header?.id).filter(Boolean));
        if (disposed) return;
        const stale = staleArchivedIds(registry.archivedSessionIds, stored,
          (id) => ctx.get('sessions')?.get(id) !== undefined);
        for (const id of stale) {
          if (disposed) return;
          await registry.unarchiveSession(id);
          ctx.logger?.info?.(`rhine-splash: dropped archived entry ${id} whose conversation no longer exists`);
        }
      } catch (error) {
        warn(ctx, error instanceof Error ? error.message : String(error));
      }
    })();
  });
  return (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/sessions/delete',
      handler: async (req, res) => {
        if (refuseRequest(ctx, req, res, 'POST')) return;
        try {
          const body = await readJson(req);
          if (body === undefined) { reply(res, 413, { status: 'invalid' }); return; }
          const id = body?.sessionId;
          if (typeof id !== 'string' || !SESSION_ID.test(id)) {
            reply(res, 400, { status: 'invalid' }); return;
          }
          const deletion = deletionPending.then(async () => {
            const [code, value] = await deleteArchivedSession(ctx, id);
            if (value.status !== 'loaded') { reply(res, code, value); return; }
            // Shown in this run, so dsh keeps it loaded: delete it at the next start instead.
            await deletionQueue(ctx.get('sessionPersistence')).add(id);
            ctx.logger?.info?.(`rhine-splash: archived session ${id} is loaded; it will be deleted at the next start`);
            reply(res, 202, { status: 'scheduled' });
          });
          deletionPending = deletion.catch(() => {});
          await deletion;
        } catch (error) {
          warn(ctx, error instanceof Error ? error.message : String(error));
          reply(res, 500, { status: 'failed' });
        }
      },
    }));
  };
}
