import { lstat, realpath, rm } from 'node:fs/promises';
import { dirname, basename, relative, isAbsolute } from 'node:path';

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

/** Add archive cleanup and return its route registrar for the shared webServer inject. */
export function registerArchives(ctx, { warn }) {
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
  let deletionPending = Promise.resolve();
  return (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/sessions/delete',
      handler: async (req, res) => {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        const connection = ctx.get('connection');
        const rejection = connection?.requestRejection(req);
        if (rejection !== undefined) { res.statusCode = rejection; res.end(); return; }
        if (connection === undefined && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) {
          res.statusCode = 403; res.end(); return;
        }
        if (req.headers['x-rhine-splash'] !== '1') {
          res.statusCode = 403; res.end(); return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405; res.setHeader('allow', 'POST'); res.end(); return;
        }
        const reply = (code, value) => {
          res.statusCode = code;
          res.end(JSON.stringify(value));
        };
        try {
          const raw = await new Promise((resolve, reject) => {
            const chunks = [];
            let size = 0;
            const cleanup = () => {
              req.off('data', onData);
              req.off('end', onEnd);
              req.off('error', onError);
            };
            const onData = (chunk) => {
              size += Buffer.byteLength(chunk);
              if (size > 4096) {
                cleanup();
                req.resume();
                resolve(null);
                return;
              }
              chunks.push(Buffer.from(chunk));
            };
            const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
            const onError = (error) => { cleanup(); reject(error); };
            req.on('data', onData);
            req.once('end', onEnd);
            req.once('error', onError);
          });
          if (raw === null) { reply(413, { status: 'invalid' }); return; }
          let body;
          try { body = JSON.parse(raw); }
          catch { reply(400, { status: 'invalid' }); return; }
          const id = body?.sessionId;
          if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
            reply(400, { status: 'invalid' }); return;
          }
          const deletion = deletionPending.then(async () => {
            if (!ctx.get('workspaceRegistry')?.archivedSessionIds?.includes(id)) {
              reply(409, { status: 'not-archived' }); return;
            }
            if (ctx.get('sessions')?.get(id) !== undefined) {
              reply(409, { status: 'loaded' }); return;
            }
            const persistence = ctx.get('sessionPersistence');
            const snapshot = persistence && (await persistence.list()).find((entry) => entry.header.id === id);
            if (!snapshot) { reply(404, { status: 'missing' }); return; }
            const dir = dirname(persistence.locate({ id, cwd: snapshot.header.cwd }).path);
            if (!isSessionDirInside(persistence.root, dir, id)) {
              reply(400, { status: 'invalid' }); return;
            }
            // Resolve links before a recursive delete: the real folder must still sit inside the real root.
            const info = await lstat(dir);
            if (!info.isDirectory() || !isSessionDirInside(await realpath(persistence.root), await realpath(dir), id)) {
              reply(400, { status: 'invalid' }); return;
            }
            await rm(dir, { recursive: true, force: true });
            const failed = await forgetSession(ctx, id);
            ctx.logger?.info?.(`rhine-splash: permanently deleted archived session ${id}`);
            reply(200, failed.length ? { status: 'deleted', cleanup: failed } : { status: 'deleted' });
            reconcileSearch(ctx).catch(() => {});
          });
          deletionPending = deletion.catch(() => {});
          await deletion;
        } catch (error) {
          warn(ctx, error instanceof Error ? error.message : String(error));
          reply(500, { status: 'failed' });
        }
      },
    }));
  };
}
