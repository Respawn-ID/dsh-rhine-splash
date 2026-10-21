import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { DEFAULTS } from "../lib/index.js";

const source = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const features = ["notify", "todo", "billing", "effort", "archives", "brand", "settings", "command"];
const noop = () => {};
const element = () => {
  const attributes = new Map();
  return {
    append: noop, prepend: noop, remove: noop,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name) ?? null,
    querySelector: () => null, addEventListener: noop, removeEventListener: noop,
    style: { setProperty: noop, removeProperty: noop }, dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false }
  };
};
function store(value) {
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit(next) { value = next; for (const listener of listeners) listener(); },
    listeners
  };
}

async function scenario({ config = {}, change = noop, apply = true } = {}, check = noop) {
  const timers = new Map();
  let timerId = 0, now = 0;
  const setTimer = (fn, delay = 0) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; };
  const advance = (ms) => {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, timer] = next;
      timers.delete(id);
      now = timer.at;
      timer.fn();
    }
    now = end;
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const hook = () => { throw new Error("Components must not render in client tests"); };
  const react = { Component: class { constructor(props) { this.props = props; } }, createElement: jsx, Fragment: Symbol("Fragment") };
  for (const name of ["useState", "useEffect", "useLayoutEffect", "useMemo", "useCallback", "useRef", "useSyncExternalStore"]) react[name] = hook;
  class SettingsFormModel {
    constructor(scope, specs) { this.scope = scope; this.specs = specs; this.edits = new Map(); }
    shell() { return { available: true, writable: true, dirty: this.edits.size > 0, invalid: false, saving: false, failed: false }; }
    field(key) {
      const spec = this.specs.find((entry) => entry.field === key);
      return { text: this.edits.get(key) ?? spec.format(this.scope.getSnapshot().value[key]), overridden: false };
    }
    bind(snapshot) { return { getSnapshot: snapshot, subscribe: (fn) => this.scope.subscribe(fn) }; }
    actions() { return { edit: (key, value) => this.edits.set(key, value), resetField: (key) => this.edits.delete(key) }; }
    async save() { this.edits.clear(); }
    dispose() {}
  }
  const primitives = new Proxy({
    SettingsFormModel,
    settingsNumberField: (field) => ({ field, format: (value) => String(value ?? DEFAULTS[field]), parse: (text) => ({ kind: "set", value: Number(text) }) }),
    settingsTextField: (field) => ({ field, format: (value) => value ?? DEFAULTS[field], parse: (text) => ({ kind: "set", value: text }) })
  }, { get: (target, key) => target[key] ?? noop });
  const modules = { react, "react-dom": { createPortal: (child) => child }, "react/jsx-runtime": { jsx, jsxs: jsx }, "@deepseek-ai/dsh-client-ui-primitives": primitives };
  let factory;
  const globals = {
    window: globalThis,
    document: { ...element(), createElement: element, head: element(), body: element(), documentElement: element(), visibilityState: "visible", hasFocus: () => true, getElementById: () => null },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    requestAnimationFrame: (fn) => setTimer(fn, 16), cancelAnimationFrame: (id) => timers.delete(id),
    setTimeout: setTimer, clearTimeout: (id) => timers.delete(id),
    addEventListener: noop, removeEventListener: noop,
    __RHINE_SPLASH__: { ...DEFAULTS, ...config },
    __RHINE_BRAND__: { mark: "<svg/>", name: "Rhine", hero: "<svg/>" },
    __ModuleLoader__: { load: (definition) => { factory = definition.factory; } },
    localStorage: undefined
  };
  const saved = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const warnings = [], originalWarn = console.warn;
  const disposers = [], slots = [], commands = [];
  let client, disposed = false;
  const status = store(new Map()), list = store({ phase: "ready", byId: {} });
  const selection = store({ sessionId: undefined });
  const configStore = store({ status: "ready", writable: true, value: { ...DEFAULTS, ...config } });
  const directory = { store: store({ current: null, groups: [], status: "ready" }), load: async () => {}, select: async () => {} };
  const tokenUsage = store({ uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 });
  const services = {
    slots: {
      inject(name, fn) {
        const result = fn();
        if (result?.[Symbol.iterator]) for (const disposer of result) if (typeof disposer === "function") disposers.push(disposer);
        return typeof result === "function" ? result : noop;
      },
      register(options, Component) { slots.push({ options, Component }); return noop; },
      entries: () => []
    },
    locale: { register: () => noop, bind: () => (key) => key },
    configForms: { get: () => configStore, whileServed: (keys, fn) => fn() },
    commandUi: { register(command) { commands.push(command); return noop; } },
    uiSession: { sessionStatus: status },
    uiWorkspace: { selection, openSession: noop },
    sessions: { list, subagentAddress: () => undefined, binding: () => ({ session: { projections: { faceOf: () => tokenUsage } } }) },
    workspaces: { list: store({ items: [], archivedSessionIds: [] }) },
    modelDirectories: { directoryFor: () => directory },
    remote: { session: {} }, "remote.session": {}
  };
  change(services, configStore);
  const ctx = {
    ...services,
    effect(fn) { const disposer = fn(); if (typeof disposer === "function") disposers.push(disposer); },
    inject(names, cb) { if (names.every((name) => Object.hasOwn(services, name))) cb(Object.assign(Object.create(ctx), services)); }
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const fn of disposers.reverse()) assert.doesNotThrow(fn);
    assert.deepEqual(client.internals.compat.getSnapshot(), []);
    assert.equal(status.listeners.size, 0);
    assert.equal(configStore.listeners.size, 0);
    assert.equal(timers.size, 0, "all timers cleared on dispose");
  }
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    delete globalThis.localStorage;
    console.warn = (...args) => warnings.push(args);
    vm.runInThisContext(source, { filename: "lib/client.js" });
    client = factory((name) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; });
    if (apply) assert.doesNotThrow(() => client.apply(ctx));
    await check({ ...client, slots, commands, warnings, advance, status, services, configStore, dispose });
  } finally {
    if (client) dispose();
    console.warn = originalWarn;
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

await scenario({ apply: false }, ({ internals: i, warnings }) => {
  const { FIELDS, SECTIONS, PREVIEWS, zh, en, fill, todoKind, todoAgo, todoGroups, missing, compat, safe } = i;
  const label = (locale, key) => assert.ok(typeof locale[key] === "string" && locale[key].trim(), key);
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const [key, spec] of Object.entries(FIELDS)) {
    assert.ok(Object.hasOwn(DEFAULTS, key), key);
    assert.ok(SECTIONS.includes(spec.section), key);
    for (const locale of [zh, en]) {
      label(locale, key);
      for (const choice of spec.choices || []) label(locale, (spec.label || "") + choice);
    }
    if (spec.type === "switch") assert.equal(typeof DEFAULTS[key], "boolean", key);
    if (spec.type === "choice") assert.ok(spec.choices.includes(DEFAULTS[key]), key);
  }
  for (const locale of [zh, en]) {
    for (const section of SECTIONS) label(locale, section);
    for (const feature of features) label(locale, "cf_" + feature);
    for (const entry of PREVIEWS) { label(locale, entry.page); label(locale, entry.command); }
  }
  assert.equal(fill("{a}/{b}/{a}/{missing}", { a: 0, b: false }), "0/false/0/{missing}");
  assert.equal(fill("{toString}", {}), "{toString}");
  assert.equal(todoKind({ pendingInteraction: {}, running: true, completionUnread: true }), "pending");
  assert.equal(todoKind({ running: true, completionUnread: true }), "running");
  assert.equal(todoKind({ completionUnread: true }), "done");
  for (const value of [null, undefined, {}, { running: false }]) assert.equal(todoKind(value), null);
  const t = (key) => en[key], now = Date.parse("2026-10-21T12:00:00Z");
  for (const [age, expected] of [[-1, "now"], [0, "now"], [59999, "now"], [60000, "1 min"], [3599999, "59 min"], [3600000, "1 h"], [86399999, "23 h"], [86400000, "1 d"], [172800000, "2 d"]]) {
    assert.equal(todoAgo(now - age, now, t), expected);
  }
  for (const at of [null, undefined, NaN, Infinity, "123"]) assert.equal(todoAgo(at, now, t), "");
  const rows = {
    approval: { title: "Approval", updatedAt: now - 1000 }, plan: { title: "Plan", updatedAt: new Date(now - 2000).toISOString() },
    question: { displayTitle: "Question", updatedAt: now - 3000 }, untitled: {},
    doneNumber: { updatedAt: now - 4000 }, doneISO: { updatedAt: new Date(now - 5000).toISOString() },
    running: { updatedAt: now }, timedRunning: { updatedAt: now },
    subagent: { origin: "subagent" }, blank: { blank: true }, idle: {}
  };
  const states = new Map([
    ["approval", { pendingInteraction: { kind: "approval", toolName: "shell" }, running: true }],
    ["plan", { pendingInteraction: { kind: "plan-review" } }], ["question", { pendingInteraction: { kind: "question" } }],
    ["untitled", { pendingInteraction: { kind: "approval" } }],
    ...["doneNumber", "doneISO", "subagent", "blank", "unknown"].map((id) => [id, { completionUnread: true }]),
    ["running", { running: true }], ["timedRunning", { running: true }], ["idle", {}]
  ]);
  const since = new Map([["approval", { at: now - 10000 }], ["plan", { at: now - 20000 }], ["timedRunning", { at: now - 500 }]]);
  const groups = todoGroups(states, { byId: rows }, since, now, t);
  assert.deepEqual(groups.pending.map((row) => row.id), ["question", "approval", "plan", "untitled"]);
  assert.deepEqual(groups.pending.map((row) => row.status), ["Waiting for your answer", "Waiting for approval · shell", "Plan awaiting review", "Waiting for approval"]);
  assert.equal(groups.pending[0].title, "Question");
  assert.equal(groups.pending[3].title, "Untitled conversation");
  assert.deepEqual(groups.pending.map((row) => row.at), [now - 3000, now - 10000, now - 20000, null]);
  assert.deepEqual(groups.done.map((row) => row.at), [now - 4000, now - 5000]);
  assert.deepEqual(groups.running.map((row) => [row.id, row.at]), [["timedRunning", now - 500], ["running", null]]);
  assert.equal(groups.running[1].time, "");
  assert.equal(groups.count, 6);
  assert.deepEqual(todoGroups(new Map(), { byId: {} }, new Map(), now, t), { pending: [], done: [], running: [], count: 0 });
  assert.deepEqual(missing({ a: { b: noop, c: 1 } }, ["a.b", "a.c", "a.d.subscribe", "x"]), ["a.c", "a.d.subscribe", "x"]);
  assert.deepEqual(missing(null, ["a.b"]), ["a.b"]);

  const empty = compat.getSnapshot();
  assert.strictEqual(compat.getSnapshot(), empty);
  let updates = 0;
  const unsubscribe = compat.subscribe(() => updates++);
  compat.ready("brand");
  assert.strictEqual(compat.getSnapshot(), empty);
  compat.report("todo", "missing", "api");
  const first = compat.getSnapshot();
  assert.notStrictEqual(first, empty);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first[0]));
  compat.report("todo", "crashed", "ignored");
  assert.strictEqual(compat.getSnapshot(), first);
  assert.equal(updates, 1);
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], ["rhine-splash: todo disabled (missing)", "api"]);
  const Child = () => { throw new Error("never rendered"); };
  const props = { sample: 1 };
  const wrapped = safe("billing", Child)(props);
  assert.strictEqual(wrapped.props.children.type, Child);
  assert.strictEqual(wrapped.props.children.props, props);
  const boundary = new wrapped.type(wrapped.props);
  assert.strictEqual(boundary.render(), wrapped.props.children);
  boundary.state = wrapped.type.getDerivedStateFromError(new Error("broken"));
  boundary.componentDidCatch(new Error("broken"));
  assert.equal(boundary.render(), null);
  boundary.componentDidCatch("again");
  assert.deepEqual(compat.getSnapshot(), [{ feature: "todo", reason: "missing", detail: "api" }, { feature: "billing", reason: "crashed", detail: "broken" }]);
  assert.equal(warnings.length, 2);
  unsubscribe();
  compat.reset();
  assert.equal(updates, 2);
});

