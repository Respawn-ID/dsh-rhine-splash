import { rename, cp, rm, mkdir } from 'node:fs/promises';
import { dirname, basename, join, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

/** Find archived entries with neither a stored nor a live conversation. */
export function staleArchivedIds(archivedIds, storedIds, isLive) {
  const stored = storedIds instanceof Set ? storedIds : new Set(storedIds);
  return archivedIds.filter((id) => !stored.has(id) && !isLive(id));
}

/** Choose a recoverable trash destination without touching the filesystem. */
export function trashTarget({ dir, root, platform, home, now }) {
  return platform === 'darwin'
    ? join(home, '.Trash', `dsh-${basename(dir)}-${now}`)
    : join(dirname(root), 'trash', `${basename(dir)}-${now}`);
}

/** Accept only a session folder strictly beneath the persistence root. */
export function isSessionDirInside(root, dir) {
  const path = relative(root, dir);
  return path !== '' && !isAbsolute(path) && !path.startsWith('..')
    && basename(dir).startsWith('session-');
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
            if (!isSessionDirInside(persistence.root, dir)) {
              reply(400, { status: 'invalid' }); return;
            }
            const move = async (target) => {
              await mkdir(dirname(target), { recursive: true });
              try { await rename(dir, target); }
              catch (error) {
                if (error.code !== 'EXDEV') throw error;
                await cp(dir, target, { recursive: true });
                await rm(dir, { recursive: true, force: true });
              }
            };
            const now = Date.now();
            let trash = process.platform === 'darwin' ? 'system' : 'dsh';
            try {
              await move(trashTarget({ dir, root: persistence.root, platform: process.platform, home: homedir(), now }));
            } catch (error) {
              // macOS may refuse an app write into ~/.Trash (privacy); fall back to dsh's own trash.
              if (trash !== 'system' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
              trash = 'dsh';
              await move(trashTarget({ dir, root: persistence.root, platform: 'other', home: homedir(), now }));
            }
            ctx.logger?.info?.(`rhine-splash: moved archived session ${id} to the trash`);
            reply(200, { status: 'deleted', trash });
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
