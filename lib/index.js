import { readFileSync } from 'node:fs';

/** Cordis host plugin name. */
export const name = 'rhine-splash';

/**
 * @typedef {object} SplashConfig
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

  for (const key of ['skippable', 'replayOnReload']) {
    if (typeof source[key] === 'boolean') resolved[key] = source[key];
  }

  return resolved;
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
 * @param {{ css: string, js: string, images?: string }} assets Loaded animation sources.
 * @returns {Array<{kind: 'style', text: string} | {kind: 'script', placement: 'body', text: string}>}
 */
export function buildInjections(config, assets) {
  const safeJson = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const css = assets.css.replace(/<\/style/gi, '<\\/style');

  return [
    ...(assets.images ? [{ kind: 'style', text: assets.images }] : []),
    { kind: 'style', text: css },
    {
      kind: 'script',
      placement: 'body',
      text: 'globalThis.__RHINE_SPLASH__=' + safeJson + ';\n' + assets.js,
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
 * and reused on every index injection. No services or frontend entry are needed.
 *
 * @param {object} ctx Cordis context providing on() and an optional logger().
 * @param {unknown} [config] User-supplied configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
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

  const resolved = resolveConfig(config);
  // Append after theme bootstrap rows: do not pass Cordis's prepend option.
  ctx.on('webserver/index-inject', (table) => {
    table.push(...buildInjections(resolved, assets));
  });
}