const hasSlot = (slots, id) => slots.some(({ options }) => options.id === id);
const problems = (compat) => Object.fromEntries(compat.getSnapshot().map((issue) => [issue.feature, issue.reason]));
await scenario({}, async ({ slots, commands, internals: { compat }, advance }) => {
  for (const name of ["sidebar.footer.action", "conversation.input.right", "plugins.row.config", "settings.section", "sidebar.workspaces.session.menu.item", "sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark"]) {
    assert.ok(slots.some(({ options }) => options.name === name), name);
  }
  assert.ok(hasSlot(slots, "rhine-billing") && hasSlot(slots, "rhine-todo"));
  const expected = {
    "sidebar.footer.action": { "rhine-billing": "billing", "rhine-todo": "todo" },
    "conversation.input.right": "effort", "plugins.row.config": "settings", "settings.section": "archives",
    "sidebar.workspaces.session.menu.item": "archives", "sidebar.brand.mark": "brand", "sidebar.brand.name": "brand", "conversation.hero.brand.mark": "brand"
  };
  for (const { options, Component } of slots) {
    const node = Component({ probe: true });
    assert.equal(node.type.name, "SafeBoundary");
    assert.equal(node.props.feature, typeof expected[options.name] === "string" ? expected[options.name] : expected[options.name][options.id]);
    assert.equal(typeof node.props.children.type, "function");
    assert.deepEqual(node.props.children.props, { probe: true });
  }
  const settings = slots.find(({ options }) => options.name === "plugins.row.config").options.inject();
  assert.strictEqual(settings.hooks.rhineCompat, compat);
  assert.equal(typeof settings.hooks.rhineSplash.getSnapshot, "function");
  assert.deepEqual(commands.map((command) => command.name).sort(), ["splash", "todo"]);
  for (const command of commands) assert.equal(command.available({}), true);
  assert.deepEqual(await commands.find((command) => command.name === "todo").ui.options(), []);
  const splash = commands.find((command) => command.name === "splash");
  assert.ok((await splash.ui.options()).some((row) => row.id === "preview"));
  await splash.ui.onSelect({ id: "enabled:false" });
  advance(20000);
  assert.deepEqual(compat.getSnapshot(), []);
});

