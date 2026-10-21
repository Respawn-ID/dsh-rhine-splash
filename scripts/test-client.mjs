import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { DEFAULTS } from "../lib/index.js";

const source = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const features = ["live", "notify", "todo", "billing", "cost", "effort", "archives", "brand", "settings", "command"];
const noop = () => {};
const element = () => {
  const attributes = new Map(), properties = new Map(), events = new Map(), children = [];
  const attributeOf = (key) => "data-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  return {
    children,
    append: (...nodes) => children.push(...nodes), prepend: (...nodes) => children.unshift(...nodes), remove: noop,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    toggleAttribute(name, force = !attributes.has(name)) { if (force) attributes.set(name, ""); else attributes.delete(name); return force; },
    hasAttribute: (name) => attributes.has(name),
    getAttribute: (name) => attributes.get(name) ?? null,
    querySelector: () => null,
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
    removeEventListener: (name, fn) => events.get(name)?.delete(fn),
    dispatch(name) { for (const fn of events.get(name) || []) fn(); },
    getAnimations: () => [],
    style: { setProperty: (key, value) => properties.set(key, String(value)), removeProperty: (key) => properties.delete(key), getPropertyValue: (key) => properties.get(key) ?? "" },
    dataset: new Proxy({}, {
      get: (_, key) => attributes.get(attributeOf(key)),
      set: (_, key, value) => { attributes.set(attributeOf(key), String(value)); return true; },
      deleteProperty: (_, key) => attributes.delete(attributeOf(key))
    }),
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

async function scenario({ config = {}, change = noop, apply = true, stored = {} } = {}, check = noop) {
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
      if (timer.repeat) timers.set(id, { ...timer, at: now + timer.repeat });
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
    async save() {
      const snapshot = this.scope.getSnapshot(), value = { ...snapshot.value };
      for (const [key, text] of this.edits) {
        const parsed = this.specs.find((spec) => spec.field === key).parse(text);
        assert.equal(parsed?.kind, "set");
        value[key] = parsed.value;
      }
      this.edits.clear();
      this.scope.emit({ ...snapshot, value });
    }
    dispose() {}
  }
  const primitives = new Proxy({
    SettingsFormModel,
    settingsNumberField: (field) => ({ field, format: (value) => String(value ?? DEFAULTS[field]), parse: (text) => ({ kind: "set", value: Number(text) }) }),
    settingsTextField: (field) => ({ field, format: (value) => value ?? DEFAULTS[field], parse: (text) => ({ kind: "set", value: text }) })
  }, { get: (target, key) => target[key] ?? noop });
  const modules = { react, "react-dom": { createPortal: (child) => child }, "react/jsx-runtime": { jsx, jsxs: jsx }, "@deepseek-ai/dsh-client-ui-primitives": primitives };
  let factory;
  const windowEvents = element();
  const notifications = [];
  const memory = new Map(Object.entries(stored));
  const globals = {
    window: globalThis,
    document: { ...element(), createElement: element, head: element(), body: element(), documentElement: element(), visibilityState: "visible", hasFocus: () => true, getElementById: () => null },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    requestAnimationFrame: (fn) => setTimer(fn, 16), cancelAnimationFrame: (id) => timers.delete(id),
    setTimeout: setTimer, clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay, repeat: delay }); return id; },
    clearInterval: (id) => timers.delete(id),
    fetch: async () => ({ ok: true, json: async () => ({ status: "no-key" }) }),
    addEventListener: windowEvents.addEventListener, removeEventListener: windowEvents.removeEventListener,
    Notification: class { static permission = "granted"; constructor(title, options) { notifications.push({ title, options }); } },
    __RHINE_SPLASH__: { ...DEFAULTS, ...config },
    __RHINE_BRAND__: { mark: "<svg/>", name: "Rhine", hero: "<svg/>", marks: { plate: "plate mark", cell: "cell mark" }, heroes: { plate: "plate hero", cell: "cell hero" } },
    __ModuleLoader__: { load: (definition) => { factory = definition.factory; } },
    localStorage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) }
  };
  const saved = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const warnings = [], originalWarn = console.warn;
  const disposers = [], slots = [], commands = [];
  let client, disposed = false, configGets = 0;
  const status = store(new Map()), list = store({ phase: "ready", byId: {} });
  const selection = store({ sessionId: undefined });
  const configStore = store({ status: "ready", writable: true, value: { ...DEFAULTS, ...config } });
  const directory = { store: store({ current: null, groups: [], status: "ready" }), load: async () => {}, select: async () => {} };
  const tokenUsage = store({ uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 });
  const services = {
    slots: {
      inject(name, fn) {
        const result = fn();
        const local = typeof result === "function" ? [result] : result?.[Symbol.iterator] ? [...result].filter((item) => typeof item === "function") : [];
        let removed = false;
        const remove = () => { if (!removed) { removed = true; local.reverse().forEach((fn) => fn()); } };
        disposers.push(remove);
        return remove;
      },
      register(options, Component) { const entry = { options, Component, active: true }; slots.push(entry); return () => { entry.active = false; }; },
      entries: () => []
    },
    locale: { register: () => noop, bind: () => (key) => key },
    configForms: { get: (id) => { assert.equal(id, "rhine-splash"); configGets++; return configStore; }, whileServed: (keys, fn) => fn() },
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
    console.warn = (...args) => warnings.push(args);
    vm.runInThisContext(source, { filename: "lib/client.js" });
    client = factory((name) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; });
    if (apply) assert.doesNotThrow(() => client.apply(ctx));
    if (apply && typeof services.configForms.get === "function") assert.equal(configGets, 1, "one shared config scope");
    const render = (Component, props) => {
      const savedHooks = { ...react };
      Object.assign(react, {
        useSyncExternalStore: (_, snapshot) => snapshot(), useCallback: (fn) => fn,
        useState: (initial) => [typeof initial === "function" ? initial() : initial, noop],
        useRef: (value) => ({ current: value }), useMemo: (fn) => fn(), useEffect: noop, useLayoutEffect: noop
      });
      try { return Component(props); } finally { Object.assign(react, savedHooks); }
    };
    const mount = (Component, props) => {
      const cells = [];
      let cursor = 0;
      return { render() {
        cursor = 0;
        const savedHooks = { ...react };
        Object.assign(react, {
          useSyncExternalStore: (_, snapshot) => snapshot(), useCallback: (fn) => fn,
          useState(initial) {
            const index = cursor++;
            if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
            return [cells[index], (value) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
          },
          useRef(value) { const index = cursor++; return cells[index] ||= { current: value }; },
          useMemo: (fn) => fn(), useEffect: noop, useLayoutEffect: noop
        });
        try { return Component(props); } finally { Object.assign(react, savedHooks); }
      } };
    };
    await check({ ...client, memory, render, mount, windowEvents, notifications, slots, commands, warnings, advance, status, services, configStore, dispose });
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
    if (["choice", "swatch"].includes(spec.type)) assert.ok(spec.choices.includes(DEFAULTS[key]), key);
    if (spec.type === "color") {
      assert.match(DEFAULTS[key], /^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      const [field, value] = spec.showIf;
      assert.ok(["choice", "swatch"].includes(FIELDS[field].type));
      assert.ok(FIELDS[field].choices.includes(value));
    }
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
await scenario({}, async ({ slots, commands, internals: { compat, FIELDS }, advance }) => {
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
  const rows = await splash.ui.options();
  assert.ok(rows.some((row) => row.id === "preview"));
  for (const row of rows) {
    const field = row.id.split(":")[0];
    if (row.group.name === "actions") assert.ok(!Object.hasOwn(row, "detail"));
    else assert.equal(row.detail, ["splash", "text"].includes(FIELDS[field].section) ? "nextLaunch" : "appliesNow");
  }
  await splash.ui.onSelect({ id: "accent:life" });
  assert.equal(document.documentElement.dataset.rlAccent, "life");
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
  assert.ok(!hasSlot(slots, "rhine-todo") && hasSlot(slots, "rhine-billing"));
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
  assert.deepEqual(problems(compat), { live: "missing", settings: "missing", command: "missing" });
  assert.ok(compat.getSnapshot().every((issue) => issue.detail === "configForms.get().subscribe"));
});
await scenario({ change: (services) => { delete services.uiSession; } }, ({ internals: { compat }, advance, dispose }) => {
  dispose();
  advance(20000);
  assert.deepEqual(compat.getSnapshot(), []);
});
await scenario({ apply: false }, ({ internals: { normalize, specs, NEXT_LAUNCH } }) => {
  assert.deepEqual(NEXT_LAUNCH, ["splash", "text"]);
  const previous = Object.freeze({ ...DEFAULTS, retained: 17 });
  const invalid = { uiTheme: "false", accent: "invalid", base: "cold", accentColor: "#1234", duration: Infinity, title: 123, unknown: 1 };
  assert.deepEqual(normalize(invalid, previous), previous);
  for (const color of ["red", "#12", "#12345", "#12345678", " #abc ", false, null]) assert.equal(normalize({ accentColor: color }, previous).accentColor, DEFAULTS.accentColor);
  const values = { uiTheme: false, accent: "custom", base: "official", accentColor: "#AbC", duration: 12, title: "Live" };
  const result = normalize(values, previous);
  assert.deepEqual(result, { ...previous, ...values });
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(normalize(null, previous), previous);
  assert.deepEqual(previous, { ...DEFAULTS, retained: 17 });
  const color = specs().find((spec) => spec.field === "accentColor");
  assert.deepEqual(color.parse(" #AbC "), { kind: "set", value: "#abc" });
  assert.equal(color.parse("#1234"), undefined);
  assert.equal(color.format(undefined), "#e46f24");
  const swatch = specs().find((spec) => spec.field === "accent");
  assert.deepEqual(swatch.parse("ocean"), { kind: "set", value: "ocean" });
  assert.equal(swatch.parse("invalid"), undefined);
});

await scenario({}, ({ configStore, internals: { live }, dispose }) => {
  const root = document.documentElement, first = live.getSnapshot();
  assert.ok(Object.isFrozen(first));
  assert.strictEqual(live.getSnapshot(), first);
  assert.equal(root.hasAttribute("data-rl-ui"), true);
  assert.equal(root.dataset.rlAccent, "rhine");
  assert.equal(root.dataset.rlBase, "warm");
  const firstHero = root.dataset.rlHero;
  let updates = 0;
  const unsubscribe = live.subscribe(() => updates++);
  const emit = (value, status = "ready") => configStore.emit({ status, writable: true, value });
  emit({ uiTheme: false }, "loading");
  assert.strictEqual(live.getSnapshot(), first);
  emit({ ...first });
  assert.strictEqual(live.getSnapshot(), first);
  assert.equal(updates, 0);
  emit({ uiTheme: false, accent: "custom", accentColor: "#123456", base: "neutral" });
  assert.equal(updates, 1);
  assert.equal(root.getAttribute("data-rl-ui"), null);
  assert.equal(root.getAttribute("data-rl-accent"), "custom");
  assert.equal(root.getAttribute("data-rl-base"), "neutral");
  assert.equal(root.style.getPropertyValue("--rl-accent-custom"), "#123456");
  const custom = live.getSnapshot();
  emit({ accentColor: "#1234" });
  assert.strictEqual(live.getSnapshot(), custom);
  assert.equal(root.style.getPropertyValue("--rl-accent-custom"), "#123456");
  emit({ uiTheme: true, accent: "ocean", base: "official" });
  assert.equal(root.hasAttribute("data-rl-ui"), true);
  assert.equal(root.dataset.rlAccent, "ocean");
  assert.equal(root.dataset.rlBase, "official");
  assert.equal(root.style.getPropertyValue("--rl-accent-custom"), "");
  assert.equal(root.dataset.rlHero, firstHero, "random background remains stable");
  emit({ heroBackground: "off" });
  assert.equal(root.dataset.rlHero, undefined);
  assert.equal(root.style.getPropertyValue("--rl-hb-label"), "");
  emit({ heroBackground: "bars", code: "LIVE" });
  assert.equal(root.dataset.rlHero, "bars");
  assert.equal(root.style.getPropertyValue("--rl-hb-label"), '"LIVE · TERMINAL READY"');
  emit({ heroBackground: "random" });
  assert.equal(root.dataset.rlHero, firstHero);
  emit({ accent: "custom", accentColor: "#abc" });
  assert.equal(root.style.getPropertyValue("--rl-accent-custom"), "#abc");
  unsubscribe();
  dispose();
  for (const name of ["data-rl-ui", "data-rl-accent", "data-rl-base", "data-rl-hero"]) assert.equal(root.getAttribute(name), null);
  assert.equal(root.style.getPropertyValue("--rl-accent-custom"), "");
  emit({ accent: "crimson" });
  assert.equal(root.dataset.rlAccent, undefined, "disposed config watch removed");
});

await scenario({ config: { billing: false, effortSlider: false, todoCenter: false, brand: false } }, ({ slots, commands, configStore, render }) => {
  for (const id of ["rhine-billing", "rhine-effort", "rhine-todo"]) {
    const entry = slots.find(({ options }) => options.id === id);
    assert.ok(entry, id);
    const child = entry.Component({}).props.children.type;
    assert.equal(render(child, { ...entry.options.inject?.("session"), wide: true, t: (key) => key }), null, id);
  }
  const todo = commands.find((command) => command.name === "todo");
  assert.equal(todo.available(), false);
  const activeHero = () => slots.filter(({ options, active }) => active && options.name === "conversation.hero.brand.mark");
  assert.equal(activeHero().length, 0);
  const mark = slots.find(({ options }) => options.name === "sidebar.brand.mark").Component({}).props.children.type;
  const name = slots.find(({ options }) => options.name === "sidebar.brand.name").Component({}).props.children.type;
  assert.notEqual(render(mark, { size: 20 }).type, "span");
  assert.notEqual(render(name, {}).type, "span");
  configStore.emit({ status: "ready", value: { todoCenter: true, brand: true, logo: "cell" } });
  assert.equal(todo.available(), true);
  assert.equal(activeHero().length, 1);
  assert.equal(render(mark, { size: 20 }).props.dangerouslySetInnerHTML.__html, "cell mark");
  assert.equal(render(name, {}).props.dangerouslySetInnerHTML.__html, "Rhine");
  const hero = activeHero()[0].Component({}).props.children.type;
  assert.equal(render(hero, { size: 100 }).props.dangerouslySetInnerHTML.__html, "cell hero");
  configStore.emit({ status: "ready", value: { logo: "plate" } });
  assert.equal(activeHero().length, 1);
  assert.equal(render(hero, { size: 100 }).props.dangerouslySetInnerHTML.__html, "plate hero");
  configStore.emit({ status: "ready", value: { todoCenter: false, brand: false } });
  assert.equal(todo.available(), false);
  assert.equal(activeHero().length, 0, "hero slot removed so Harness fallback can render");
});

await scenario({ change: (services) => { delete services.uiSession; delete services.sessions.subagentAddress; delete services.sessions.binding; } }, ({ configStore, internals: { compat }, advance }) => {
  // Explicit missing interfaces still report immediately; absent services obey the current switches.
  assert.deepEqual(problems(compat), { billing: "missing", effort: "missing" });
  configStore.emit({ status: "ready", value: { todoCenter: false, notifySystem: false, notifyToast: false, notifySound: false } });
  advance(20000);
  assert.deepEqual(problems(compat), { billing: "missing", effort: "missing" });
});
await scenario({ config: { todoCenter: false, notifySystem: false, notifyToast: false, notifySound: false }, change: (services) => { delete services.uiSession; } }, ({ configStore, internals: { compat }, advance }) => {
  configStore.emit({ status: "ready", value: { todoCenter: true, notifySystem: true } });
  advance(20000);
  assert.deepEqual(problems(compat), { todo: "absent", notify: "absent" });
});
await scenario({ config: { notifySystem: false, notifyToast: false, notifySound: false } }, ({ status, services, notifications, configStore, internals: { compat } }) => {
  assert.equal(status.listeners.size, 3, "notice, to-do and billing watch start even when channels are off");
  document.hasFocus = () => false;
  services.sessions.list.emit({ phase: "ready", byId: { a: { title: "Conversation" } } });
  const endRun = () => { status.emit(new Map([["a", { running: true }]])); status.emit(new Map([["a", { running: false }]])); };
  endRun();
  assert.equal(notifications.length, 0);
  configStore.emit({ status: "ready", value: { notifySystem: true } });
  endRun();
  assert.equal(notifications.length, 1);
  configStore.emit({ status: "ready", value: { notifyAway: false } });
  endRun();
  assert.equal(notifications.length, 1);
  configStore.emit({ status: "ready", value: { notifyAway: true, notifySystem: false } });
  endRun();
  assert.equal(notifications.length, 1);
  assert.deepEqual(compat.getSnapshot(), []);
});
await scenario({ config: { resumeEffect: "off" } }, ({ windowEvents, configStore, advance }) => {
  const back = () => { windowEvents.dispatch("blur"); advance(0); windowEvents.dispatch("focus"); advance(122); };
  const count = () => document.body.children.filter((node) => node.className === "rl-resume rl-resume--scan").length;
  back();
  assert.equal(count(), 0);
  configStore.emit({ status: "ready", value: { resumeEffect: "scan", resumeTrigger: "always" } });
  back();
  assert.equal(count(), 1);
});
await scenario({}, ({ slots, render, advance, internals: { live } }) => {
  const entry = slots.find(({ options }) => options.name === "plugins.row.config");
  const Card = entry.Component({}).props.children.type;
  const injected = entry.options.inject();
  const props = { ...injected, t: (key) => key, useRhineSplash: () => injected.hooks.rhineSplash.getSnapshot() };
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === "object" ? [node, ...nodes(node.props?.children)] : [];
  const page = () => nodes(render(Card, props));
  const radios = () => page().filter((node) => node.props?.role === "radio");
  assert.deepEqual(radios().map((node) => [node.props["data-accent"], node.props["aria-checked"], node.props.tabIndex]),
    [["rhine", true, 0], ["life", false, -1], ["ocean", false, -1], ["crimson", false, -1], ["custom", false, -1]]);
  assert.equal(page().some((node) => node.props?.type === "color"), false);
  const key = (from, key, expected) => {
    let focus = -1, prevented = false;
    radios()[from].props.onKeyDown({ key, preventDefault: () => { prevented = true; }, currentTarget: {
      parentElement: { querySelectorAll: () => radios().map((_, index) => ({ focus: () => { focus = index; } })) }
    } });
    assert.equal(prevented, true);
    assert.equal(focus, expected);
    advance(0);
    assert.equal(live.getSnapshot().accent, radios()[expected].props["data-accent"]);
  };
  key(0, "ArrowLeft", 4);
  assert.ok(page().some((node) => node.props?.type === "color"));
  key(4, "ArrowRight", 0);
  key(0, "End", 4);
  key(4, "Home", 0);
  radios()[4].props.onClick();
  advance(0);
  const color = page().find((node) => node.props?.type === "color");
  assert.equal(color.props.value, "#e46f24");
  color.props.onInput({ currentTarget: { value: "#123456" } });
  advance(249);
  assert.equal(live.getSnapshot().accentColor, "#e46f24");
  advance(1);
  assert.equal(live.getSnapshot().accentColor, "#123456");
  assert.equal(document.documentElement.style.getPropertyValue("--rl-accent-custom"), "#123456");
  injected.edit("accentColor", "#abc");
  assert.equal(page().find((node) => node.props?.type === "color").props.value, "#aabbcc");
  injected.edit("accentColor", "invalid");
  assert.equal(page().find((node) => node.props?.type === "color").props.value, "#e46f24");
  assert.equal(radios()[4].props.children[0].props.style["--rl-swatch"], undefined);
});
await scenario({ change: (services) => { delete services.uiSession; delete services.modelDirectories; } }, ({ configStore, internals: { compat }, advance }) => {
  configStore.emit({ status: "ready", value: { billing: false, effortSlider: false, todoCenter: false, notifyAway: false, notifyOthers: false, notifyCurrent: false } });
  advance(20000);
  assert.deepEqual(compat.getSnapshot(), []);
});
await scenario({}, ({ configStore, internals: { compat } }) => {
  configStore.getSnapshot = () => { throw new Error("config failed"); };
  assert.doesNotThrow(() => configStore.emit({}));
  assert.deepEqual(problems(compat), { live: "crashed" });
});

// Daily data retains dates, currencies and token splits without re-dating legacy costs.
await scenario({ apply: false }, ({ internals: i, memory }) => {
  const { dayKey, rangeDays, addToDayLog, costSummary, readDayLog, writeDayLog } = i;
  const now = new Date(2026, 9, 21, 0, 3).getTime();
  assert.equal(dayKey(now), "2026-10-21");
  assert.equal(dayKey(new Date(2026, 0, 1, 23, 59)), "2026-01-01");
  assert.deepEqual(rangeDays(new Date(2026, 0, 2), 4), ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"]);
  assert.equal(rangeDays(now, 30).length, 30);
  const empty = { v: 1, currency: "CNY", days: {} };
  assert.deepEqual(readDayLog(), empty);
  const sum = costSummary(empty, new Map([["legacy", { cost: 100 }]]), now, 7);
  assert.equal(sum.today, 0);
  assert.equal(sum.range, 0);
  assert.deepEqual(sum.models, []);
  assert.deepEqual(sum.sessions, new Map());
  assert.equal(sum.days.length, 7);
  const add = (log, day, model, sessionId, cost) => addToDayLog(log, { day, model, sessionId, cost, currency: "CNY", delta: { miss: 100, hit: 20, out: 3 } });
  let log = add(empty, "2026-10-21", "flash", "a", 2);
  log = add(log, "2026-10-21", "flash", "b", 3);
  log = add(log, "2026-10-20", "pro", "a", 5);
  log = add(log, "2026-10-01", "pro", "old", 10);
  assert.deepEqual(empty.days, {}, "immutable input");
  assert.deepEqual(log.days["2026-10-21"], { models: { flash: { cost: 5, miss: 200, hit: 40, out: 6 } }, sessions: { a: 2, b: 3 } });
  const seven = costSummary(log, new Map(), now, 7);
  assert.equal(seven.today, 5);
  assert.equal(seven.range, 10);
  assert.deepEqual(seven.days.map((row) => row.cost), [0, 0, 0, 0, 0, 5, 5]);
  assert.deepEqual(seven.sessions, new Map([["a", 7], ["b", 3]]));
  assert.deepEqual(seven.models.map(({ model, cost, share }) => [model, cost, share]), [["pro", 5, 0.5], ["flash", 5, 0.5]]);
  const thirty = costSummary(log, new Map(), now, 30);
  assert.equal(thirty.range, 20);
  assert.deepEqual(thirty.models.map(({ model, share }) => [model, share]), [["pro", 0.75], ["flash", 0.25]]);
  assert.deepEqual(thirty.models[0], { model: "pro", cost: 15, miss: 200, hit: 40, out: 6, share: 0.75 });
  const keys = rangeDays(now, 63);
  let old = add(empty, keys[0], "flash", "x", 1);
  old = add(old, keys[1], "flash", "x", 2);
  old = add(old, dayKey(now), "flash", "x", 3);
  assert.ok(!Object.hasOwn(old.days, keys[0]));
  assert.ok(Object.hasOwn(old.days, keys[1]), "62nd day is retained");
  const usd = addToDayLog(log, { day: dayKey(now), model: "flash", sessionId: "usd", currency: "USD", cost: 0.1, delta: { miss: 1, hit: 0, out: 0 } });
  assert.deepEqual(usd, { v: 1, currency: "USD", days: { "2026-10-21": { models: { flash: { cost: 0.1, miss: 1, hit: 0, out: 0 } }, sessions: { usd: 0.1 } } } });
  writeDayLog(log);
  assert.strictEqual(readDayLog(), log);
  assert.deepEqual(JSON.parse(memory.get("rhine-splash:bill-days")), log);
});
for (const value of ["{", { v: 2, currency: "CNY", days: {} }, { v: 1, currency: "EUR", days: {} }, { v: 1, currency: "CNY", days: { "2026-02-30": { models: {}, sessions: {} } } }, { v: 1, currency: "CNY", days: { "2026-10-21": { models: { flash: { cost: -1, miss: 0, hit: 0, out: 0 } }, sessions: {} } } }]) {
  await scenario({ apply: false, stored: { "rhine-splash:bill-days": typeof value === "string" ? value : JSON.stringify(value) } }, ({ internals: { readDayLog } }) => {
    assert.deepEqual(readDayLog(), { v: 1, currency: "CNY", days: {} });
  });
}

await scenario({ apply: false }, ({ internals: { specs, normalize }, memory }) => {
  for (const field of ["budgetDaily", "budgetSession"]) {
    const spec = specs().find((row) => row.field === field);
    assert.equal(spec.format(undefined), "0");
    assert.deepEqual(spec.parse(" 12.345 "), { kind: "set", value: 12.35 });
    assert.deepEqual(spec.parse(""), { kind: "set", value: 0 });
    assert.deepEqual(spec.parse("100000"), { kind: "set", value: 100000 });
    for (const value of ["-1", "NaN", "Infinity", "1e6", "100000.01", "12,34"]) assert.equal(spec.parse(value), undefined);
    for (const value of [-1, NaN, Infinity, "12.34", 100000.01, null]) assert.equal(normalize({ [field]: value })[field], 0);
    assert.equal(normalize({ [field]: 12.34 })[field], 12.34);
  }
  assert.equal(memory.size, 0);
});

await scenario({ apply: false }, ({ internals: { budgetThresholds, rangeDays }, memory }) => {
  const now = new Date(2026, 9, 21, 12).getTime();
  const args = { now, sessionId: "a", daily: 7.99, session: 7.99, budgetDaily: 10, budgetSession: 10 };
  const levels = (changes = {}) => budgetThresholds({ ...args, ...changes }).map(({ scope, level }) => [scope, level]);
  assert.deepEqual(levels(), []);
  assert.deepEqual(levels({ daily: 8, session: 8 }), [["daily", 80], ["session", 80]]);
  assert.deepEqual(levels({ daily: 9, session: 9 }), []);
  assert.deepEqual(levels({ daily: 10, session: 10 }), [["daily", 100], ["session", 100]]);
  assert.deepEqual(levels({ daily: 12, session: 12 }), []);
  assert.deepEqual(levels({ sessionId: "b", daily: 12, session: 8 }), [["session", 80]]);
  assert.deepEqual(levels({ sessionId: "jump", daily: 12, session: 12 }), [["session", 100]], "a jump past both levels alerts once");
  assert.deepEqual(levels({ sessionId: "jump", daily: 12, session: 13 }), []);
  const tomorrow = new Date(2026, 9, 22, 12).getTime();
  assert.deepEqual(levels({ now: tomorrow, daily: 8, session: 12 }), [["daily", 80]], "daily levels reset; conversation totals remain cumulative");
  assert.deepEqual(levels({ now: tomorrow, daily: 10, session: 12 }), [["daily", 100]]);
  assert.deepEqual(levels({ now: tomorrow, sessionId: "off", daily: 100, session: 100, budgetDaily: 0, budgetSession: 0 }), []);
  const state = JSON.parse(memory.get("rhine-splash:budget-alerts"));
  state.ids.stale = { day: rangeDays(now, 64)[0], levels: [80] };
  memory.set("rhine-splash:budget-alerts", JSON.stringify(state));
  levels({ now: tomorrow });
  assert.ok(!Object.hasOwn(JSON.parse(memory.get("rhine-splash:budget-alerts")).ids, "stale"));
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error("storage full"); };
  assert.deepEqual(levels({ now: tomorrow, sessionId: "memory", session: 8 }), [["session", 80]]);
  assert.deepEqual(levels({ now: tomorrow, sessionId: "memory", session: 8 }), [], "in-memory fallback avoids repeated reminders");
  localStorage.setItem = original;
});

// A loaded background face records without mounting the card or opening its session.
for (const withStatus of [true, false]) {
  let background, replacement, skipped, bindings, model;
  await scenario({ change: (services) => {
    if (!withStatus) delete services.uiSession;
    background = store({ uncachedInputTokens: 1000000, cacheReadTokens: 500, outputTokens: 100 });
    replacement = store({ uncachedInputTokens: 2000000, cacheReadTokens: 600, outputTokens: 200 });
    skipped = store({ outputTokens: 1000000 });
    const binding = (face) => ({ session: { projections: { faceOf: (name) => { assert.equal(name, "tokenUsage"); return face; } } } });
    bindings = new Map([["background", binding(background)], ["sub", binding(skipped)], ["blank", binding(skipped)]]);
    services.sessions.binding = (id) => bindings.get(id);
    services.sessions.list.emit({ phase: "ready", byId: { background: { title: "Background" }, sub: { origin: "subagent" }, blank: { blank: true }, unloaded: {} } });
    model = store({ current: { model: "deepseek-flash" } });
    services.modelDirectories.directoryFor = () => ({ store: model });
  } }, ({ internals: { readLedger, readDayLog, costSummary, usageTick }, services, status, dispose }) => {
    const ledger = readLedger("background");
    assert.ok(ledger.cost > 0);
    assert.equal(ledger.model, "deepseek-flash");
    assert.ok(Number.isFinite(ledger.at));
    assert.equal(readLedger("sub"), null);
    assert.equal(readLedger("blank"), null);
    assert.equal(readLedger("unloaded"), null);
    assert.equal(skipped.listeners.size, 0);
    assert.equal(background.listeners.size, 1);
    const before = usageTick.getSnapshot();
    const dayTotal = () => costSummary(readDayLog(), new Map(), Date.now(), 7).today;
    assert.equal(dayTotal(), ledger.cost);
    background.emit({ uncachedInputTokens: 1500000, cacheReadTokens: 500, outputTokens: 100 });
    const added = readLedger("background").cost;
    assert.ok(added > ledger.cost);
    assert.equal(dayTotal(), added);
    assert.ok(usageTick.getSnapshot() > before);
    background.emit(background.getSnapshot());
    assert.equal(dayTotal(), added, "unchanged projections cannot double count");
    bindings.set("background", { session: { projections: { faceOf: () => replacement } } });
    if (withStatus) status.emit(new Map([["background", { running: true }]]));
    else services.sessions.list.emit(services.sessions.list.getSnapshot());
    assert.equal(background.listeners.size, 0);
    assert.equal(replacement.listeners.size, 1);
    assert.ok(readLedger("background").cost > added);
    bindings.delete("background");
    services.sessions.list.emit(services.sessions.list.getSnapshot());
    assert.equal(replacement.listeners.size, 0);
    assert.equal(model.listeners.size, 0);
    dispose();
  });
}

await scenario({ apply: false, stored: { "rhine-splash:bill:old": JSON.stringify({ currency: "CNY", cost: 10, seen: { miss: 100, hit: 0, out: 0 } }) } }, ({ internals: { readLedger, recordUsage, readDayLog, costSummary } }) => {
  assert.equal(readLedger("old").model, undefined);
  recordUsage("old", { uncachedInputTokens: 100 }, "deepseek-flash", "CNY");
  assert.equal(costSummary(readDayLog(), new Map(), Date.now(), 7).today, 0);
  recordUsage("old", { uncachedInputTokens: 200 }, "deepseek-flash", "CNY");
  assert.ok(costSummary(readDayLog(), new Map(), Date.now(), 7).today > 0);
  assert.ok(costSummary(readDayLog(), new Map(), Date.now(), 7).today < 1, "legacy cumulative cost is not added to today");
});

await scenario({ config: { notifyToast: false, notifySound: false, notifyCurrent: false, notifyOthers: false, notifyAway: false, budgetDaily: 1, budgetSession: 1 }, change: (services) => {
  const templates = { budgetStatus: "Spent {spent} of {limit}", budgetNear: "{scope} at 80%", budgetOver: "{scope} at 100%" };
  services.locale.bind = () => (key) => templates[key] || key;
} }, async ({ services, notifications, internals: { compat }, slots }) => {
  document.hasFocus = () => false;
  const usage = store({ uncachedInputTokens: 1000000 });
  const binding = { session: { projections: { faceOf: () => usage } } };
  services.sessions.binding = () => binding;
  services.modelDirectories.directoryFor = () => ({ store: store({ current: { model: "deepseek-flash" } }) });
  services.sessions.list.emit({ phase: "ready", byId: { background: { title: "Budget background" } } });
  assert.equal(notifications.length, 0, "the first record is a baseline, not fresh spending");
  usage.emit({ uncachedInputTokens: 2000000 });
  assert.equal(notifications.length, 2, "daily and conversation reminders bypass scene switches; a jump past both levels alerts once");
  assert.ok(notifications.every(({ options }) => options.body.includes("¥")));
  assert.equal(notifications.filter(({ title }) => title.includes("Budget background")).length, 1);
  usage.emit(usage.getSnapshot());
  usage.emit({ uncachedInputTokens: 3000000 });
  assert.equal(notifications.length, 2, "levels already reached stay quiet");
  const billing = slots.find(({ options }) => options.id === "rhine-billing").options.inject();
  assert.equal(billing.getNavigation(), undefined);
  assert.deepEqual(compat.getSnapshot(), []);
});

await scenario({}, async ({ slots, configStore, render, internals: { live } }) => {
  const page = slots.find(({ options }) => options.name === "plugins.row.config").options.inject();
  page.edit("title", "Unsaved page title");
  const billing = slots.find(({ options }) => options.id === "rhine-billing");
  const props = billing.options.inject();
  await props.saveSetting("budgetDaily", 12.34);
  assert.equal(configStore.getSnapshot().value.budgetDaily, 12.34);
  assert.equal(live.getSnapshot().budgetDaily, 12.34);
  assert.equal(configStore.getSnapshot().value.title, DEFAULTS.title, "panel saves an isolated draft");
  assert.equal(page.hooks.rhineSplash.getSnapshot().fields.title.text, "Unsaved page title");
  const card = render(billing.Component({}).props.children.type, { ...props, wide: true, t: (key) => key });
  assert.equal(card.props.className, "rl-bill");
  assert.equal(card.props.role, "button");
  assert.equal(card.props["aria-haspopup"], "dialog");
  assert.equal(card.props["aria-expanded"], false);
  assert.equal(card.props["aria-label"], "costOpen");
});

const nodesOf = (node) => Array.isArray(node) ? node.flatMap(nodesOf) : node && typeof node === "object" ? [node, ...nodesOf(node.props?.children)] : [];
await scenario({ change: (services) => { services.pluginNavigation = { openBundle: noop }; } }, async ({ slots, services, mount, memory, configStore, internals: i }) => {
  const now = Date.now();
  services.sessions.list.emit({ phase: "ready", byId: { a: { title: "Alpha", updatedAt: now }, b: { title: "Beta", updatedAt: now }, sub: { origin: "subagent", updatedAt: now } } });
  i.recordUsage("a", { uncachedInputTokens: 1000000 }, "deepseek-flash", "CNY");
  i.recordUsage("b", { outputTokens: 1000000 }, "deepseek-v4-pro", "CNY");
  services.uiWorkspace.selection.emit({ sessionId: "a" });
  const chosen = [], opened = [];
  services.uiWorkspace.openSession = (id) => chosen.push(id);
  services.pluginNavigation.openBundle = (id) => opened.push(id);
  const entry = slots.find(({ options }) => options.id === "rhine-billing");
  const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => i.en[key] || key });
  const nodes = () => nodesOf(instance.render());
  const find = (name) => nodes().find((node) => node.props?.className === name);
  let prevented = false;
  find("rl-bill").props.onKeyDown({ key: "Enter", preventDefault: () => { prevented = true; } });
  assert.ok(prevented);
  assert.equal(find("rl-bill").props["aria-expanded"], true);
  assert.equal(find("rl-cost-pop").props.role, "dialog");
  assert.equal(find("rl-cost-pop").props["aria-label"], "Cost");
  assert.equal(nodes().filter((node) => node.props?.className === "rl-cost-bar").length, 7);
  assert.equal(nodes().filter((node) => node.props?.className === "rl-cost-conv").length, 2);
  assert.equal(nodes().filter((node) => node.props?.className === "rl-cost-budget").length, 2);
  assert.ok(nodes().some((node) => node.props?.title?.startsWith("Miss 1,000,000")));
  nodes().find((node) => node.type === "button" && node.props.children === "30 days").props.onClick();
  assert.equal(memory.get("rhine-splash:cost-range"), "30");
  assert.equal(nodes().filter((node) => node.props?.className === "rl-cost-bar").length, 30);
  assert.equal(find("rl-cost-chart").props["data-range"], 30);
  find("rl-cost-limit").props.onClick();
  let input = find("rl-cost-input");
  assert.equal(input.props["aria-label"], "Daily budget");
  input.props.onChange({ currentTarget: { value: "-1" } });
  await find("rl-cost-input").props.onBlur();
  assert.equal(find("rl-cost-input").props["aria-invalid"], true);
  assert.equal(configStore.getSnapshot().value.budgetDaily, 0);
  let stopped = false;
  find("rl-cost-input").props.onKeyDown({ key: "Escape", preventDefault: noop, stopPropagation: () => { stopped = true; } });
  assert.ok(stopped);
  assert.equal(find("rl-cost-input"), undefined);
  assert.ok(find("rl-cost-pop"), "Escape cancels an edit without closing the panel");
  find("rl-cost-limit").props.onClick();
  find("rl-cost-input").props.onChange({ currentTarget: { value: "12.345" } });
  await find("rl-cost-input").props.onBlur();
  assert.equal(configStore.getSnapshot().value.budgetDaily, 12.35);
  assert.equal(find("rl-cost-input"), undefined);
  find("rl-cost-settings").props.onClick();
  assert.deepEqual(opened, ["dsh-rhine-splash"]);
  assert.equal(find("rl-cost-pop"), undefined);
  find("rl-bill").props.onClick();
  const conversation = find("rl-cost-conv");
  const title = conversation.props.children[0].props.children;
  conversation.props.onClick();
  assert.deepEqual(chosen, [title === "Alpha" ? "a" : "b"]);
  assert.equal(find("rl-cost-pop"), undefined);
  find("rl-bill").props.onKeyDown({ key: " ", preventDefault: noop });
  find("rl-cost-pop").props.onKeyDown({ key: "Escape", preventDefault: noop });
  assert.equal(find("rl-cost-pop"), undefined);
});

