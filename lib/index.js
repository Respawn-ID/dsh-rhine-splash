import { readFileSync } from 'node:fs';
import { registerArchives } from './host/archives.js';
import { registerBilling } from './host/billing.js';
import { registerNotify } from './host/notify.js';
import { registerUpdate } from './host/update.js';

export { staleArchivedIds, isSessionDirInside, forgetSession, deletionQueue, drainDeletions } from './host/archives.js';
export { parseLatest, isNewer } from './host/update.js';
export { parseBalance } from './host/billing.js';
export { DESKTOP_APP_ID, toastPayload } from './host/notify.js';

let z;
try { z = (await import('@deepseek-ai/schemastery')).default } catch { z = undefined }

/** Cordis host plugin name. */
export const name = 'rhine-splash';

/**
 * @typedef {object} SplashConfig
 * @property {'launch' | 'daily' | 'update'} splashWhen 播放开屏
 * @property {number} notifyMinRun 运行少于几秒不提醒（秒）
 * @property {boolean} quietHours 免打扰时段
 * @property {number} quietFrom 免打扰开始（时）
 * @property {number} quietTo 免打扰结束（时）
 * @property {number} balanceAlert 余额提醒线
 * @property {boolean} updateCheck 检查新版本
 * @property {boolean} enabled Whether to play on launch.
 * @property {boolean} uiTheme Whether to inject the Rhine interface theme.
 * @property {boolean} brand Whether to replace brand artwork.
 * @property {'plate' | 'cell'} logo Brand logo scheme.
 * @property {'rhine' | 'life' | 'ocean' | 'crimson' | 'custom'} accent 强调色
 * @property {string} accentColor 自定义强调色
 * @property {'warm' | 'neutral' | 'official'} base 底色
 * @property {boolean} effortSlider Whether to show the reasoning effort slider in the composer.
 * @property {boolean} billing Whether to show the conversation cost and account balance in the sidebar.
 * @property {'page' | 'popup'} costOpen What clicking the billing card opens: the cost page, or a small panel whose chart opens it.
 * @property {boolean} weeklyReport Show the weekly report on the first launch of a new week.
 * @property {boolean} todoCenter Whether to show the to-do center in the sidebar footer.
 * @property {boolean} rowStatus Whether to show conversation row status times.
 * @property {number} budgetDaily 每日预算
 * @property {number} budgetSession 单个对话预算
 * @property {'random' | 'grid' | 'bars' | 'full' | 'off'} heroBackground Blank conversation page background.
 * @property {'random' | 'scan' | 'iris' | 'glitch' | 'off'} resumeEffect Effect played when the window comes back from the background.
 * @property {'hidden' | 'away' | 'always'} resumeTrigger When a return from the background plays the effect.
 * @property {boolean} notifyCurrent 当前对话提醒
 * @property {boolean} notifyOthers 其他对话提醒
 * @property {boolean} notifyAway 失焦或后台提醒
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
  splashWhen: 'launch',
  notifyMinRun: 10,
  quietHours: false,
  quietFrom: 22,
  quietTo: 8,
  balanceAlert: 0,
  updateCheck: true,
  enabled: true,
  uiTheme: true,
  brand: true,
  logo: 'plate',
  accent: 'rhine',
  accentColor: '#e46f24',
  base: 'warm',
  effortSlider: true,
  billing: true,
  costOpen: 'popup',
  weeklyReport: true,
  todoCenter: true,
  rowStatus: true,
  budgetDaily: 0,
  budgetSession: 0,
  heroBackground: 'random',
  resumeEffect: 'random',
  resumeTrigger: 'hidden',
  notifyCurrent: true,
  notifyOthers: true,
  notifyAway: true,
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

export const ACCENTS = Object.freeze({
  rhine: ['#e46f24', '#f0893e'],
  life: ['#5f9420', '#7fb23a'],
  ocean: ['#2f6bd8', '#5a8ef0'],
  crimson: ['#d63a4f', '#e8606f'],
});

export const Config = z ? z.object({
  splashWhen: z.union(['launch', 'daily', 'update']).default(DEFAULTS.splashWhen).volatile().description('播放开屏'),
  notifyMinRun: z.number().min(0).max(600).step(1).default(DEFAULTS.notifyMinRun).volatile().description('运行少于几秒不提醒（秒）'),
  quietHours: z.boolean().default(DEFAULTS.quietHours).volatile().description('免打扰时段'),
  quietFrom: z.number().min(0).max(23).step(1).default(DEFAULTS.quietFrom).volatile().description('免打扰开始（时）'),
  quietTo: z.number().min(0).max(23).step(1).default(DEFAULTS.quietTo).volatile().description('免打扰结束（时）'),
  balanceAlert: z.number().min(0).max(100000).step(0.01).default(DEFAULTS.balanceAlert).volatile().description('余额提醒线'),
  updateCheck: z.boolean().default(DEFAULTS.updateCheck).volatile().description('检查新版本'),
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
  accent: z.union(['rhine', 'life', 'ocean', 'crimson', 'custom']).default(DEFAULTS.accent).volatile().description('强调色'),
  accentColor: z.string().default(DEFAULTS.accentColor).volatile().description('自定义强调色'),
  base: z.union(['warm', 'neutral', 'official']).default(DEFAULTS.base).volatile().description('底色'),
  effortSlider: z.boolean().default(DEFAULTS.effortSlider).volatile().description('推理强度滑块'),
  billing: z.boolean().default(DEFAULTS.billing).volatile().description('计费与余额'),
  costOpen: z.union(['page', 'popup']).default(DEFAULTS.costOpen).volatile().description('点击计费卡片'),
  weeklyReport: z.boolean().default(DEFAULTS.weeklyReport).volatile().description('每周弹出实验周报'),
  todoCenter: z.boolean().default(DEFAULTS.todoCenter).volatile().description('待办中心'),
  rowStatus: z.boolean().default(DEFAULTS.rowStatus).volatile().description('对话行状态'),
  budgetDaily: z.number().default(DEFAULTS.budgetDaily).volatile().description('每日预算'),
  budgetSession: z.number().default(DEFAULTS.budgetSession).volatile().description('单个对话预算'),
  heroBackground: z.union(['random', 'grid', 'bars', 'full', 'off']).default(DEFAULTS.heroBackground).volatile().description('空白页背景'),
  resumeEffect: z.union(['random', 'scan', 'iris', 'glitch', 'off']).default(DEFAULTS.resumeEffect).volatile().description('切回动效'),
  resumeTrigger: z.union(['hidden', 'away', 'always']).default(DEFAULTS.resumeTrigger).volatile().description('切回触发'),
  notifyCurrent: z.boolean().default(DEFAULTS.notifyCurrent).volatile().description('当前对话提醒'),
  notifyOthers: z.boolean().default(DEFAULTS.notifyOthers).volatile().description('其他对话提醒'),
  notifyAway: z.boolean().default(DEFAULTS.notifyAway).volatile().description('失焦或后台提醒'),
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

  for (const [key, choices] of [['splashWhen', ['launch', 'daily', 'update']], ['accent', [...Object.keys(ACCENTS), 'custom']], ['base', ['warm', 'neutral', 'official']]]) {
    if (typeof source[key] === 'string' && choices.includes(source[key].trim())) resolved[key] = source[key].trim();
  }
  const validColor = (value) => typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  if (validColor(source.accentColor)) resolved.accentColor = source.accentColor;

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

  if (typeof source.costOpen === 'string') {
    const costOpen = source.costOpen.trim();
    if (['page', 'popup'].includes(costOpen)) resolved.costOpen = costOpen;
  }

  if (typeof source.resumeTrigger === 'string') {
    const resumeTrigger = source.resumeTrigger.trim();
    if (['hidden', 'away', 'always'].includes(resumeTrigger)) resolved.resumeTrigger = resumeTrigger;
  }

  for (const key of ['budgetDaily', 'budgetSession', 'balanceAlert']) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000) resolved[key] = Math.round(value * 100) / 100;
  }

  for (const [key, max] of [['notifyMinRun', 600], ['quietFrom', 23], ['quietTo', 23]]) {
    if (Number.isInteger(source[key]) && source[key] >= 0 && source[key] <= max) resolved[key] = source[key];
  }

  const duration = typeof source.duration === 'number' && Number.isFinite(source.duration)
    ? source.duration
    : DEFAULTS.duration;
  resolved.duration = Math.min(15000, Math.max(0, duration));

  const maxWait = typeof source.maxWait === 'number' && Number.isFinite(source.maxWait)
    ? source.maxWait
    : DEFAULTS.maxWait;
  resolved.maxWait = Math.min(20000, Math.max(resolved.duration, maxWait));

  for (const key of ['quietHours', 'updateCheck', 'enabled', 'uiTheme', 'brand', 'effortSlider', 'billing', 'weeklyReport', 'todoCenter', 'rowStatus', 'notifyCurrent', 'notifyOthers', 'notifyAway', 'notifySystem', 'notifyToast', 'notifySound', 'skippable', 'replayOnReload']) {
    if (typeof source[key] === 'boolean') resolved[key] = source[key];
  }

  if (resolved.accent === 'rhine' && validColor(resolved.accentLight) && resolved.accentLight !== DEFAULTS.accentLight) {
    resolved.accent = 'custom';
    resolved.accentColor = resolved.accentLight;
  }
  if (resolved.accent === 'custom') {
    const expand = (color) => color.length === 4 ? '#' + [...color.slice(1)].map((c) => c + c).join('') : color;
    resolved.accentLight = expand(resolved.accentColor).toLowerCase();
    resolved.accentDark = resolved.accentDark !== DEFAULTS.accentDark ? resolved.accentDark
      : '#' + resolved.accentLight.slice(1).match(/../g).map((channel) => Math.round(parseInt(channel, 16) * 0.8 + 255 * 0.2).toString(16).padStart(2, '0')).join('');
  } else {
    [resolved.accentLight, resolved.accentDark] = ACCENTS[resolved.accent];
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
 * @param {{ css: string, js: string, version?: string, images?: string, themeCss?: string, brand?: {mark: string, hero: string, name: string, marks?: object, heroes?: object} }} assets Loaded sources.
 * @returns {Array<{kind: 'style', text: string} | {kind: 'script', placement: 'body', text: string}>}
 */
