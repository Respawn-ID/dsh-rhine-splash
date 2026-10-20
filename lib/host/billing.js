/** Validate balance data without exposing any upstream fields beyond amounts. */
export function parseBalance(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)
    || typeof json.is_available !== 'boolean' || !Array.isArray(json.balance_infos)) return null;
  const amount = (value) => typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value);
  const balances = json.balance_infos.filter((entry) => entry && ['CNY', 'USD'].includes(entry.currency)
    && [entry.total_balance, entry.granted_balance, entry.topped_up_balance].every(amount))
    .map((entry) => ({ currency: entry.currency, total: entry.total_balance,
      granted: entry.granted_balance, toppedUp: entry.topped_up_balance }));
  return balances.length ? { status: 'ready', available: json.is_available, balances } : null;
}

/** Add balance caching and return its route registrar for the shared webServer inject. */
export function registerBilling(ctx) {
  let balanceCache, balanceCachedAt = 0, balancePending;
  const loadBalance = async () => {
    if (balanceCache && Date.now() - balanceCachedAt < 60000) return balanceCache;
    if (balancePending) return balancePending;
    balancePending = (async () => {
      let result;
      try {
        const credentials = ctx.get('credentials');
        const key = credentials === undefined ? process.env.DEEPSEEK_API_KEY
          : (await credentials.resolve('DEEPSEEK_API_KEY'))?.value;
        if (typeof key !== 'string' || !key) return { status: 'no-key' };
        const response = await fetch('https://api.deepseek.com/user/balance', {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
          redirect: 'error', signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Balance unavailable');
        result = parseBalance(await response.json()) || { status: 'failed' };
      } catch {
        result = { status: 'failed' };
      }
      balanceCache = result;
      balanceCachedAt = Date.now();
      return result;
    })();
    try { return await balancePending; }
    finally { balancePending = undefined; }
  };
  return (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/balance',
      handler: async (req, res) => {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        const connection = ctx.get('connection');
        const rejection = connection?.requestRejection(req);
        if (rejection !== undefined) { res.statusCode = rejection; res.end(); return; }
        if (connection === undefined && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) {
          res.statusCode = 403; res.end(); return;
        }
        if (req.method !== 'GET') {
          res.statusCode = 405; res.setHeader('allow', 'GET'); res.end(); return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(await loadBalance()));
      },
    }));
  };
}
