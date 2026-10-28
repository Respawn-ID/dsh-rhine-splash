import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync as makeDir, symlinkSync } from 'node:fs';
import { ACCENTS, apply, buildAssetStyle, buildInjections, DEFAULTS, DESKTOP_APP_ID, deletionQueue, drainDeletions, forgetSession, isSessionDirInside, name, parseBalance, parseLatest, isNewer, readConfig, resolveConfig, staleArchivedIds, toastPayload } from '../lib/index.js';
import { registerStore } from '../lib/host/store.js';
import { emptyRecords, applyRecordOp, pruneRecords } from '../lib/index.js';
import { registerArchives } from '../lib/host/archives.js';
import { registerUpdate } from '../lib/host/update.js';
import { registerNotify, showWindowsToast } from '../lib/host/notify.js';

assert.deepEqual(staleArchivedIds(['session-b', 'session-a'], new Set(), () => false),
  ['session-b', 'session-a']);
for (const stored of [new Set(['session-stored']), ['session-stored']]) {
  assert.deepEqual(staleArchivedIds(['session-stored', 'session-missing'], stored, () => false),
    ['session-missing']);
}
assert.deepEqual(staleArchivedIds(['session-live', 'session-missing'], [], (id) => id === 'session-live'),
  ['session-missing']);
assert.deepEqual(staleArchivedIds([], [], () => false), []);

// Path validation is pure: no filesystem or network operations.
const sessionRoot = '/home/test/.dsh/sessions';
const sessionDir = join(sessionRoot, 'workspace', 'session-abc');
assert.equal(isSessionDirInside(sessionRoot, sessionDir), true);
assert.equal(isSessionDirInside(sessionRoot, sessionDir, 'session-abc'), true);
assert.equal(isSessionDirInside(sessionRoot, sessionDir, 'session-abd'), false);
assert.equal(isSessionDirInside(sessionRoot, join(sessionRoot, '..', 'session-abc')), false);
assert.equal(isSessionDirInside(sessionRoot, sessionRoot), false);
assert.equal(isSessionDirInside(sessionRoot, join(sessionRoot, 'other-folder')), false);
assert.equal(isSessionDirInside(sessionRoot, '/unrelated/session-abc'), false);

