import { readFileSync } from 'node:fs';
import { rename, cp, rm, mkdir } from 'node:fs/promises';
import { dirname, basename, join, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

let z;
try { z = (await import('@deepseek-ai/schemastery')).default } catch { z = undefined }

/** Cordis host plugin name. */
export const name = 'rhine-splash';

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

/**
 * @typedef {object} SplashConfig
 * @property {boolean} enabled Whether to play on launch.
 * @property {boolean} uiTheme Whether to inject the Rhine interface theme.
 * @property {boolean} brand Whether to replace brand artwork.
 * @property {'plate' | 'cell'} logo Brand logo scheme.
 * @property {boolean} effortSlider Whether to show the reasoning effort slider in the composer.
 * @property {boolean} billing Whether to show the conversation cost and account balance in the sidebar.
 * @property {string} title Main heading.
 * @property {string} subtitle Secondary heading.
 * @property {string} code Corner HUD identifier.
 * @property {string} accentLight Accent color for light mode.
 * @property {string} accentDark Accent color for dark mode.
 * @property {'auto' | 'light' | 'dark'} theme Theme selection.
 * @property {'random' | 'doors' | 'decode' | 'glitch' | 'iris'} exit Exit animation.
 * @property {number} duration Minimum on-screen time in milliseconds.
 * @property {number} maxWait Maximum wait in milliseconds.
 * @property {boolean} skippable Whether clicking can skip the animation.
 * @property {boolean} replayOnReload Whether reloading replays the animation.
 */

/** @type {Readonly<SplashConfig>} Default configuration shared with the bundle patch. */
export const DEFAULTS = Object.freeze({
  enabled: true,
  uiTheme: true,
  brand: true,
  logo: 'plate',
  effortSlider: true,
  billing: true,
  title: 'DEEPSEEK HARNESS',
  subtitle: 'RHINE LAB STYLE · ARTIFICIAL INTELLIGENCE DIVISION',
  code: 'RL-DSH/0.2',
  accentLight: '#e46f24',
  accentDark: '#f0893e',
  theme: 'auto',
  exit: 'random',
  duration: 4500,
  maxWait: 8000,
  skippable: true,
  replayOnReload: false,
});

export const Config = z ? z.object({
  enabled: z.boolean().default(DEFAULTS.enabled).volatile().description('开屏动画开关'),
  exit: z.union(['random', 'doors', 'decode', 'glitch', 'iris']).default(DEFAULTS.exit).volatile().description('退场动画'),
  theme: z.union(['auto', 'light', 'dark']).default(DEFAULTS.theme).volatile().description('开屏主题'),
  duration: z.number().min(0).max(15000).step(100).default(DEFAULTS.duration).volatile().description('显示时长（毫秒）'),
  maxWait: z.number().min(0).max(20000).step(100).default(DEFAULTS.maxWait).volatile().description('最长等待（毫秒）'),
  title: z.string().default(DEFAULTS.title).volatile().description('主标题'),
  subtitle: z.string().default(DEFAULTS.subtitle).volatile().description('副标题'),
  code: z.string().default(DEFAULTS.code).volatile().description('角落编号'),
  accentLight: z.string().default(DEFAULTS.accentLight).volatile().description('浅色强调色'),
  accentDark: z.string().default(DEFAULTS.accentDark).volatile().description('深色强调色'),
  skippable: z.boolean().default(DEFAULTS.skippable).volatile().description('允许跳过'),
  replayOnReload: z.boolean().default(DEFAULTS.replayOnReload).volatile().description('刷新时重播'),
  uiTheme: z.boolean().default(DEFAULTS.uiTheme).volatile().description('莱茵界面主题'),
  brand: z.boolean().default(DEFAULTS.brand).volatile().description('品牌替换'),
  logo: z.union(['plate', 'cell']).default(DEFAULTS.logo).volatile().description('Logo 方案'),
  effortSlider: z.boolean().default(DEFAULTS.effortSlider).volatile().description('推理强度滑块'),
  billing: z.boolean().default(DEFAULTS.billing).volatile().description('计费与余额'),
}) : undefined;

/** Unwrap volatile settings at the point of use. */
export function readConfig(config) {
  const values = {};
  for (const key of Object.keys(DEFAULTS)) {
    const v = config?.[key];
    values[key] = v && typeof v.get === 'function' ? v.get() : v;
  }
  return resolveConfig(values);
}

/**
 * Normalize user configuration without retaining unknown keys or mutating input.
 * Invalid types and enum/color values use defaults; finite timings are clamped.
 *
 * @param {unknown} [input] User-supplied Cordis configuration.
 * @returns {SplashConfig} A fresh, plain configuration object.
 */
export function resolveConfig(input) {
  const source = input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {};
  const resolved = { ...DEFAULTS };

  if (typeof source.logo === 'string') {
    const logo = source.logo.trim();
    if (['plate', 'cell'].includes(logo)) resolved.logo = logo;
  }

  for (const key of ['title', 'subtitle', 'code']) {
    if (typeof source[key] === 'string') {
      resolved[key] = source[key].trim().slice(0, 80);
    }
  }

  for (const key of ['accentLight', 'accentDark']) {
    if (typeof source[key] === 'string') {
      const color = source[key].trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(color)) resolved[key] = color;
    }
  }

  if (typeof source.theme === 'string') {
    const theme = source.theme.trim();
    if (['auto', 'light', 'dark'].includes(theme)) resolved.theme = theme;
  }

  if (typeof source.exit === 'string') {
    const exit = source.exit.trim();
    if (['random', 'doors', 'decode', 'glitch', 'iris'].includes(exit)) resolved.exit = exit;
  }

  const duration = typeof source.duration === 'number' && Number.isFinite(source.duration)
    ? source.duration
    : DEFAULTS.duration;
  resolved.duration = Math.min(15000, Math.max(0, duration));

  const maxWait = typeof source.maxWait === 'number' && Number.isFinite(source.maxWait)
    ? source.maxWait
    : DEFAULTS.maxWait;
  resolved.maxWait = Math.min(20000, Math.max(resolved.duration, maxWait));

  for (const key of ['enabled', 'uiTheme', 'brand', 'effortSlider', 'billing', 'skippable', 'replayOnReload']) {
    if (typeof source[key] === 'boolean') resolved[key] = source[key];
  }

  return resolved;
}

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

