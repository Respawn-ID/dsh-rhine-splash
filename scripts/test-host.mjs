import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { apply, buildAssetStyle, buildInjections, DEFAULTS, isSessionDirInside, name, parseBalance, readConfig, resolveConfig, staleArchivedIds, trashTarget } from '../lib/index.js';

assert.deepEqual(staleArchivedIds(['session-b', 'session-a'], new Set(), () => false),
  ['session-b', 'session-a']);
for (const stored of [new Set(['session-stored']), ['session-stored']]) {
  assert.deepEqual(staleArchivedIds(['session-stored', 'session-missing'], stored, () => false),
    ['session-missing']);
}
assert.deepEqual(staleArchivedIds(['session-live', 'session-missing'], [], (id) => id === 'session-live'),
  ['session-missing']);
assert.deepEqual(staleArchivedIds([], [], () => false), []);

// Trash path validation is pure: no filesystem or network operations.
const sessionRoot = '/home/test/.dsh/sessions';
const sessionDir = join(sessionRoot, 'workspace', 'session-abc');
assert.equal(trashTarget({ dir: sessionDir, root: sessionRoot, platform: 'darwin', home: '/Users/test', now: 123 }),
  '/Users/test/.Trash/dsh-session-abc-123');
assert.equal(trashTarget({ dir: sessionDir, root: sessionRoot, platform: 'linux', home: '/home/test', now: 123 }),
  '/home/test/.dsh/trash/session-abc-123');
assert.equal(isSessionDirInside(sessionRoot, sessionDir), true);
assert.equal(isSessionDirInside(sessionRoot, join(sessionRoot, '..', 'session-abc')), false);
assert.equal(isSessionDirInside(sessionRoot, sessionRoot), false);
assert.equal(isSessionDirInside(sessionRoot, join(sessionRoot, 'other-folder')), false);
assert.equal(isSessionDirInside(sessionRoot, '/unrelated/session-abc'), false);

// Configuration and injection tests use fake assets so concurrent asset authoring
// does not prevent validation of the host plugin.
assert.equal(name, 'rhine-splash');
assert.ok(Object.isFrozen(DEFAULTS));
assert.equal(DEFAULTS.duration, 4500);
assert.equal(DEFAULTS.accentLight, '#e46f24');
assert.equal(DEFAULTS.accentDark, '#f0893e');
assert.equal(DEFAULTS.maxWait, 8000);
assert.equal(DEFAULTS.exit, 'random');
assert.equal(DEFAULTS.logo, 'plate');
for (const logo of ['plate', 'cell']) {
  assert.equal(resolveConfig({ logo }).logo, logo);
}
assert.equal(resolveConfig({ logo: ' cell ' }).logo, 'cell');
for (const logo of ['invalid', '', 'CELL', 42, null]) {
  assert.equal(resolveConfig({ logo }).logo, 'plate');
}
for (const exit of ['random', 'doors', 'decode', 'glitch', 'iris']) {
  assert.equal(resolveConfig({ exit }).exit, exit);
}
assert.equal(resolveConfig({ exit: ' iris ' }).exit, 'iris');
for (const exit of ['invalid', '', 'fade', 'IRIS', 42, null]) {
  assert.equal(resolveConfig({ exit }).exit, 'random');
}
assert.equal(DEFAULTS.heroBackground, 'random');
assert.equal(DEFAULTS.resumeEffect, 'random');
assert.equal(DEFAULTS.resumeTrigger, 'away');
for (const key of ['notifyCurrent', 'notifyOthers', 'notifyAway', 'notifySystem', 'notifyToast', 'notifySound']) {
  assert.equal(DEFAULTS[key], true);
  assert.equal(resolveConfig({ [key]: false })[key], false);
  assert.equal(resolveConfig({ [key]: true })[key], true);
  for (const value of ['false', 0, null, {}]) assert.equal(resolveConfig({ [key]: value })[key], true);
}
for (const [key, choices] of [
  ['heroBackground', ['random', 'grid', 'bars', 'full', 'off']],
  ['resumeEffect', ['random', 'scan', 'iris', 'glitch', 'off']],
  ['resumeTrigger', ['away', 'always', 'hidden']],
]) {
  for (const value of choices) {
    assert.equal(resolveConfig({ [key]: value })[key], value);
  }
  assert.equal(resolveConfig({ [key]: ' ' + choices[1] + ' ' })[key], choices[1]);
  for (const value of ['sparkle', '', 'RANDOM', 1, null]) {
    assert.equal(resolveConfig({ [key]: value })[key], DEFAULTS[key]);
  }
}
const defaults = resolveConfig();
assert.deepEqual(defaults, DEFAULTS);
assert.notEqual(defaults, DEFAULTS);
assert.equal(Object.getPrototypeOf(defaults), Object.prototype);
for (const input of [null, undefined, [], 'invalid', 42]) {
  assert.deepEqual(resolveConfig(input), DEFAULTS);
}