// Archive deletion against fake dsh services and a temporary sessions folder.
function archiveHost({ root, archived = [], live = [], stored = [], failCache = false }) {
  const calls = [];
  const index = () => ({ delete: (id) => calls.push(['index', id]) });
  const registry = {
    archivedSessionIds: [...archived],
    headers: index(), sessionPaths: index(), missingSessionPaths: index(), invalidSessionPaths: index(),
    list: () => ['w1', 'w2'].map((workspace) => ({ detachSession: async (id) => calls.push(['detach', workspace, id]) })),
    unpinSession: async (id) => calls.push(['unpin', id]),
    unarchiveSession: async (id) => {
      calls.push(['unarchive', id]);
      registry.archivedSessionIds = registry.archivedSessionIds.filter((item) => item !== id);
    },
  };
  const services = {
    workspaceRegistry: registry,
    sessions: { get: (id) => (live.includes(id) ? {} : undefined) },
    sessionPersistence: {
      root,
      list: async () => stored.map(({ id, cwd }) => ({ header: { id, cwd } })),
      locate: ({ id, cwd }) => ({ path: join(root, cwd, id, 'session.v4.jsonl.zstd') }),
      coldLogMemo: { delete: (id) => calls.push(['memo', id]) },
    },
    sessionProjectionCache: { requireTable: () => ({ delete: async (id) => { calls.push(['cache', id]); if (failCache) throw new Error('cache down'); } }) },
    sessionQuery: { searchSessions: async (request) => { calls.push(['search', request.limit]); return { items: [] }; } },
  };
  const ctx = {
    get: (key) => services[key],
    emit: (event, id) => calls.push([event, id]),
    logger: { info() {}, warn: (message) => calls.push(['warn', message]) },
  };
  let handler;
  registerArchives(ctx, { warn: () => {} })({ effect: (fn) => fn(), webServer: { register: (route) => { handler = route.handler; return () => {}; } } });
  const request = async (body, headers = { 'x-rhine-splash': '1' }) => {
    const req = new EventEmitter();
    Object.assign(req, { method: 'POST', headers, socket: { remoteAddress: '127.0.0.1' }, resume() {} });
    const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(text) { this.body = text; } };
    const done = handler(req, res);
    req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
    await done;
    await new Promise((resolve) => setImmediate(resolve));
    return { status: res.statusCode, value: res.body ? JSON.parse(res.body) : undefined };
  };
  return { calls, ctx, registry, request };
}
{
  const base = mkdtempSync(join(tmpdir(), 'rhine-archives-'));
  const root = join(base, 'sessions');
  makeDir(root);
  try {
    const dir = join(root, 'ws', 'session-gone');
    makeDir(dir, { recursive: true });
    writeFileSync(join(dir, 'session.v4.jsonl.zstd'), 'log');
    const host = archiveHost({ root, archived: ['session-gone', 'session-live'], live: ['session-live'],
      stored: [{ id: 'session-gone', cwd: 'ws' }, { id: 'session-live', cwd: 'ws' }] });
    assert.deepEqual(await host.request({ sessionId: 'session-gone' }, {}), { status: 403, value: undefined });
    assert.deepEqual(await host.request({ sessionId: '../x' }), { status: 400, value: { status: 'invalid' } });
    assert.deepEqual(await host.request({ sessionId: 'session-other' }), { status: 409, value: { status: 'not-archived' } });
    // Loaded in this run: queued for the next start, nothing forgotten now.
    assert.deepEqual(await host.request({ sessionId: 'session-live' }), { status: 202, value: { status: 'scheduled' } });
    assert.deepEqual(await host.request({ sessionId: 'session-live' }), { status: 202, value: { status: 'scheduled' } });
    assert.deepEqual(JSON.parse(readFileSync(join(base, 'rhine-splash', 'pending-deletions.json'), 'utf8')), { ids: ['session-live'] });
    assert.equal(host.calls.length, 0);
    assert.deepEqual(await host.request({ sessionId: 'session-gone' }), { status: 200, value: { status: 'deleted' } });
    assert.equal(existsSync(dir), false, 'deleted for good, not moved');
    assert.ok(existsSync(join(root, 'ws')), 'the parent folder stays');
    assert.deepEqual(host.calls, [
      ['api-session/removed', 'session-gone'],
      ['detach', 'w1', 'session-gone'], ['detach', 'w2', 'session-gone'],
      ['index', 'session-gone'], ['index', 'session-gone'], ['index', 'session-gone'], ['index', 'session-gone'],
      ['unpin', 'session-gone'], ['unarchive', 'session-gone'],
      ['memo', 'session-gone'], ['cache', 'session-gone'],
      ['search', 1],
    ]);
    assert.deepEqual(host.registry.archivedSessionIds, ['session-live']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
{
  const base = mkdtempSync(join(tmpdir(), 'rhine-archives-'));
  const root = join(base, 'sessions');
  makeDir(root);
  const outside = mkdtempSync(join(tmpdir(), 'rhine-outside-'));
  try {
    makeDir(join(root, 'ws'), { recursive: true });
    writeFileSync(join(outside, 'keep.txt'), 'keep');
    // A junction needs no privilege on Windows; elsewhere the type is ignored.
    symlinkSync(outside, join(root, 'ws', 'session-link'), 'junction');
    const host = archiveHost({ root, archived: ['session-link', 'session-renamed'],
      stored: [{ id: 'session-link', cwd: 'ws' }, { id: 'session-renamed', cwd: '../elsewhere' }] });
    assert.deepEqual(await host.request({ sessionId: 'session-link' }), { status: 400, value: { status: 'invalid' } });
    assert.deepEqual(await host.request({ sessionId: 'session-renamed' }), { status: 400, value: { status: 'invalid' } });
    assert.ok(existsSync(join(outside, 'keep.txt')), 'a linked folder is never followed');
    assert.equal(host.calls.length, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
}
{
  const base = mkdtempSync(join(tmpdir(), 'rhine-archives-'));
  const root = join(base, 'sessions');
  makeDir(root);
  try {
    makeDir(join(root, 'ws', 'session-half'), { recursive: true });
    const host = archiveHost({ root, archived: ['session-half'], stored: [{ id: 'session-half', cwd: 'ws' }], failCache: true });
    assert.deepEqual(await host.request({ sessionId: 'session-half' }), { status: 200, value: { status: 'deleted', cleanup: ['cache'] } });
    assert.ok(host.calls.some(([kind]) => kind === 'warn'));
    assert.deepEqual(host.registry.archivedSessionIds, []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
// Queued deletions run at the next start: loaded ones wait again, unarchived ones are cancelled.
{
  const base = mkdtempSync(join(tmpdir(), 'rhine-archives-'));
  const root = join(base, 'sessions');
  try {
    const dir = join(root, 'ws', 'session-old');
    makeDir(dir, { recursive: true });
    writeFileSync(join(dir, 'session.v4.jsonl.zstd'), 'log');
    const host = archiveHost({ root, archived: ['session-old', 'session-busy'], live: ['session-busy'],
      stored: [{ id: 'session-old', cwd: 'ws' }, { id: 'session-busy', cwd: 'ws' }, { id: 'session-back', cwd: 'ws' }] });
    const queue = deletionQueue(host.ctx.get('sessionPersistence'));
    assert.equal(queue.path, join(base, 'rhine-splash', 'pending-deletions.json'));
    assert.deepEqual(await queue.read(), [], 'no file yet');
    for (const id of ['session-old', 'session-busy', 'session-back', 'session-old']) await queue.add(id);
    writeFileSync(queue.path, JSON.stringify({ ids: [...await queue.read(), '../escape', 7] }));
    assert.deepEqual(await queue.read(), ['session-old', 'session-busy', 'session-back'], 'only valid ids, once');
    assert.deepEqual(await drainDeletions(host.ctx, queue), ['session-busy']);
    assert.equal(existsSync(dir), false);
    assert.deepEqual(await queue.read(), ['session-busy']);
    assert.ok(host.calls.some(([kind, id]) => kind === 'api-session/removed' && id === 'session-old'));
    assert.ok(!host.calls.some(([, id]) => id === 'session-back'), 'unarchived since: cancelled, untouched');
    host.registry.archivedSessionIds = [];
    assert.deepEqual(await drainDeletions(host.ctx, queue), []);
    assert.equal(existsSync(queue.path), false, 'an empty queue leaves no file');
    writeFileSync(queue.path, 'not json');
    assert.deepEqual(await queue.read(), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
// Windows toasts: validated input, host route, and the PowerShell call.
{
  assert.equal(DESKTOP_APP_ID, 'com.deepseek.dsh');
  assert.deepEqual(toastPayload({ title: '  Fix\n  tests ', body: 'Done', tag: 'session-1/../x' }),
    { app: DESKTOP_APP_ID, title: 'Fix tests', body: 'Done', tag: 'session-1x' });
  assert.equal(toastPayload({ title: '', body: 'x' }), null);
  assert.equal(toastPayload({ title: 'x' }), null);
  assert.equal(toastPayload({ title: 'x'.repeat(500), body: '' }).title.length, 120);

  const route = (platform, show) => {
    let handler;
    registerNotify({ get: () => undefined }, { platform, show })({ effect: (fn) => fn(), webServer: { register: (entry) => { handler = entry.handler; return () => {}; } } });
    return async (body, headers = { 'x-rhine-splash': '1' }, method = 'POST') => {
      const req = new EventEmitter();
      Object.assign(req, { method, headers, socket: { remoteAddress: '127.0.0.1' }, resume() {} });
      const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(text) { this.body = text; } };
      const done = handler(req, res);
      req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      req.emit('end');
      await done;
      return { status: res.statusCode, value: res.body ? JSON.parse(res.body) : undefined };
    };
  };
  const shown = [];
  const windows = route('win32', async (payload) => { shown.push(payload); return 'shown'; });
  assert.deepEqual(await windows({ title: 'T', body: 'B', tag: 's1' }, {}), { status: 403, value: undefined });
  assert.deepEqual(await windows({ title: 'T', body: 'B' }, { 'x-rhine-splash': '1' }, 'GET'), { status: 405, value: undefined });
  assert.deepEqual(await windows('nope'), { status: 400, value: { status: 'invalid' } });
  assert.deepEqual(await windows({ title: 'T', body: 'B', tag: 's1' }), { status: 200, value: { status: 'shown' } });
  assert.deepEqual(shown, [{ app: DESKTOP_APP_ID, title: 'T', body: 'B', tag: 's1' }]);
  assert.deepEqual(await route('darwin', async () => 'shown')({ title: 'T', body: 'B' }), { status: 404, value: { status: 'unsupported' } });

  const spawned = [];
  const fakeSpawn = (output, code = 0) => (file, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.kill = () => {};
    spawned.push({ file, args, options });
    setImmediate(() => { if (output) child.stdout.emit('data', output); child.emit('close', code); });
    return child;
  };
  const payload = toastPayload({ title: 'Rhine "<&>"', body: '完成', tag: 's1' });
  assert.equal(await showWindowsToast(payload, { spawnProcess: fakeSpawn('shown\r\n') }), 'shown');
  const [{ file, args, options }] = spawned;
  assert.match(file, /WindowsPowerShell[\\/]v1\.0[\\/]powershell\.exe$/);
  assert.equal(args[args.length - 2], '-EncodedCommand');
  const script = Buffer.from(args.at(-1), 'base64').toString('utf16le');
  assert.ok(script.includes('CreateTextNode') && !script.includes('Rhine'), 'text is passed as data, never as script');
  assert.ok(script.includes('launch="dsh://open"'));
  assert.deepEqual(JSON.parse(Buffer.from(options.env.RHINE_TOAST, 'base64').toString('utf8')), payload);
  assert.equal(options.windowsHide, true);
  assert.equal(await showWindowsToast(payload, { spawnProcess: fakeSpawn('blocked') }), 'blocked');
  assert.equal(await showWindowsToast(payload, { spawnProcess: fakeSpawn('', 1) }), 'failed');
  assert.equal(await showWindowsToast(payload, { spawnProcess: () => { throw new Error('no shell'); } }), 'failed');
}
// Cleanup tolerates a dsh without the internal indexes and caches.
{
  const events = [];
  const failed = await forgetSession({ get: (key) => (key === 'workspaceRegistry' ? { unarchiveSession: async () => events.push('unarchive') } : undefined), emit: (event) => events.push(event) }, 'session-x');
  assert.deepEqual(failed, []);
  assert.deepEqual(events, ['api-session/removed', 'unarchive']);
}

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
assert.equal(DEFAULTS.accent, 'rhine');
assert.equal(DEFAULTS.accentColor, '#e46f24');
assert.equal(DEFAULTS.base, 'warm');
for (const key of ['budgetDaily', 'budgetSession', 'balanceAlert']) {
  assert.equal(DEFAULTS[key], 0);
  for (const [value, expected] of [[0, 0], [12.34, 12.34], [12.345, 12.35], [100000, 100000]]) assert.equal(resolveConfig({ [key]: value })[key], expected);
  for (const value of [-1, NaN, Infinity, '12.34', 100000.01, null, {}, []]) assert.equal(resolveConfig({ [key]: value })[key], 0);
}

assert.ok(Object.isFrozen(ACCENTS));
for (const [key, choices] of [['accent', [...Object.keys(ACCENTS), 'custom']], ['base', ['warm', 'neutral', 'official']]]) {
  for (const value of choices) assert.equal(resolveConfig({ [key]: value })[key], value);
  assert.equal(resolveConfig({ [key]: ' ' + choices[1] + ' ' })[key], choices[1]);
  for (const value of [undefined, null, '', 'INVALID', 1, {}, []]) assert.equal(resolveConfig({ [key]: value })[key], DEFAULTS[key]);
}
for (const color of ['#abc', '#ABC', '#123456', '#ABCDEF']) assert.equal(resolveConfig({ accentColor: color }).accentColor, color);
for (const color of [undefined, null, 123, '#12', '#abcd', '#abcde', '#12345678', '#gggggg', 'red', ' #abc ']) {
  assert.equal(resolveConfig({ accentColor: color }).accentColor, DEFAULTS.accentColor);
}
const themeSource = readFileSync(new URL('../lib/theme.css', import.meta.url), 'utf8');
for (const [accent, [light, dark]] of Object.entries(ACCENTS)) {
  const config = resolveConfig({ accent, accentDark: '#111111' });
  assert.equal(config.accentLight, light);
  assert.equal(config.accentDark, dark);
  assert.equal(themeSource.match(new RegExp('--rl-accent-' + accent + ':\\s*(#[0-9a-f]+)'))?.[1], light);
}
for (const [color, light, dark] of [['#abc', '#aabbcc', '#bbc9d6'], ['#123456', '#123456', '#415d78'], ['#ABCDEF', '#abcdef', '#bcd7f2']]) {
  const custom = resolveConfig({ accent: 'custom', accentColor: color });
  assert.equal(custom.accentLight, light);
  assert.equal(custom.accentDark, dark);
  assert.equal(resolveConfig({ accent: 'custom', accentColor: color, accentDark: '#13579b' }).accentDark, '#13579b');
  assert.equal(resolveConfig({ accent: 'custom', accentColor: color, accentDark: 'invalid' }).accentDark, dark);
}
const migrated = resolveConfig({ accentLight: '#123456' });
assert.equal(migrated.accent, 'custom');
assert.equal(migrated.accentColor, '#123456');
assert.equal(migrated.accentLight, '#123456');
assert.equal(migrated.accentDark, '#415d78');
assert.equal(resolveConfig({ accent: 'ocean', accentLight: '#123456' }).accent, 'ocean');
assert.equal(resolveConfig({ accentLight: DEFAULTS.accentLight }).accent, 'rhine');
assert.equal(resolveConfig({ accent: 'rhine', accentLight: '#abc' }).accentColor, '#abc');
assert.equal(resolveConfig({ accent: 'custom', accentColor: '#123456', accentLight: '#abc' }).accentColor, '#123456');
assert.equal(resolveConfig({ accent: 'custom', accentDark: '#ABC' }).accentDark, '#ABC');

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
// The retired slat and full styles both became the diagonal.
assert.equal(resolveConfig({ heroBackground: 'bars' }).heroBackground, 'diagonal');
assert.equal(resolveConfig({ heroBackground: ' full ' }).heroBackground, 'diagonal');
assert.equal(DEFAULTS.resumeEffect, 'random');
assert.equal(DEFAULTS.resumeTrigger, 'hidden');
assert.equal(DEFAULTS.costOpen, 'popup');
for (const key of ['weeklyReport', 'notifyCurrent', 'notifyOthers', 'notifyAway', 'notifySystem', 'notifyToast', 'notifySound']) {
  assert.equal(DEFAULTS[key], true);
  assert.equal(resolveConfig({ [key]: false })[key], false);
  assert.equal(resolveConfig({ [key]: true })[key], true);
  for (const value of ['false', 0, null, {}]) assert.equal(resolveConfig({ [key]: value })[key], true);
}
for (const [key, choices] of [
  ['heroBackground', ['random', 'diagonal', 'horizon', 'grid', 'off']],
  ['resumeEffect', ['random', 'scan', 'iris', 'glitch', 'off']],
  ['resumeTrigger', ['hidden', 'away', 'always']],
  ['costOpen', ['page', 'popup']],
  ['splashWhen', ['launch', 'daily', 'update']],
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
  accent: 'custom',
  accentColor: '#ABC',
  accentLight: '#aabbcc',
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
for (const key of ['enabled', 'uiTheme', 'brand', 'effortSlider', 'billing', 'todoCenter', 'rowStatus']) {
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
const bootstrapAt = rows[1].text.indexOf('(function(c)');
assert.ok(bootstrapAt > rows[1].text.indexOf(';globalThis.__RHINE_SPLASH__='));
assert.ok(bootstrapAt < rows[1].text.indexOf(fakeAssets.js));
for (const snippet of ['toggleAttribute("data-rl-ui"', 'dataset.rlAccent=c.accent', 'dataset.rlBase=c.base', 'setProperty("--rl-accent-custom"', 'removeProperty("--rl-accent-custom"']) assert.ok(rows[1].text.includes(snippet));
for (const accent of ['custom', 'ocean']) {
  const values = new Map();
  const root = { dataset: {}, setAttribute: (key, value) => values.set(key, value), removeAttribute: (key) => values.delete(key), toggleAttribute: (key, on) => on ? values.set(key, '') : values.delete(key),
    style: { setProperty: (key, value) => values.set(key, value), removeProperty: (key) => values.delete(key) } };
  values.set('--rl-accent-custom', '#fff');
  const config = resolveConfig({ uiTheme: false, accent, accentColor: '#123456', base: 'neutral' });
  const sandbox = { document: { documentElement: root } };
  vm.runInNewContext(buildInjections(config, fakeAssets)[1].text, sandbox);
  assert.equal(values.has('data-rl-ui'), false);
  assert.equal(root.dataset.rlAccent, accent);
  assert.equal(root.dataset.rlBase, 'neutral');
  assert.equal(values.get('--rl-accent-custom'), accent === 'custom' ? '#123456' : undefined);
}
for (const uiTheme of [true, false]) for (const rowStatus of [true, false]) {
  const values = new Map([['data-rl-rows', 'on']]);
  const root = { dataset: {}, toggleAttribute: (key, on) => on ? values.set(key, '') : values.delete(key),
    setAttribute: (key, value) => values.set(key, value), removeAttribute: (key) => values.delete(key),
    style: { setProperty() {}, removeProperty() {} } };
  vm.runInNewContext(buildInjections(resolveConfig({ uiTheme, rowStatus }), fakeAssets)[1].text, { document: { documentElement: root } });
  assert.equal(values.get('data-rl-rows'), uiTheme && rowStatus ? 'on' : undefined);
}
for (const value of [undefined, null, '', 0, 1, {}, [], 'false']) assert.equal(readConfig({ rowStatus: value }).rowStatus, true);
assert.equal(readConfig({ rowStatus: { get: () => false } }).rowStatus, false);
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
assert.deepEqual(globalsOf(rows[1].text), { brand: { mark: '', hero: '', name: '', marks: { plate: '', cell: '' }, heroes: { plate: '', cell: '' } }, config: { ...unsafeConfig, version: '' } });
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
assert.deepEqual(buildInjections({ ...unsafeConfig, uiTheme: false }, themedAssets).map((row) => row.text), ['/* optional theme */<\\/style>', allImageStyle, rows[0].text,
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
assert.equal(globalsOf(table.at(-1).text).config.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
assert.equal(globalsOf(buildInjections(DEFAULTS, { ...fakeAssets, version: '0.2.8' })[1].text).config.version, '0.2.8');
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
  assert.deepEqual(partial.table, buildInjections(DEFAULTS, { ...fakeAssets, images: lightStyle, brand: { mark: '', hero: '', name: '', marks: { plate: '', cell: '' }, heroes: { plate: '', cell: '' } } }));
  // Optional sources are captured at apply, then reused on every emission.
  mkdirSync(join(lib, 'brand'));
  writeFileSync(join(lib, 'theme.css'), themeCss);
  const cellBrand = { mark: '<svg>cell mark</svg>', hero: '<svg>cell hero</svg>', name: unsafeBrand.name };
  for (const [filename, text] of [
    ['mark-plate.svg', unsafeBrand.mark], ['hero-plate.svg', unsafeBrand.hero],
    ['mark-cell.svg', cellBrand.mark], ['hero-cell.svg', cellBrand.hero],
    ['name.html', unsafeBrand.name],
  ]) writeFileSync(join(lib, 'brand', filename), text);
  const maps = { marks: { plate: unsafeBrand.mark, cell: cellBrand.mark }, heroes: { plate: unsafeBrand.hero, cell: cellBrand.hero } };
  const plateFull = { ...unsafeBrand, ...maps }, cellFull = { ...cellBrand, ...maps };
  const withExtras = invoke({ enabled: false });
  assert.equal(withExtras.messages.length, 1);
  assert.deepEqual(withExtras.table, buildInjections(resolveConfig({ enabled: false }), { ...fakeAssets, images: lightStyle, themeCss, brand: plateFull }));
  assert.deepEqual(invoke({ uiTheme: false }).table, buildInjections(resolveConfig({ uiTheme: false }), { ...fakeAssets, images: lightStyle, themeCss, brand: plateFull }));
  let liveLogo = 'plate';
  const switchable = invoke({ logo: { get: () => liveLogo } });
  assert.deepEqual(globalsOf(switchable.table.at(-1).text).brand, plateFull);
  liveLogo = ' cell ';
  const cellTable = [];
  switchable.handlers[0](cellTable);
  assert.equal(globalsOf(cellTable.at(-1).text).config.logo, 'cell');
  assert.deepEqual(globalsOf(cellTable.at(-1).text).brand, cellFull);
  rmSync(join(lib, 'brand', 'hero-cell.svg'));
  const cachedTable = [];
  switchable.handlers[0](cachedTable);
  assert.deepEqual(globalsOf(cachedTable.at(-1).text).brand, cellFull);
  const fallback = invoke({ logo: 'cell' });
  // Hero files are optional per scheme: a missing one is quiet and falls back to the mark.
  assert.equal(fallback.messages.length, 1);
  assert.ok(!fallback.messages.some((message) => /hero-cell\.svg/.test(message)));
  assert.deepEqual(globalsOf(fallback.table.at(-1).text).brand, { ...cellFull, hero: cellBrand.mark, heroes: { plate: unsafeBrand.hero, cell: cellBrand.mark } });
  rmSync(join(lib, 'brand', 'hero-plate.svg'));
  assert.deepEqual(globalsOf(invoke().table.at(-1).text).brand.heroes, { plate: unsafeBrand.mark, cell: cellBrand.mark });
  writeFileSync(join(lib, 'brand', 'hero-plate.svg'), unsafeBrand.hero);
  writeFileSync(join(lib, 'brand', 'hero-cell.svg'), cellBrand.hero);
  rmSync(images, { recursive: true });
  const missing = invoke();
  assert.equal(missing.messages.length, 1);
  assert.match(missing.messages[0], /bars-light\.jpg, bars-dark\.jpg, specimen\.jpg/);
  assert.deepEqual(missing.table, buildInjections(DEFAULTS, { ...fakeAssets, themeCss, brand: plateFull }));
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

// New settings reject invalid types and fractional hours/seconds.
assert.equal(DEFAULTS.splashWhen, 'launch');
for (const [key, fallback, max] of [['notifyMinRun', 10, 600], ['quietFrom', 22, 23], ['quietTo', 8, 23]]) {
  assert.equal(DEFAULTS[key], fallback);
  for (const value of [0, 1, max]) assert.equal(resolveConfig({ [key]: value })[key], value);
  for (const value of [-1, max + 1, 1.5, NaN, Infinity, '1', null]) assert.equal(resolveConfig({ [key]: value })[key], fallback);
}
for (const [key, fallback] of [['quietHours', false], ['updateCheck', true]]) {
  assert.equal(DEFAULTS[key], fallback);
  for (const value of [true, false]) assert.equal(resolveConfig({ [key]: value })[key], value);
  for (const value of [null, 0, 'true', {}]) assert.equal(resolveConfig({ [key]: value })[key], fallback);
}
assert.equal(Object.hasOwn(resolveConfig({ version: '9.9.9' }), 'version'), false);
for (const version of ['0.2.8', '1.10.0', '12.34.56']) assert.equal(parseLatest({ version }), version);
for (const value of [null, {}, { version: 1 }, { version: 'v0.2.8' }, { version: '0.2' }, { version: '0.2.8-beta' }, { version: ' 0.2.8' }]) assert.equal(parseLatest(value), null);
for (const [latest, current, newer] of [['0.2.8', '0.2.7', true], ['0.10.0', '0.9.9', true], ['1.0.0', '0.99.99', true], ['0.2.7', '0.2.7', false], ['0.2.6', '0.2.7', false], ['0.2.8', '', false], ['bad', '0.2.7', false], ['0.2.8', 'v0.2.7', false]]) assert.equal(isNewer(latest, current), newer);
{
  const savedFetch = globalThis.fetch, savedNow = Date.now;
  let now = 100000000, calls = [];
  Date.now = () => now;
  const route = () => {
    let handler;
    registerUpdate({ get: () => undefined }, { version: '0.2.7' })({ effect: (fn) => fn(), webServer: { register(entry) { assert.equal(entry.path, '/rhine-splash/update'); handler = entry.handler; return () => {}; } } });
    return async (headers = { 'x-rhine-splash': '1' }, method = 'GET') => {
      const res = { statusCode: 200, setHeader() {}, end(text) { this.body = text; } };
      await handler({ method, headers, socket: { remoteAddress: '127.0.0.1' } }, res);
      return { status: res.statusCode, value: res.body ? JSON.parse(res.body) : undefined };
    };
  };
  try {
    globalThis.fetch = async (url, options) => {
      calls.push(url);
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.accept, 'application/json');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, json: async () => ({ version: '0.2.8' }) };
    };
    const request = route();
    assert.deepEqual(await request({}), { status: 403, value: undefined });
    assert.deepEqual(await request({ 'x-rhine-splash': '1' }, 'POST'), { status: 405, value: undefined });
    assert.equal(calls.length, 0);
    const ready = { status: 200, value: { status: 'ready', current: '0.2.7', latest: '0.2.8', newer: true } };
    assert.deepEqual(await request(), ready);
    assert.deepEqual(await request(), ready);
    assert.deepEqual(calls, ['https://registry.npmjs.org/dsh-rhine-splash/latest']);
    now += 21600000;
    await request();
    assert.equal(calls.length, 2);
    calls = [];
    globalThis.fetch = async (url) => { calls.push(url); if (url.includes('npmjs')) throw new Error('offline'); return { ok: true, json: async () => ({ version: '0.2.8' }) }; };
    assert.deepEqual(await route()(), ready);
    assert.deepEqual(calls, ['https://registry.npmjs.org/dsh-rhine-splash/latest', 'https://registry.npmmirror.com/dsh-rhine-splash/latest']);
    calls = [];
    globalThis.fetch = async (url) => { calls.push(url); return { ok: true, json: async () => ({ version: 'invalid' }) }; };
    const failed = route();
    assert.deepEqual(await failed(), { status: 200, value: { status: 'failed', current: '0.2.7' } });
    await failed();
    assert.equal(calls.length, 2);
    now += 600000;
    await failed();
    assert.equal(calls.length, 4);
    calls = [];
    let release;
    globalThis.fetch = (url) => { calls.push(url); return new Promise((resolve) => { release = () => resolve({ ok: true, json: async () => ({ version: '0.2.8' }) }); }); };
    const shared = route(), first = shared(), second = shared();
    assert.equal(calls.length, 1);
    release();
    assert.deepEqual(await first, ready);
    assert.deepEqual(await second, ready);
  } finally { globalThis.fetch = savedFetch; Date.now = savedNow; }
}

console.log('Host tests passed (weeklyReport default/validation, update route/cache/fallback/auth, new settings/version, accent/base validation and migration, derived splash colours, CSS palette contracts, live config/cells, both logo maps/hero fallback, safe globals/root bootstrap, theme/replay injection order, settings opt-out, optional/missing assets).');

// Local records: pure replay and real interleaved host writers.
{
  const now = Date.now(), day = localDay(now), hour = new Date(now).getHours();
  const rates = { miss: 2, hit: 0.04, out: 8 };
  const usage = (id = 'a', seen = { miss: 1000000, hit: 500000, out: 100000 }, extra = {}) => ({
    type: 'usage', sessionId: id, model: 'deepseek-flash', currency: 'CNY', seen,
    prices: { CNY: rates, USD: { miss: 0.3, hit: 0.006, out: 1.2 } }, peak: true, day, hour, at: now, ...extra,
  });
  const step = (doc, op) => applyRecordOp(doc, op, now);
  const blank = emptyRecords(), first = step(blank, usage());
  const cost = (seen, peak = true) => (seen.miss * rates.miss + seen.hit * rates.hit + seen.out * rates.out) / 1000000 * (peak ? 1 : 0.5);
  assert.equal(first.result.added, cost(usage().seen));
  assert.deepEqual(first.result.ledger, { seen: usage().seen, cost: cost(usage().seen), currency: 'CNY', model: 'deepseek-flash', at: now });
  assert.deepEqual(blank, emptyRecords(), 'pure helpers do not mutate');
  assert.equal(step(first.doc, usage()).result.added, 0);
  const higher = usage('a', { miss: 2000000, hit: 500000, out: 200000 }, { peak: false });
  const second = step(first.doc, higher);
  assert.equal(second.result.added, cost({ miss: 1000000, hit: 0, out: 100000 }, false));
  assert.equal(second.doc.billDays.days[day].models['deepseek-flash'].miss, 2000000);
  assert.equal(second.doc.billDays.days[day].offPeak, second.result.added);
  assert.equal(second.doc.billDays.days[day].hours[hour], second.result.ledger.cost);
  const reset = step(second.doc, usage('a', { miss: 1, hit: 0, out: 0 }));
  assert.equal(reset.result.added, 0, 'a negative bucket does not add cost');
  assert.deepEqual(reset.result.ledger.seen, { miss: 1, hit: 0, out: 0 });
  const unknown = step(blank, usage('unknown', undefined, { prices: { CNY: null, USD: null } }));
  assert.equal(unknown.result.ledger.cost, null);
  assert.equal(step(unknown.doc, usage('unknown')).result.added, first.result.added, 'newly priced ledgers price all usage');
  assert.equal(step(first.doc, usage('a', undefined, { currency: 'USD' })).result.ledger.currency, 'CNY');
  const usd = step(first.doc, usage('usd', undefined, { currency: 'USD' }));
  assert.equal(usd.doc.billDays.currency, 'USD');
  assert.deepEqual(Object.keys(usd.doc.billDays.days[day].sessions), ['usd'], 'currency switch resets day log');
  assert.equal(step(blank, { ...usage(), hour: 24 }).result, null);
  assert.equal(step(blank, { ...usage(), day: '2026-02-30' }).result, null);
  assert.equal(step(blank, { ...usage(), prices: { CNY: { miss: Infinity }, USD: null } }).result, null);
  const run = { type: 'run', sessionId: 'a', day, ms: 3200, endedAt: now };
  const ran = step(blank, run);
  assert.deepEqual(ran.doc.runDays.days[day], { runs: 1, ms: 3200, longest: 3200 });
  for (const offset of [-15000, 0, 14999, 15000]) assert.deepEqual(step(ran.doc, { ...run, endedAt: now + offset }).doc.runDays, ran.doc.runDays);
  assert.equal(step(ran.doc, { ...run, endedAt: now + 15001, ms: 5000 }).doc.runDays.days[day].runs, 2);
  const alerts = { budget: { day, daily: [80], ids: { a: { day, levels: [80] } } }, balance: { limit: 5, fired: true } };
  const alerted = step(first.doc, { type: 'alerts', ...alerts }).doc;
  assert.deepEqual(alerted.alerts, alerts);
  assert.equal(step(alerted, { type: 'alerts', balance: null }).doc.alerts.balance, null);
  const imported = { type: 'import', origin: 'http://localhost:1234', billDays: second.doc.billDays, ledgers: second.doc.ledgers,
    runDays: ran.doc.runDays, alerts };
  const merged = step(alerted, imported).doc;
  assert.deepEqual(merged.billDays, second.doc.billDays);
  assert.deepEqual(merged.ledgers, second.doc.ledgers);
  assert.deepEqual(step(merged, imported).doc, merged, 'importing an origin twice is identical');
  const lower = { ...imported, origin: 'dsh-app://app', billDays: first.doc.billDays, ledgers: first.doc.ledgers };
  const maxed = step(merged, lower).doc;
  assert.deepEqual(maxed.billDays, merged.billDays);
  assert.deepEqual(maxed.ledgers, merged.ledgers);
  assert.deepEqual(maxed.alerts, alerts);
  const tie = { ...second.doc.ledgers.a, at: now + 1, model: 'later' };
  assert.equal(step(merged, { type: 'import', origin: 'later', ledgers: { a: tie } }).doc.ledgers.a.model, 'later');
  assert.equal(step(merged, { ...imported, origin: 'usd', billDays: usd.doc.billDays }).doc.billDays.currency, 'CNY');
  const moreRuns = step(merged, { type: 'import', origin: 'runs-max', runDays: { v: 1, days: { [day]: { runs: 3, ms: 5000, longest: 2000 } } } }).doc;
  assert.deepEqual(moreRuns.runDays.days[day], { runs: 3, ms: 5000, longest: 3200 });
  const mixedHours = structuredClone(first.doc.billDays); mixedHours.days[day].hours[(hour + 1) % 24] = 10;
  const timingMerge = step(merged, { type: 'import', origin: 'hours-max', billDays: mixedHours }).doc;
  assert.equal(timingMerge.billDays.days[day].hours[hour], merged.billDays.days[day].hours[hour]);
  assert.equal(timingMerge.billDays.days[day].hours[(hour + 1) % 24], 10);
  assert.equal(timingMerge.billDays.days[day].offPeak, merged.billDays.days[day].offPeak);
  const old = new Date(now); old.setDate(old.getDate() - 62);
  const oldDay = localDay(old), stale = structuredClone(merged);
  stale.billDays.days[oldDay] = first.doc.billDays.days[day];
  stale.runDays.days[oldDay] = ran.doc.runDays.days[day];
  stale.ledgers.old = { ...tie, at: now - 63 * 86400000 };
  stale.ledgers.a.at = now - 63 * 86400000;
  stale.runEnds.old = now - 86400001;
  const pruned = pruneRecords(stale, now);
  assert.equal(pruned.billDays.days[oldDay], undefined);
  assert.equal(pruned.runDays.days[oldDay], undefined);
  assert.equal(pruned.ledgers.old, undefined);
  assert.ok(pruned.ledgers.a, 'dated sessions keep their old ledger');
  assert.equal(pruned.runEnds.old, undefined);
  const boundary = new Date(now); boundary.setDate(boundary.getDate() - 61);
  stale.runDays.days[localDay(boundary)] = ran.doc.runDays.days[day];
  assert.ok(pruneRecords(stale, now).runDays.days[localDay(boundary)]);

  const base = mkdtempSync(join(tmpdir(), 'rhine-records-')), root = join(base, 'sessions'), folder = join(base, 'rhine-splash'), file = join(folder, 'records.json');
  const host = (sessionRoot = root, rejection) => {
    let handler;
    const disposers = [], warnings = [];
    const register = registerStore({ get: (key) => key === 'sessionPersistence' ? (sessionRoot ? { root: sessionRoot } : undefined)
      : key === 'connection' && rejection ? { requestRejection: () => rejection } : undefined }, { warn: (...args) => warnings.push(args) });
    register({ effect: (fn) => { const cleanup = fn(); if (typeof cleanup === 'function') disposers.push(cleanup); },
      webServer: { register: (route) => { assert.equal(route.path, '/rhine-splash/records'); handler = route.handler; return () => {}; } } });
    const request = async (ops, { headers = { 'x-rhine-splash': '1' }, url = '/rhine-splash/records', raw, method = ops === undefined ? 'GET' : 'POST' } = {}) => {
      const req = Object.assign(new EventEmitter(), { method, url, headers, socket: { remoteAddress: '127.0.0.1' }, resume() {} });
      const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = value; } };
      const pending = handler(req, res);
      if (method === 'POST') { req.emit('data', Buffer.from(raw ?? JSON.stringify({ ops }))); req.emit('end'); }
      await pending;
      return { code: res.statusCode, value: res.body ? JSON.parse(res.body) : undefined };
    };
    return { request, flush: register.flush, dispose: async () => { for (const fn of disposers.splice(0).reverse()) await fn(); }, warnings };
  };
  const hosts = [];
  try {
    const a = host(), b = host(); hosts.push(a, b);
    assert.equal((await a.request(undefined, { headers: {} })).code, 403);
    const auth = host(root, 401); hosts.push(auth);
    assert.equal((await auth.request()).code, 401);
    assert.equal((await a.request(undefined, { method: 'PUT' })).code, 405);
    assert.equal((await a.request()).value.status, 'ready');
    assert.deepEqual((await a.request(undefined, { url: '/rhine-splash/records?rev=0' })).value, { status: 'ready', rev: 0, unchanged: true });
    assert.equal((await a.request(Array(201).fill(run))).code, 400);
    assert.equal((await a.request([], { raw: 'x'.repeat(512 * 1024 + 1) })).code, 413);
    assert.equal((await a.request([], { raw: '{' })).code, 400);
    assert.deepEqual((await a.request([{}, { ...usage(), hour: -1 }])).value.results, [null, null]);
    await a.request([usage(), higher]);
    await b.request([usage(), higher, usage('b')]);
    await a.flush(); await b.flush();
    let disk = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(disk.rev, 2);
    assert.equal(disk.ledgers.a.cost, second.result.ledger.cost, 'replaying superseded observations must not double count');
    assert.equal(disk.billDays.days[day].sessions.a, second.result.ledger.cost);
    assert.equal(disk.billDays.days[day].sessions.b, first.result.ledger.cost);
    assert.deepEqual((await a.request()).value.doc.ledgers, disk.ledgers, 'GET reloads other host writes');
    assert.deepEqual((await a.request(undefined, { url: '/rhine-splash/records?rev=2' })).value, { status: 'ready', rev: 2, unchanged: true });
    writeFileSync(join(folder, 'records.lock'), 'stale');
    const oldTime = new Date(now - 11000); utimesSync(join(folder, 'records.lock'), oldTime, oldTime);
    await a.request([run]); await a.flush();
    assert.equal(existsSync(join(folder, 'records.lock')), false);
    await b.request([{ ...run, endedAt: now + 500 }]); await b.flush();
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).runDays.days[day].runs, 1);
    await a.request([usage('concurrent-a')]); await b.request([usage('concurrent-b')]);
    await Promise.all([a.flush(), b.flush()]);
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).ledgers['concurrent-a']);
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).ledgers['concurrent-b']);
    await a.request([usage('lock-retry')]);
    writeFileSync(join(folder, 'records.lock'), 'held');
    const beforeBusy = readFileSync(file, 'utf8');
    await a.flush();
    assert.equal(readFileSync(file, 'utf8'), beforeBusy, 'a live lock is never stolen');
    assert.equal(readFileSync(join(folder, 'records.lock'), 'utf8'), 'held');
    rmSync(join(folder, 'records.lock'));
    await a.flush();
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).ledgers['lock-retry']);
    await a.request([usage('dispose')]); await a.dispose();
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).ledgers.dispose, 'dispose flushes queued operations');
    const unavailable = host(null); hosts.push(unavailable);
    assert.deepEqual((await unavailable.request()).value, { status: 'unavailable' });
    assert.deepEqual((await unavailable.request([run])).value, { status: 'unavailable' });
    const writeFailure = host(); hosts.push(writeFailure);
    await writeFailure.request([usage('write-failure')]);
    makeDir(join(folder, 'records.json.tmp'));
    await assert.rejects(writeFailure.flush());
    assert.deepEqual((await writeFailure.request()).value, { status: 'failed' });
    rmSync(join(folder, 'records.json.tmp'), { recursive: true });
    await writeFailure.flush();
    assert.equal((await writeFailure.request()).value.status, 'ready');
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).ledgers['write-failure']);
    const badRoot = join(base, 'blocked', 'sessions'); writeFileSync(join(base, 'blocked'), 'not a folder');
    const failed = host(badRoot); hosts.push(failed);
    assert.deepEqual((await failed.request()).value, { status: 'failed' });
    for (const raw of ['{bad', JSON.stringify({ ...emptyRecords(), billDays: { v: 1, currency: 'CNY', days: { wrong: {} } } })]) {
      writeFileSync(file, raw);
      const corrupted = host(); hosts.push(corrupted);
      assert.equal((await corrupted.request()).value.status, 'ready');
      assert.equal(corrupted.warnings.length, 1);
      const saved = readdirSync(folder).filter((name) => name.startsWith('records.json.bad-'));
      assert.ok(saved.some((name) => readFileSync(join(folder, name), 'utf8') === raw));
      assert.equal((await corrupted.request()).value.status, 'ready');
      assert.equal(corrupted.warnings.length, 1);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const pendingNewer = host(); hosts.push(pendingNewer);
    await pendingNewer.request([usage('pending-newer')]);
    const newerText = JSON.stringify({ v: 2, future: 'keep' }); writeFileSync(file, newerText);
    await assert.rejects(pendingNewer.flush(), /Newer records/);
    assert.deepEqual((await pendingNewer.request()).value, { status: 'unavailable', reason: 'newer' });
    assert.equal(readFileSync(file, 'utf8'), newerText);
    const newer = host(); hosts.push(newer);
    assert.deepEqual((await newer.request()).value, { status: 'unavailable', reason: 'newer' });
    assert.deepEqual((await newer.request([run])).value, { status: 'unavailable', reason: 'newer' });
    assert.equal(readFileSync(file, 'utf8'), newerText);
    await pendingNewer.dispose();
    disk = emptyRecords(); writeFileSync(file, JSON.stringify(disk));
  } finally { for (const instance of hosts) await instance.dispose(); rmSync(base, { recursive: true, force: true }); }
}
// A late request carrying an older observation must not rewind the ledger.
{
  const at = new Date(2026, 9, 21, 10).getTime(), day = "2026-10-21", prices = { CNY: { hit: 0.04, miss: 2, out: 8 }, USD: null };
  const usage = (miss, time) => ({ type: "usage", sessionId: "s", model: "deepseek-v4-flash", currency: "CNY", seen: { miss, hit: 0, out: 0 }, prices, peak: true, day, hour: 10, at: time });
  let doc = applyRecordOp(emptyRecords(), usage(200, at + 2000), at).doc;
  const late = applyRecordOp(doc, usage(150, at + 1000), at);
  assert.strictEqual(late.doc, doc);
  assert.equal(late.result.added, 0);
  doc = applyRecordOp(doc, usage(250, at + 3000), at).doc;
  assert.equal(doc.ledgers.s.seen.miss, 250);
  assert.ok(Math.abs(doc.billDays.days[day].models["deepseek-v4-flash"].cost - 250 * 2 / 1e6) < 1e-12);
}
console.log('Record store tests passed (pure usage/run/alerts/import, max merge/idempotency/currency/pruning, interleaved writers/deduplication/dispose, stale lock, corruption/newer preservation, auth/rev/limits/unavailable/failures).');

function localDay(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