/**
 * Encode available JPEGs as splash-scoped CSS custom properties.
 *
 * @param {{ barsLight?: Buffer, barsDark?: Buffer, specimen?: Buffer }} [images]
 * @returns {string} An optional asset style row, with stable property ordering.
 */
export function buildAssetStyle(images = {}) {
  const properties = [
    ['barsLight', '--rl-img-bars-light'],
    ['barsDark', '--rl-img-bars-dark'],
    ['specimen', '--rl-img-specimen'],
  ].filter(([key]) => images[key] !== undefined)
    .map(([key, property]) => `${property}:url("data:image/jpeg;base64,${images[key].toString('base64')}")`);
  return properties.length ? `#rhine-splash{${properties.join(';')}}` : '';
}

/**
 * Build host injection rows for both the web and desktop profiles.
 * Escape inline HTML terminators and JavaScript line separators in configuration.
 *
 * @param {SplashConfig} config Resolved configuration.
 * @param {{ css: string, js: string, images?: string, themeCss?: string, brand?: {mark: string, hero: string, name: string} }} assets Loaded sources.
 * @returns {Array<{kind: 'style', text: string} | {kind: 'script', placement: 'body', text: string}>}
 */
export function buildInjections(config, assets) {
  const safeJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const safeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

  return [
    ...(config.uiTheme && assets.themeCss ? [{ kind: 'style', text: safeStyle(assets.themeCss) }] : []),
    ...(assets.images ? [{ kind: 'style', text: safeStyle(assets.images) }] : []),
    { kind: 'style', text: safeStyle(assets.css) },
    {
      kind: 'script',
      placement: 'body',
      text: 'globalThis.__RHINE_BRAND__=' + safeJson(assets.brand || { mark: '', hero: '', name: '' })
        + ';globalThis.__RHINE_SPLASH__=' + safeJson(config) + ';\n' + assets.js,
    },
  ];
}