const overrides = Object.freeze({
  title: '  CUSTOM HARNESS  ',
  subtitle: '  Research division  ',
  code: '  RL-TEST  ',
  accentLight: '#ABC',
  accentDark: '#12345678',
  theme: 'dark',
  skippable: false,
  replayOnReload: true,
  unknownKey: 'discard me',
});
const resolved = resolveConfig(overrides);
assert.deepEqual(resolved, {
  ...DEFAULTS,
  title: 'CUSTOM HARNESS',
  subtitle: 'Research division',
  code: 'RL-TEST',
  accentLight: '#ABC',
  accentDark: '#12345678',
  theme: 'dark',
  skippable: false,
  replayOnReload: true,
});
assert.ok(!Object.hasOwn(resolved, 'unknownKey'));
for (const theme of ['auto', 'light', 'dark']) {
  assert.equal(resolveConfig({ theme }).theme, theme);
}
for (const key of ['title', 'subtitle', 'code']) {
  assert.equal(resolveConfig({ [key]: '  ' + 'x'.repeat(100) + '  ' })[key], 'x'.repeat(80));
  assert.equal(resolveConfig({ [key]: 123 })[key], DEFAULTS[key]);
}
assert.deepEqual(resolveConfig({
  theme: 'invalid',
  duration: NaN,
  maxWait: Infinity,
  accentLight: '#gggggg',
  accentDark: '#12',
  title: false,
  subtitle: null,
  code: {},
  skippable: 'false',
  replayOnReload: 1,
}), DEFAULTS);
assert.equal(resolveConfig({ accentLight: '#123456789' }).accentLight, DEFAULTS.accentLight);
assert.equal(resolveConfig({ duration: '1000' }).duration, DEFAULTS.duration);
assert.equal(resolveConfig({ duration: -20, maxWait: -10 }).duration, 0);
assert.equal(resolveConfig({ duration: -20, maxWait: -10 }).maxWait, 0);
assert.equal(resolveConfig({ duration: 30000, maxWait: 1 }).duration, 15000);
assert.equal(resolveConfig({ duration: 30000, maxWait: 1 }).maxWait, 15000);
assert.equal(resolveConfig({ duration: 6000, maxWait: 30000 }).maxWait, 20000);
assert.equal(resolveConfig({ duration: 10000, maxWait: NaN }).maxWait, 10000);
assert.equal(resolveConfig({ maxWait: 1 }).maxWait, 4500);

