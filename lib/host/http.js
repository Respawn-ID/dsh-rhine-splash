const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

/**
 * Refuse a request that is not an authenticated `method` call from this plugin's client.
 * Sets the JSON response headers either way; returns true when the request was answered.
 */
export function refuseRequest(ctx, req, res, method) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  const connection = ctx.get('connection');
  const rejection = connection?.requestRejection(req);
  if (rejection !== undefined) { res.statusCode = rejection; res.end(); return true; }
  if (connection === undefined && !LOOPBACK.includes(req.socket?.remoteAddress)) {
    res.statusCode = 403; res.end(); return true;
  }
  if (req.headers['x-rhine-splash'] !== '1') {
    res.statusCode = 403; res.end(); return true;
  }
  if (req.method !== method) {
    res.statusCode = 405; res.setHeader('allow', method); res.end(); return true;
  }
  return false;
}

/** Read a small JSON body: undefined when it is larger than `limit` bytes, null when it is not JSON. */
export async function readJson(req, limit = 4096) {
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
      if (size > limit) {
        cleanup();
        req.resume();
        resolve(undefined);
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
  if (raw === undefined) return undefined;
  try { return JSON.parse(raw); }
  catch { return null; }
}

/** Answer with a JSON value. */
export function reply(res, code, value) {
  res.statusCode = code;
  res.end(JSON.stringify(value));
}