await scenario({}, ({ slots, mount, internals: { en } }) => {
  const entry = slots.find(({ options }) => options.id === "rhine-billing");
  const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => en[key] || key });
  instance.render().props.onClick();
  const nodes = nodesOf(instance.render());
  assert.ok(nodes.some((node) => node.props?.className === "rl-cost-empty"));
  assert.ok(!nodes.some((node) => node.props?.className === "rl-cost-chart"));
  assert.ok(!nodes.some((node) => node.props?.className === "rl-cost-settings"));
  assert.equal(nodes.filter((node) => node.props?.className === "rl-cost-budget").length, 2);
});

await scenario({}, async ({ internals: { balance }, advance }) => {
  // Let the initial mocked request settle, then check one shared refresh and poll.
  await Promise.resolve();
  await Promise.resolve();
  let requests = 0;
  globalThis.fetch = async () => { requests++; return { ok: true, json: async () => ({ status: "ready", balances: [{ currency: "USD", total: 12, granted: 2, toppedUp: 10 }] }) }; };
  await balance.refresh();
  assert.equal(balance.getSnapshot().value.balances[0].currency, "USD");
  assert.equal(requests, 1);
  advance(4000);
  await Promise.resolve();
  assert.equal(requests, 1, "a balance response must not cause another debounced refresh");
  advance(56000);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 2);
  globalThis.fetch = async () => { throw new Error("offline"); };
  await balance.refresh();
  assert.equal(balance.getSnapshot().status, "failed");
  assert.equal(balance.getSnapshot().value.balances[0].total, 12, "a failed refresh preserves the last balance");
});

await scenario({ apply: false, stored: { "rhine-splash:budget-alerts": JSON.stringify({ day: "2026-10-20", daily: [80, 100], ids: { stale: { day: "2026-01-01", levels: [80] }, keep: { day: "2026-10-20", levels: [80] } } }) } }, ({ memory, internals: { budgetThresholds } }) => {
  const alerts = budgetThresholds({ now: new Date(2026, 9, 21).getTime(), sessionId: "keep", daily: 8, session: 10, budgetDaily: 10, budgetSession: 10 });
  assert.deepEqual(alerts.map(({ scope, level }) => [scope, level]), [["daily", 80], ["session", 100]]);
  assert.ok(!Object.hasOwn(JSON.parse(memory.get("rhine-splash:budget-alerts")).ids, "stale"));
});

console.log("Client tests passed (locale/default contracts, live config/root cleanup, accent controls, live brand/hero/notifications/resume, unconditional slots, cost/day-log/money/budget/loaded-recorder tests, helpers, safe boundaries, degraded services, absence timing, disposal).");