const imageBuffers = Object.freeze({
  barsLight: Buffer.from([0, 255, 1, 128]),
  barsDark: Buffer.from('graphite'),
  specimen: Buffer.from([255, 0, 127]),
});
assert.equal(buildAssetStyle(), '');
assert.equal(buildAssetStyle({}), '');
assert.equal(buildAssetStyle({ barsLight: undefined, barsDark: undefined, specimen: undefined }), '');
const lightStyle = '#rhine-splash,[data-phase=hero]{--rl-img-bars-light:url("data:image/jpeg;base64,AP8BgA==")}';
assert.equal(buildAssetStyle({ barsLight: imageBuffers.barsLight }), lightStyle);
const partialStyle = '#rhine-splash,[data-phase=hero]{--rl-img-bars-dark:url("data:image/jpeg;base64,Z3JhcGhpdGU=");--rl-img-specimen:url("data:image/jpeg;base64,/wB/")}';
assert.equal(buildAssetStyle({ barsDark: imageBuffers.barsDark, specimen: imageBuffers.specimen }), partialStyle);
assert.ok(!partialStyle.includes('--rl-img-bars-light'));
const allImageStyle = buildAssetStyle(imageBuffers);
assert.equal(allImageStyle, '#rhine-splash,[data-phase=hero]{--rl-img-bars-light:url("data:image/jpeg;base64,AP8BgA==");--rl-img-bars-dark:url("data:image/jpeg;base64,Z3JhcGhpdGU=");--rl-img-specimen:url("data:image/jpeg;base64,/wB/")}');
const encodedImages = [...allImageStyle.matchAll(/base64,([^"\)]+)/g)].map((match) => Buffer.from(match[1], 'base64'));
assert.deepEqual(encodedImages, Object.values(imageBuffers));

assert.equal(resolveConfig({}).effortSlider, true);
for (const key of ['enabled', 'uiTheme', 'brand', 'effortSlider', 'billing', 'todoCenter']) {
  assert.equal(DEFAULTS[key], true);
  assert.equal(resolveConfig({ [key]: false })[key], false);
  assert.equal(resolveConfig({ [key]: true })[key], true);
  for (const value of ['false', 0, null, {}]) assert.equal(resolveConfig({ [key]: value })[key], true);
}
const balanceSample = { currency: 'CNY', total_balance: '12.30', granted_balance: '2.00', topped_up_balance: '10.30' };
const balancePayload = { status: 'ready', available: true,
  balances: [{ currency: 'CNY', total: '12.30', granted: '2.00', toppedUp: '10.30' }] };
assert.deepEqual(parseBalance({ is_available: true, balance_infos: [balanceSample] }), balancePayload);
assert.deepEqual(parseBalance({ is_available: true, balance_infos: [
  balanceSample, { ...balanceSample, currency: 'EUR' }, { ...balanceSample, total_balance: '1e2' },
  { ...balanceSample, granted_balance: 2 }, { ...balanceSample, topped_up_balance: 'NaN' }, null,
] }), balancePayload);
assert.deepEqual(parseBalance({ is_available: false, balance_infos: [
  { currency: 'USD', total_balance: '-0.5', granted_balance: '0', topped_up_balance: '-0.5' },
] }), { status: 'ready', available: false, balances: [{ currency: 'USD', total: '-0.5', granted: '0', toppedUp: '-0.5' }] });
for (const input of [null, undefined, 'invalid', 42, [], {}, { is_available: true, balance_infos: [] }]) {
  assert.equal(parseBalance(input), null);
}
assert.deepEqual(readConfig(), DEFAULTS);
assert.deepEqual(readConfig(Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, { get: () => value }]))), DEFAULTS);
assert.deepEqual(readConfig(Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, { get: () => value }]))), resolved);
let liveEnabled = false;
assert.equal(readConfig({ enabled: { get: () => liveEnabled } }).enabled, false);
liveEnabled = true;
assert.equal(readConfig({ enabled: { get: () => liveEnabled } }).enabled, true);

const fakeAssets = Object.freeze({
  css: '/* host test CSS */\n</StYlE>',
  js: 'globalThis.__RHINE_SPLASH_TEST__ = true;',
});
const unsafeConfig = Object.freeze(resolveConfig({ title: '</script>\u2028middle\u2029end' }));
const unsafeBrand = { mark: '</script>\u2028mark', hero: '<svg>\u2029</svg>', name: '</script>' };
const rows = buildInjections(unsafeConfig, fakeAssets);
assert.equal(rows.length, 2);
assert.deepEqual(rows[0], { kind: 'style', text: '/* host test CSS */\n<\\/style>' });
assert.ok(!/<\/style/i.test(rows[0].text));
assert.equal(rows[1].kind, 'script');
assert.equal(rows[1].placement, 'body');
assert.ok(rows[1].text.startsWith('globalThis.__RHINE_BRAND__='));
assert.ok(rows[1].text.includes(';globalThis.__RHINE_SPLASH__='));
assert.ok(rows[1].text.endsWith(';\n' + fakeAssets.js));
assert.ok(rows[1].text.includes('\\u003c/script>'));
for (const script of [rows[1].text, buildInjections(unsafeConfig, { ...fakeAssets, brand: unsafeBrand })[1].text]) {
  assert.ok(!script.includes('</script>'));
  assert.ok(script.includes('\\u2028'));
  assert.ok(script.includes('\\u2029'));
  assert.ok(!script.includes('\u2028'));
  assert.ok(!script.includes('\u2029'));
}
function globalsOf(script) {
  const brandStart = 'globalThis.__RHINE_BRAND__='.length;
  const delimiter = ';globalThis.__RHINE_SPLASH__=';
  const configStart = script.indexOf(delimiter) + delimiter.length;
  return {
    brand: JSON.parse(script.slice(brandStart, script.indexOf(delimiter))),
    config: JSON.parse(script.slice(configStart, script.indexOf(';\n', configStart))),
  };
}
assert.deepEqual(globalsOf(rows[1].text), { brand: { mark: '', hero: '', name: '' }, config: unsafeConfig });
assert.deepEqual(globalsOf(buildInjections(unsafeConfig, { ...fakeAssets, brand: unsafeBrand })[1].text).brand, unsafeBrand);
assert.deepEqual(buildInjections(unsafeConfig, fakeAssets), rows);
assert.deepEqual(buildInjections(unsafeConfig, { ...fakeAssets, images: '' }), rows);
assert.deepEqual(buildInjections(unsafeConfig, { ...fakeAssets, images: allImageStyle }), [
  { kind: 'style', text: allImageStyle }, ...rows,
]);
const themeCss = '/* optional theme */</style>';
const themedAssets = { ...fakeAssets, themeCss, images: allImageStyle };
assert.deepEqual(buildInjections(unsafeConfig, themedAssets), [
  { kind: 'style', text: '/* optional theme */<\\/style>' }, { kind: 'style', text: allImageStyle }, ...rows,
]);
assert.deepEqual(buildInjections({ ...unsafeConfig, uiTheme: false }, themedAssets).map((row) => row.text), [allImageStyle, rows[0].text,
  buildInjections({ ...unsafeConfig, uiTheme: false }, fakeAssets)[1].text]);
