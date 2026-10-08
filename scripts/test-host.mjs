import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { apply, buildAssetStyle, buildInjections, DEFAULTS, name, resolveConfig } from '../lib/index.js';

// Configuration and injection tests use fake assets so concurrent asset authoring
// does not prevent validation of the host plugin.
assert.equal(name, 'rhine-splash');
assert.ok(Object.isFrozen(DEFAULTS));
assert.equal(DEFAULTS.duration, 4500);
assert.equal(DEFAULTS.accentLight, '#e46f24');
assert.equal(DEFAULTS.accentDark, '#f0893e');
assert.equal(DEFAULTS.maxWait, 8000);
assert.equal(DEFAULTS.exit, 'random');
for (const exit of ['random', 'doors', 'decode', 'glitch', 'iris']) {
  assert.equal(resolveConfig({ exit }).exit, exit);
}
assert.equal(resolveConfig({ exit: ' iris ' }).exit, 'iris');
for (const exit of ['invalid', '', 'fade', 'IRIS', 42, null]) {
  assert.equal(resolveConfig({ exit }).exit, 'random');
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
const lightStyle = '#rhine-splash{--rl-img-bars-light:url("data:image/jpeg;base64,AP8BgA==")}';
assert.equal(buildAssetStyle({ barsLight: imageBuffers.barsLight }), lightStyle);
const partialStyle = '#rhine-splash{--rl-img-bars-dark:url("data:image/jpeg;base64,Z3JhcGhpdGU=");--rl-img-specimen:url("data:image/jpeg;base64,/wB/")}';
assert.equal(buildAssetStyle({ barsDark: imageBuffers.barsDark, specimen: imageBuffers.specimen }), partialStyle);
assert.ok(!partialStyle.includes('--rl-img-bars-light'));
const allImageStyle = buildAssetStyle(imageBuffers);
assert.equal(allImageStyle, '#rhine-splash{--rl-img-bars-light:url("data:image/jpeg;base64,AP8BgA==");--rl-img-bars-dark:url("data:image/jpeg;base64,Z3JhcGhpdGU=");--rl-img-specimen:url("data:image/jpeg;base64,/wB/")}');
const encodedImages = [...allImageStyle.matchAll(/base64,([^"\)]+)/g)].map((match) => Buffer.from(match[1], 'base64'));
assert.deepEqual(encodedImages, Object.values(imageBuffers));

const fakeAssets = Object.freeze({
  css: '/* host test CSS */\n</StYlE>',
  js: 'globalThis.__RHINE_SPLASH_TEST__ = true;',
});
const unsafeConfig = Object.freeze(resolveConfig({ title: '</script>\u2028middle\u2029end' }));
const rows = buildInjections(unsafeConfig, fakeAssets);
assert.equal(rows.length, 2);
assert.deepEqual(rows[0], { kind: 'style', text: '/* host test CSS */\n<\\/style>' });
assert.ok(!/<\/style/i.test(rows[0].text));
assert.equal(rows[1].kind, 'script');
assert.equal(rows[1].placement, 'body');
assert.ok(rows[1].text.startsWith('globalThis.__RHINE_SPLASH__='));
assert.ok(rows[1].text.endsWith(';\n' + fakeAssets.js));
assert.ok(rows[1].text.includes('\\u003c/script>'));
assert.ok(!rows[1].text.includes('</script>'));
assert.ok(rows[1].text.includes('\\u2028'));
assert.ok(rows[1].text.includes('\\u2029'));
assert.ok(!rows[1].text.includes('\u2028'));
assert.ok(!rows[1].text.includes('\u2029'));
const serializedConfig = rows[1].text.slice(
  'globalThis.__RHINE_SPLASH__='.length,
  rows[1].text.indexOf(';\n'),
);
assert.deepEqual(JSON.parse(serializedConfig), unsafeConfig);
assert.deepEqual(buildInjections(unsafeConfig, fakeAssets), rows);
assert.deepEqual(buildInjections(unsafeConfig, { ...fakeAssets, images: '' }), rows);
assert.deepEqual(buildInjections(unsafeConfig, { ...fakeAssets, images: allImageStyle }), [
  { kind: 'style', text: allImageStyle },
  ...rows,
]);

// Only inspect asset existence: do not create or change the other author's files.
const assetsPresent = existsSync(new URL('../lib/splash.css', import.meta.url))
  && existsSync(new URL('../lib/splash.js', import.meta.url));
const repoImageStyle = buildAssetStyle({
  barsLight: readFileSync(new URL('../assets/bars-light.jpg', import.meta.url)),
  barsDark: readFileSync(new URL('../assets/bars-dark.jpg', import.meta.url)),
  specimen: readFileSync(new URL('../assets/specimen.jpg', import.meta.url)),
});
const subscriptions = [];
const warnings = [];
const ctx = {
  on(event, handler, ...options) {
    subscriptions.push({ event, handler, options });
  },
  logger(scope) {
    assert.equal(scope, 'rhine-splash');
    return { warn(message) { warnings.push(message); } };
  },
};
assert.doesNotThrow(() => apply(ctx, { title: 'Host test', theme: 'dark' }));
if (assetsPresent) {
  assert.equal(warnings.length, 0);
  assert.equal(subscriptions.length, 1);
  const subscription = subscriptions[0];
  assert.equal(subscription.event, 'webserver/index-inject');
  assert.deepEqual(subscription.options, []);
  const themeRow = { kind: 'style', text: '/* existing theme bootstrap */' };
  const table = [themeRow];
  subscription.handler(table);
  assert.equal(table[0], themeRow);
  assert.equal(table.length, 4); // Existing theme row plus three splash rows.
  assert.deepEqual(table[1], { kind: 'style', text: repoImageStyle });
  for (const property of ['--rl-img-bars-light', '--rl-img-bars-dark', '--rl-img-specimen']) {
    assert.ok(table[1].text.includes(`${property}:url("data:image/jpeg;base64,`));
  }
  assert.equal(table[2].kind, 'style');
  assert.equal(typeof table[2].text, 'string');
  assert.equal(table[3].kind, 'script');
  assert.equal(table[3].placement, 'body');
  assert.ok(table[3].text.startsWith(
    'globalThis.__RHINE_SPLASH__=' + JSON.stringify(resolveConfig({ title: 'Host test', theme: 'dark' })) + ';\n',
  ));
  const secondTable = [];
  subscription.handler(secondTable);
  assert.deepEqual(secondTable, table.slice(1));
} else {
  assert.equal(subscriptions.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Unable to load Rhine splash assets/);
}

// Isolated fixtures cover missing/unreadable images and required sources without
// touching the real splash files that another author is rewriting.
const fixture = mkdtempSync(join(tmpdir(), 'rhine-host-test-'));
try {
  const lib = join(fixture, 'lib'), images = join(fixture, 'assets');
  mkdirSync(lib);
  mkdirSync(images);
  writeFileSync(join(lib, 'index.mjs'), readFileSync(new URL('../lib/index.js', import.meta.url)));
  writeFileSync(join(lib, 'splash.css'), fakeAssets.css);
  writeFileSync(join(lib, 'splash.js'), fakeAssets.js);
  writeFileSync(join(images, 'bars-light.jpg'), imageBuffers.barsLight);
  mkdirSync(join(images, 'bars-dark.jpg')); // A directory is unreadable as an image.
  const { apply: fixtureApply } = await import(pathToFileURL(join(lib, 'index.mjs')).href);
  function invoke() {
    const handlers = [], messages = [];
    fixtureApply({
      on(event, handler) {
        assert.equal(event, 'webserver/index-inject');
        handlers.push(handler);
      },
      logger() { return { warn(message) { messages.push(message); } }; },
    });
    const table = [];
    for (const handler of handlers) handler(table);
    return { table, handlers, messages };
  }
  const partial = invoke();
  assert.equal(partial.handlers.length, 1);
  assert.equal(partial.messages.length, 1);
  assert.match(partial.messages[0], /bars-dark\.jpg, specimen\.jpg/);
  assert.ok(!partial.messages[0].includes('bars-light.jpg'));
  assert.deepEqual(partial.table, buildInjections(DEFAULTS, { ...fakeAssets, images: lightStyle }));
  rmSync(images, { recursive: true });
  const missing = invoke();
  assert.equal(missing.messages.length, 1);
  assert.match(missing.messages[0], /bars-light\.jpg, bars-dark\.jpg, specimen\.jpg/);
  assert.deepEqual(missing.table, buildInjections(DEFAULTS, fakeAssets));
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

console.log('Host tests passed (config defaults/clamps, image encoding, injection order, real-file apply, missing/unreadable assets).');