export function buildInjections(config, assets) {
  const safeJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const safeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

  return [
    ...(assets.themeCss ? [{ kind: 'style', text: safeStyle(assets.themeCss) }] : []),
    ...(assets.images ? [{ kind: 'style', text: safeStyle(assets.images) }] : []),
    { kind: 'style', text: safeStyle(assets.css) },
    {
      kind: 'script',
      placement: 'body',
      text: 'globalThis.__RHINE_BRAND__=' + safeJson(assets.brand || { mark: '', hero: '', name: '', marks: { plate: '', cell: '' }, heroes: { plate: '', cell: '' } })
        + ';globalThis.__RHINE_SPLASH__=' + safeJson({ ...config, version: assets.version || "" }) + ';\n'
        + '(function(c){const root=document.documentElement;root.toggleAttribute("data-rl-ui",c.uiTheme!==false);if(c.uiTheme!==false&&c.rowStatus!==false)root.setAttribute("data-rl-rows","on");else root.removeAttribute("data-rl-rows");root.dataset.rlAccent=c.accent;root.dataset.rlBase=c.base;if(c.accent==="custom")root.style.setProperty("--rl-accent-custom",c.accentColor);else root.style.removeProperty("--rl-accent-custom");})(globalThis.__RHINE_SPLASH__);\n' + assets.js,
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
  let version = '';
  try {
    const value = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
    if (typeof value === 'string') version = value;
  } catch {}
  if (typeof ctx.inject === 'function') ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
  const registerArchiveRoutes = registerArchives(ctx, { warn });
  const registerBillingRoutes = registerBilling(ctx);
  const registerNotifyRoutes = registerNotify(ctx);
  const registerUpdateRoutes = registerUpdate(ctx, { version });
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (child) => {
    registerBillingRoutes(child);
    registerArchiveRoutes(child);
    registerNotifyRoutes(child);
    registerUpdateRoutes(child);
  });
  let assets;
  try {
    assets = {
      version,
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
    const brand = { mark: marks[logo], hero: heroes[logo] || marks[logo], name, marks,
      heroes: { plate: heroes.plate || marks.plate, cell: heroes.cell || marks.cell } };
    table.push(...buildInjections(resolved, { ...assets, brand }));
  });
}