assert.equal(buildInjections(DEFAULTS, { ...fakeAssets, themeCss: '' }).length, 2);
const disabledRows = buildInjections(resolveConfig({ enabled: false }), fakeAssets);
assert.equal(disabledRows.length, 2);
assert.equal(disabledRows[0].kind, 'style');
assert.equal(disabledRows[1].kind, 'script');
assert.equal(globalsOf(disabledRows[1].text).config.enabled, false);

function fakeContext() {
  const handlers = [], messages = [];
  return { handlers, messages, ctx: {
    on(event, handler, ...options) {
      assert.equal(event, 'webserver/index-inject');
      assert.deepEqual(options, []);
      handlers.push(handler);
    },
    logger(scope) {
      assert.equal(scope, 'rhine-splash');
      return { warn(message) { messages.push(message); } };
    },
  } };
}
// Real-file apply tolerates optional UI assets appearing or disappearing.
const real = fakeContext();
const live = { title: { get: () => 'Host test' }, enabled: { get: () => liveEnabled } };
assert.doesNotThrow(() => apply(real.ctx, live));
assert.equal(real.handlers.length, 1);
const table = [{ kind: 'style', text: '/* existing theme bootstrap */' }];
real.handlers[0](table);
assert.equal(table[0].text, '/* existing theme bootstrap */');
assert.equal(table.at(-2).kind, 'style');
assert.equal(table.at(-1).kind, 'script');
assert.equal(globalsOf(table.at(-1).text).config.title, 'Host test');
liveEnabled = false;
const updated = [];
real.handlers[0](updated);
assert.equal(globalsOf(updated.at(-1).text).config.enabled, false);
assert.equal(updated.at(-2).kind, 'style');
const injected = fakeContext();
const fiber = {};
injected.ctx.fiber = fiber;
let settingsCalls = 0, injectCalls = 0;
injected.ctx.inject = (services, callback) => {
  injectCalls++;
  if (services[0] === 'webServer') {
    assert.deepEqual(services, ['webServer']);
    return;
  }
  if (services[0] === 'workspaceRegistry') {
    assert.deepEqual(services, ['workspaceRegistry', 'sessionPersistence']);
    return;
  }
  assert.deepEqual(services, ['settings']);
  callback({ effect: (effect) => effect(), settings: { configure: (policy, owner) => {
    settingsCalls++;
    assert.deepEqual(policy, { auto: false });
    assert.equal(owner, fiber);
  } } });
};
assert.doesNotThrow(() => apply(injected.ctx));
assert.equal(injectCalls, 3);
assert.equal(settingsCalls, 1);

