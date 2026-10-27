import { refuseRequest } from './http.js';

/** Accept only stable three-component package versions. */
export function parseLatest(json) {
  return typeof json?.version === 'string' && /^\d+\.\d+\.\d+$/.test(json.version) ? json.version : null;
}

export function isNewer(latest, current) {
  if (!parseLatest({ version: latest }) || !parseLatest({ version: current })) return false;
  const a = latest.split('.').map(Number), b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** Cache registry checks and share a single request across windows. */
export function registerUpdate(ctx, { version }) {
  let cached, at = 0, pending;
  const load = async () => {
    if (cached && Date.now() - at < (cached.status === 'ready' ? 21600000 : 600000)) return cached;
    if (pending) return pending;
    pending = (async () => {
      let result = { status: 'failed', current: version };
      for (const registry of ['registry.npmjs.org', 'registry.npmmirror.com']) {
        try {
          const response = await fetch(`https://${registry}/dsh-rhine-splash/latest`, {
            method: 'GET', headers: { accept: 'application/json' },
            redirect: 'error', signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error('Update unavailable');
          const latest = parseLatest(await response.json());
          if (!latest) throw new Error('Invalid version');
          result = { status: 'ready', current: version, latest, newer: isNewer(latest, version) };
          break;
        } catch {}
      }
      cached = result;
      at = Date.now();
      return result;
    })();
    try { return await pending; }
    finally { pending = undefined; }
  };
  return (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/update',
      handler: async (req, res) => {
        if (refuseRequest(ctx, req, res, 'GET')) return;
        res.statusCode = 200;
        res.end(JSON.stringify(await load()));
      },
    }));
  };
}