await scenario({ change: (services) => { delete services.uiSession; } }, ({ slots, commands, internals: { compat }, advance }) => {
  assert.ok(!hasSlot(slots, "rhine-todo"));
  assert.ok(!commands.some((command) => command.name === "todo"));
  assert.deepEqual(compat.getSnapshot(), []);
  advance(19999);
  assert.deepEqual(compat.getSnapshot(), []);
  advance(1);
  assert.deepEqual(problems(compat), { todo: "absent", notify: "absent" });
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === ""));
});
await scenario({ change: (services) => { delete services.uiSession.sessionStatus.subscribe; } }, ({ slots, commands, internals: { compat }, advance }) => {
  assert.deepEqual(problems(compat), { notify: "missing", todo: "missing" });
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === "uiSession.sessionStatus.subscribe"));
  assert.ok(!hasSlot(slots, "rhine-todo"));
  for (const id of ["rhine-billing", "rhine-effort", "rhine-delete", "archived-sessions"]) assert.ok(hasSlot(slots, id));
  assert.ok(slots.some(({ options }) => options.name === "plugins.row.config"));
  assert.ok(slots.some(({ options }) => options.name === "sidebar.brand.mark"));
  assert.deepEqual(commands.map((command) => command.name), ["splash"]);
  advance(20000);
  assert.deepEqual(problems(compat), { notify: "missing", todo: "missing" });
});
await scenario({ config: { todoCenter: false, billing: false }, change: (services) => { delete services.uiSession; } }, ({ slots, commands, internals: { compat }, advance }) => {
  assert.ok(!hasSlot(slots, "rhine-todo") && !hasSlot(slots, "rhine-billing"));
  assert.ok(!commands.some((command) => command.name === "todo"));
  advance(20000);
  assert.deepEqual(problems(compat), { notify: "absent" });
});
for (const config of [
  { notifySystem: false, notifyToast: false, notifySound: false },
  { notifyCurrent: false, notifyOthers: false, notifyAway: false }
]) await scenario({ config: { ...config, todoCenter: false, billing: false, effortSlider: false }, change: (services) => { delete services.uiSession; } }, ({ internals: { compat }, advance }) => {
  advance(20000);
  assert.deepEqual(compat.getSnapshot(), []);
});
await scenario({}, ({ status, internals: { compat }, warnings, advance }) => {
  status.getSnapshot = () => { throw new Error("status failed"); };
  assert.doesNotThrow(() => status.emit(new Map()));
  assert.deepEqual(problems(compat), { notify: "crashed", todo: "crashed" });
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === "status failed"));
  assert.doesNotThrow(() => status.emit(new Map()));
  assert.equal(warnings.length, 2);
  advance(20000);
  assert.equal(warnings.length, 2);
});
for (const [path, affected] of [
  ["sessions.binding", ["billing"]], ["sessions.subagentAddress", ["effort"]],
  ["workspaces.list.subscribe", ["archives"]], ["slots.entries", ["archives"]],
  ["configForms.whileServed", ["settings"]], ["commandUi.register", ["todo", "command"]]
]) await scenario({ change: (services) => {
  const keys = path.split("."), last = keys.pop();
  delete keys.reduce((scope, key) => scope[key], services)[last];
} }, ({ internals: { compat }, advance }) => {
  advance(20000);
  assert.deepEqual(problems(compat), Object.fromEntries(affected.map((feature) => [feature, "missing"])));
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === path));
});
await scenario({ change: (services, configStore) => { delete configStore.subscribe; } }, ({ internals: { compat }, advance }) => {
  advance(20000);
  assert.deepEqual(problems(compat), { settings: "missing", command: "missing" });
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === "configForms.get().subscribe"));
});
await scenario({ change: (services) => { delete services.uiSession; } }, ({ internals: { compat }, advance, dispose }) => {
  dispose();
  advance(20000);
  assert.deepEqual(compat.getSnapshot(), []);
});
console.log("Client tests passed (locale/default contracts, helpers, safe boundaries, full/degraded/broken/disabled services, callback failures, absence timing, disposal).");