// Isolated fixtures never change the other author's source files.
const fixture = mkdtempSync(join(tmpdir(), 'rhine-host-test-'));
try {
  const lib = join(fixture, 'lib'), images = join(fixture, 'assets');
  mkdirSync(lib);
  mkdirSync(images);
  writeFileSync(join(lib, 'index.mjs'), readFileSync(new URL('../lib/index.js', import.meta.url)));
  mkdirSync(join(lib, 'host'));
  for (const filename of (await import('node:fs')).readdirSync(new URL('../lib/host/', import.meta.url))) {
    if (filename.endsWith('.js')) writeFileSync(join(lib, 'host', filename), readFileSync(new URL(`../lib/host/${filename}`, import.meta.url)));
  }
  writeFileSync(join(fixture, 'package.json'), '{"type":"module"}');
  writeFileSync(join(lib, 'splash.css'), fakeAssets.css);
  writeFileSync(join(lib, 'splash.js'), fakeAssets.js);
  writeFileSync(join(images, 'bars-light.jpg'), imageBuffers.barsLight);
  mkdirSync(join(images, 'bars-dark.jpg'));
  const { apply: fixtureApply } = await import(pathToFileURL(join(lib, 'index.mjs')).href);
  function invoke(config) {
    const result = fakeContext();
    fixtureApply(result.ctx, config);
    result.table = [];
    for (const handler of result.handlers) handler(result.table);
    return result;
  }
  const partial = invoke();
  assert.equal(partial.handlers.length, 1);
  assert.equal(partial.messages.length, 2);
  assert.match(partial.messages[0], /bars-dark\.jpg, specimen\.jpg/);
  assert.ok(!partial.messages[0].includes('bars-light.jpg'));
  assert.match(partial.messages[1], /theme\.css.*mark-plate\.svg.*mark-cell\.svg.*name\.html/);
  assert.deepEqual(partial.table, buildInjections(DEFAULTS, { ...fakeAssets, images: lightStyle }));
  // Optional sources are captured at apply, then reused on every emission.
  mkdirSync(join(lib, 'brand'));
  writeFileSync(join(lib, 'theme.css'), themeCss);
  const cellBrand = { mark: '<svg>cell mark</svg>', hero: '<svg>cell hero</svg>', name: unsafeBrand.name };
  for (const [filename, text] of [
    ['mark-plate.svg', unsafeBrand.mark], ['hero-plate.svg', unsafeBrand.hero],
    ['mark-cell.svg', cellBrand.mark], ['hero-cell.svg', cellBrand.hero],
    ['name.html', unsafeBrand.name],
  ]) writeFileSync(join(lib, 'brand', filename), text);
  const withExtras = invoke({ enabled: false });
  assert.equal(withExtras.messages.length, 1);
  assert.deepEqual(withExtras.table, buildInjections(resolveConfig({ enabled: false }), { ...fakeAssets, images: lightStyle, themeCss, brand: unsafeBrand }));
  assert.deepEqual(invoke({ uiTheme: false }).table, buildInjections(resolveConfig({ uiTheme: false }), { ...fakeAssets, images: lightStyle, themeCss, brand: unsafeBrand }));
  let liveLogo = 'plate';
  const switchable = invoke({ logo: { get: () => liveLogo } });
  assert.deepEqual(globalsOf(switchable.table.at(-1).text).brand, unsafeBrand);
  liveLogo = ' cell ';
  const cellTable = [];
  switchable.handlers[0](cellTable);
  assert.equal(globalsOf(cellTable.at(-1).text).config.logo, 'cell');
  assert.deepEqual(globalsOf(cellTable.at(-1).text).brand, cellBrand);
  rmSync(join(lib, 'brand', 'hero-cell.svg'));
  const cachedTable = [];
  switchable.handlers[0](cachedTable);
  assert.deepEqual(globalsOf(cachedTable.at(-1).text).brand, cellBrand);
  const fallback = invoke({ logo: 'cell' });
  // Hero files are optional per scheme: a missing one is quiet and falls back to the mark.
  assert.equal(fallback.messages.length, 1);
  assert.ok(!fallback.messages.some((message) => /hero-cell\.svg/.test(message)));
  assert.deepEqual(globalsOf(fallback.table.at(-1).text).brand, { ...cellBrand, hero: cellBrand.mark });
  writeFileSync(join(lib, 'brand', 'hero-cell.svg'), cellBrand.hero);
  rmSync(images, { recursive: true });
  const missing = invoke();
  assert.equal(missing.messages.length, 1);
  assert.match(missing.messages[0], /bars-light\.jpg, bars-dark\.jpg, specimen\.jpg/);
  assert.deepEqual(missing.table, buildInjections(DEFAULTS, { ...fakeAssets, themeCss, brand: unsafeBrand }));
  for (const [file, text] of [['splash.css', fakeAssets.css], ['splash.js', fakeAssets.js]]) {
    rmSync(join(lib, file));
    const disabled = invoke();
    assert.equal(disabled.handlers.length, 0);
    assert.deepEqual(disabled.table, []);
    assert.equal(disabled.messages.length, 1);
    assert.match(disabled.messages[0], /Unable to load Rhine splash assets; injection disabled/);
    writeFileSync(join(lib, file), text);
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log('Host tests passed (live config/cells, logo schemes/hero fallback, boolean validation, safe globals, theme/replay injection order, settings opt-out, optional/missing assets).');