/**
 * Report unavailable assets while allowing hosts without a logger to start.
 * A failing optional logger also falls back to the console.
 *
 * @param {object} ctx Cordis context.
 * @param {unknown} error Asset read error.
 * @returns {void}
 */
function warnUnavailableAssets(ctx, error) {
  const detail = error instanceof Error ? error.message : String(error);
  const message = `Unable to load Rhine splash assets; injection disabled. ${detail}`;
  warn(ctx, message);
}

/** Report a single warning through the optional host logger. */
function warn(ctx, message) {
  try {
    const logger = ctx.logger?.('rhine-splash');
    if (typeof logger?.warn === 'function') {
      logger.warn(message);
      return;
    }
  } catch {
    // Logging support is optional and must not prevent host startup.
  }
  console.warn(message);
}

/**
 * Register the host half of the splash plugin. Assets are read once at apply time
 * and reused on every index injection; live config is read on each emission.
 *
 * @param {object} ctx Cordis context providing on() and an optional logger().
 * @param {unknown} [config] User-supplied configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
  if (typeof ctx.inject === 'function') ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
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
  let deletionPending = Promise.resolve();
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (child) => {
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
  });
  let assets;
  try {
    assets = {
      css: readFileSync(new URL('./splash.css', import.meta.url), 'utf8'),
      js: readFileSync(new URL('./splash.js', import.meta.url), 'utf8'),
    };
  } catch (error) {
    warnUnavailableAssets(ctx, error);
    return;
  }

  const images = {};
  const missingImages = [];
  for (const [key, filename] of [
    ['barsLight', 'bars-light.jpg'],
    ['barsDark', 'bars-dark.jpg'],
    ['specimen', 'specimen.jpg'],
  ]) {
    try {
      images[key] = readFileSync(new URL(`../assets/${filename}`, import.meta.url));
    } catch {
      missingImages.push(filename);
    }
  }
  assets.images = buildAssetStyle(images);
  if (missingImages.length) {
    warn(ctx, `Unable to load optional Rhine splash images: ${missingImages.join(', ')}. Splash injection remains enabled.`);
  }

  const missingExtras = [];
  const optionalText = (filename, { quiet = false } = {}) => {
    try { return readFileSync(new URL(filename, import.meta.url), 'utf8'); }
    catch { if (!quiet) missingExtras.push(filename); return ''; }
  };
  assets.themeCss = optionalText('./theme.css');
  const marks = {
    plate: optionalText('./brand/mark-plate.svg'),
    cell: optionalText('./brand/mark-cell.svg'),
  };
  const heroes = {
    // Hero artwork is optional per scheme (the mark is reused), so its
    // absence is not worth a startup warning.
    plate: optionalText('./brand/hero-plate.svg', { quiet: true }),
    cell: optionalText('./brand/hero-cell.svg', { quiet: true }),
  };
  const name = optionalText('./brand/name.html');
  if (missingExtras.length) warn(ctx, `Unable to load optional Rhine UI assets: ${missingExtras.join(', ')}.`);
  // Append after theme bootstrap rows: do not pass Cordis's prepend option.
  ctx.on('webserver/index-inject', (table) => {
    const resolved = readConfig(config);
    const { logo } = resolved;
    const brand = { mark: marks[logo], hero: heroes[logo] || marks[logo], name };
    table.push(...buildInjections(resolved, { ...assets, brand }));
  });
}
