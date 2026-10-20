import { readFileSync } from 'node:fs';
import { registerArchives } from './host/archives.js';
import { registerBilling } from './host/billing.js';

export { staleArchivedIds, trashTarget, isSessionDirInside } from './host/archives.js';
export { parseBalance } from './host/billing.js';

let z;
try { z = (await import('@deepseek-ai/schemastery')).default } catch { z = undefined }

/** Cordis host plugin name. */
export const name = 'rhine-splash';

/**
 * @typedef {object} SplashConfig
 * @property {boolean} enabled Whether to play on launch.
 * @property {boolean} uiTheme Whether to inject the Rhine interface theme.
 * @property {boolean} brand Whether to replace brand artwork.
 * @property {'plate' | 'cell'} logo Brand logo scheme.
 * @property {boolean} effortSlider Whether to show the reasoning effort slider in the composer.
 * @property {boolean} billing Whether to show the conversation cost and account balance in the sidebar.
 * @property {'random' | 'grid' | 'bars' | 'full' | 'off'} heroBackground Blank conversation page background.
 * @property {'random' | 'scan' | 'iris' | 'glitch' | 'off'} resumeEffect Effect played when the window comes back from the background.
 * @property {'away' | 'always' | 'hidden'} resumeTrigger When a return from the background plays the effect.
 * @property {boolean} notifySystem Whether to show system notifications.
 * @property {boolean} notifyToast Whether to show in-app notices.
 * @property {boolean} notifySound Whether to play notification sounds.
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
  heroBackground: 'random',
  resumeEffect: 'random',
  resumeTrigger: 'away',
  notifySystem: true,
  notifyToast: true,
  notifySound: true,
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
  heroBackground: z.union(['random', 'grid', 'bars', 'full', 'off']).default(DEFAULTS.heroBackground).volatile().description('空白页背景'),
  resumeEffect: z.union(['random', 'scan', 'iris', 'glitch', 'off']).default(DEFAULTS.resumeEffect).volatile().description('切回动效'),
  resumeTrigger: z.union(['away', 'always', 'hidden']).default(DEFAULTS.resumeTrigger).volatile().description('切回触发'),
  notifySystem: z.boolean().default(DEFAULTS.notifySystem).volatile().description('系统通知'),
  notifyToast: z.boolean().default(DEFAULTS.notifyToast).volatile().description('界面内提示'),
  notifySound: z.boolean().default(DEFAULTS.notifySound).volatile().description('提示音'),
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

  if (typeof source.heroBackground === 'string') {
    const heroBackground = source.heroBackground.trim();
    if (['random', 'grid', 'bars', 'full', 'off'].includes(heroBackground)) resolved.heroBackground = heroBackground;
  }

  if (typeof source.resumeEffect === 'string') {
    const resumeEffect = source.resumeEffect.trim();
    if (['random', 'scan', 'iris', 'glitch', 'off'].includes(resumeEffect)) resolved.resumeEffect = resumeEffect;
  }

  if (typeof source.resumeTrigger === 'string') {
    const resumeTrigger = source.resumeTrigger.trim();
    if (['away', 'always', 'hidden'].includes(resumeTrigger)) resolved.resumeTrigger = resumeTrigger;
  }

  const duration = typeof source.duration === 'number' && Number.isFinite(source.duration)
    ? source.duration
    : DEFAULTS.duration;
  resolved.duration = Math.min(15000, Math.max(0, duration));

  const maxWait = typeof source.maxWait === 'number' && Number.isFinite(source.maxWait)
    ? source.maxWait
    : DEFAULTS.maxWait;
  resolved.maxWait = Math.min(20000, Math.max(resolved.duration, maxWait));

  for (const key of ['enabled', 'uiTheme', 'brand', 'effortSlider', 'billing', 'notifySystem', 'notifyToast', 'notifySound', 'skippable', 'replayOnReload']) {
    if (typeof source[key] === 'boolean') resolved[key] = source[key];
  }

  return resolved;
}

/**
 * Encode available JPEGs as CSS custom properties scoped to the splash and blank conversation page.
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
  return properties.length ? `#rhine-splash,[data-phase=hero]{${properties.join(';')}}` : '';
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
  const registerArchiveRoutes = registerArchives(ctx, { warn });
  const registerBillingRoutes = registerBilling(ctx);
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (child) => {
    registerBillingRoutes(child);
    registerArchiveRoutes(child);
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
