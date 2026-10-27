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
    querySelector(selector) {
      const find = (nodes) => {
        for (const node of nodes) {
          if (node.className?.split(" ").includes(selector.slice(1))) return node;
          const child = find(node.children || []);
          if (child) return child;
        }
        return null;
      };
      return selector.startsWith(".") ? find(children) : null;
    },
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
    removeEventListener: (name, fn) => events.get(name)?.delete(fn),
    dispatch(name, event) { for (const fn of events.get(name) || []) fn(event); },
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

async function scenario({ config = {}, change = noop, apply = true, stored = {}, fetcher } = {}, check = noop) {
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
    window: globalThis, focus: noop,
    document: { ...element(), createElement: element, head: element(), body: element(), documentElement: element(), visibilityState: "visible", hasFocus: () => true, getElementById: () => null },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    requestAnimationFrame: (fn) => setTimer(fn, 16), cancelAnimationFrame: (id) => timers.delete(id),
    setTimeout: setTimer, clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay, repeat: delay }); return id; },
    clearInterval: (id) => timers.delete(id),
    fetch: fetcher || (async () => ({ ok: true, json: async () => ({ status: "no-key" }) })),
    addEventListener: windowEvents.addEventListener, removeEventListener: windowEvents.removeEventListener,
    Notification: class { static permission = "granted"; constructor(title, options) { notifications.push({ title, options }); } },
    __RHINE_SPLASH__: { ...DEFAULTS, ...config },
    __RHINE_BRAND__: { mark: "<svg/>", name: "Rhine", hero: "<svg/>", marks: { plate: "plate mark", cell: "cell mark" }, heroes: { plate: "plate hero", cell: "cell hero" } },
    __ModuleLoader__: { load: (definition) => { factory = definition.factory; } },
    localStorage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), get length() { return memory.size; }, key: (index) => [...memory.keys()][index] ?? null }
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
    workspaces: { list: store({ items: [], archivedSessionIds: [] }), unarchiveSession: async () => {} },
    layout: { panelInfo: store({ activePanelId: null }), selectPanel(id) { this.panelInfo.emit({ activePanelId: id }); } },
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
    assert.equal(list.listeners.size, 0);
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
    const mount = (Component, props, effects = false) => {
      const cells = [];
      let cursor = 0;
      const activeEffects = [], pendingEffects = [];
      const unmount = () => { for (const effect of activeEffects) effect?.dispose?.(); activeEffects.length = 0; };
      disposers.push(unmount);
      const effect = (fn, deps) => {
        const index = cursor++, previous = activeEffects[index];
        if (!previous || !deps || deps.some((value, i) => value !== previous.deps?.[i])) pendingEffects.push(() => {
          previous?.dispose?.();
          activeEffects[index] = { deps, dispose: fn() };
        });
      };
      return { unmount, render() {
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
          useMemo: (fn) => fn(), useEffect: effects ? effect : noop, useLayoutEffect: effects ? effect : noop
        });
        try {
          const node = Component(props);
          for (const fn of pendingEffects.splice(0)) fn();
          return node;
        } finally { Object.assign(react, savedHooks); }
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
  for (const name of ["sidebar.footer.action", "conversation.input.right", "plugins.row.config", "settings.section", "sidebar.workspaces.session.menu.item", "shell.overlay", "sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark"]) {
    assert.ok(slots.some(({ options }) => options.name === name), name);
  }
  assert.ok(hasSlot(slots, "rhine-billing") && hasSlot(slots, "rhine-todo"));
  const expected = {
    "sidebar.footer.action": { "rhine-billing": "billing", "rhine-todo": "todo" },
    "main": "cost", "sidebar.session.row.hover": "todo",
    "conversation.input.right": "effort", "plugins.row.config": "settings", "settings.section": { "archived-sessions": "archives", "rhine-splash": "settings" },
    "sidebar.workspaces.session.menu.item": "archives", "shell.overlay": { "rhine-delete-confirm": "archives", "rhine-whats-new": "whatsNew" }, "sidebar.brand.mark": "brand", "sidebar.brand.name": "brand", "conversation.hero.brand.mark": "brand"
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

// A session without a scope yet: the slider hides instead of throwing (dsh retires entries whose inject throws).
await scenario({ change: (services) => { services.modelDirectories.directoryFor = () => { throw new Error('session "x" resolved no scope'); }; } }, ({ slots }) => {
  const effort = slots.find(({ options }) => options.id === "rhine-effort");
  const value = effort.options.inject("x");
  assert.equal(value.available, false);
  assert.strictEqual(value.directory.getSnapshot(), value.directory.getSnapshot());
  assert.deepEqual(value.directory.getSnapshot().groups, []);
});

// Instant (即答): one click sets effort "off" and the next returns to the level used before.
await scenario({}, ({ slots, render, memory, windowEvents, internals: { instantBack, en } }) => {
  const efforts = [{ id: "off" }, { id: "low" }, { id: "high" }, { id: "max" }];
  assert.equal(instantBack(efforts, "high", "max"), "max");
  assert.equal(instantBack(efforts, "high", "off"), "high", "never back to off");
  assert.equal(instantBack(efforts, "high", "xhigh"), "high", "a level this model lacks falls back to its default");
  assert.equal(instantBack(efforts, "off", undefined), "low");
  assert.equal(instantBack([{ id: "off" }], "off", undefined), undefined);

  const Control = slots.find(({ options }) => options.id === "rhine-effort").Component({}).props.children.type;
  const selected = [];
  const snapshot = { status: "ready", current: { provider: "deepseek", model: "v4", reasoningEffort: "max" },
    groups: [{ id: "deepseek", models: [{ id: "v4", reasoning: { efforts, defaultEffort: "high" } }] }] };
  const props = { available: true, load: noop, t: (key) => en[key],
    directory: { getSnapshot: () => snapshot, subscribe: () => noop },
    select: async ({ reasoningEffort }) => { selected.push(reasoningEffort); snapshot.current = { ...snapshot.current, reasoningEffort }; } };
  const instant = () => render(Control, props).props.children[0];
  assert.equal(instant().props.className, "rl-eff-instant");
  assert.equal(instant().props["aria-pressed"], false);
  instant().props.onClick();
  assert.deepEqual(selected, ["off"]);
  assert.equal(instant().props["aria-pressed"], true, "lit while thinking is off");
  assert.deepEqual(JSON.parse(memory.get("rhine-splash:instant-back")), { "deepseek/v4": "max" });
  instant().props.onClick();
  assert.deepEqual(selected, ["off", "max"], "back to the level used before");
  // The slider reaching "off" is the same state; turning Instant off then uses the remembered level.
  snapshot.current = { ...snapshot.current, reasoningEffort: "off" };
  assert.equal(instant().props["aria-pressed"], true);
  memory.delete("rhine-splash:instant-back");
  instant().props.onClick();
  assert.equal(selected.at(-1), "high", "nothing remembered: the model's default");
  // A model that cannot turn thinking off shows no Instant button.
  snapshot.groups[0].models[0].reasoning = { efforts: [{ id: "low" }, { id: "high" }], defaultEffort: "high" };
  snapshot.current = { ...snapshot.current, reasoningEffort: "high" };
  assert.equal(render(Control, props).props.children[0], null);
  // Alt+T with no control on screen does nothing (and never swallows the key).
  assert.doesNotThrow(() => windowEvents.dispatch("keydown", { altKey: true, code: "KeyT", preventDefault() { throw new Error("swallowed"); } }));
});

// Answer now (立即回答): switch to "off", stop the reply, follow up once idle, restore after the answer.
await scenario({ change: (services) => {
  const efforts = [{ id: "off" }, { id: "low" }, { id: "high" }, { id: "max" }];
  const directory = store({ status: "ready", current: { provider: "deepseek", model: "v4", reasoningEffort: "max" },
    groups: [{ id: "deepseek", models: [{ id: "v4", reasoning: { efforts, defaultEffort: "high" } }] }] });
  const calls = [];
  const rules = [];
  services.answerTest = { calls, directory, rules };
  services.uiConversation = { userText: { register(rule) { rules.push(rule); return () => rules.splice(rules.indexOf(rule), 1); } } };
  services.modelDirectories.directoryFor = () => ({ store: directory, load: async () => {}, select: async ({ reasoningEffort }) => {
    calls.push(["select", reasoningEffort]);
    directory.emit({ ...directory.getSnapshot(), current: { ...directory.getSnapshot().current, reasoningEffort } });
  } });
  const binding = services.sessions.binding;
  services.sessions.binding = (id) => ({ session: { ...binding(id).session,
    cancel: async () => { calls.push(["cancel"]); return { ok: true }; },
    prompt: async (content, mode) => { calls.push(["prompt", content[0].text, mode]); return { ok: true }; } } });
} }, async ({ slots, render, status, services, internals: { ANSWER_MARK, AnswerNowMark } }) => {
  const { calls, directory, rules } = services.answerTest;
  const entry = slots.find(({ options }) => options.id === "rhine-answer-now");
  assert.equal(entry.options.order, -1, "left of the effort control");
  const Button = entry.Component({}).props.children.type;
  const props = { ...entry.options.inject("s1"), t: (key) => key };
  assert.equal(render(Button, props), null, "nothing while idle");
  status.emit(new Map([["s1", { running: true, pendingInteraction: { kind: "approval" } }]]));
  assert.equal(render(Button, props), null, "nothing while waiting for the user");
  status.emit(new Map([["s1", { running: true }]]));
  const button = render(Button, props);
  assert.equal(button.props.className, "rl-answer-now");
  await button.props.onClick();
  assert.deepEqual(calls, [["select", "off"], ["cancel"]], "off first, so the follow-up's request skips thinking");
  assert.equal(render(Button, props), null, "hidden while answering");
  status.emit(new Map([["s1", { running: false }]]));
  assert.deepEqual(calls.at(-1), ["prompt", ANSWER_MARK + "answerNowPrompt", "queue"], "the follow-up waits for the stop");
  status.emit(new Map([["s1", { running: true }]]));
  assert.equal(calls.length, 3);
  status.emit(new Map([["s1", { running: false }]]));
  assert.deepEqual(calls.at(-1), ["select", "max"], "the previous level comes back once the answer ends");
  // A level changed by hand in the meantime is left alone.
  status.emit(new Map([["s1", { running: true }]]));
  await render(Button, props).props.onClick();
  status.emit(new Map([["s1", { running: false }]]));
  status.emit(new Map([["s1", { running: true }]]));
  directory.emit({ ...directory.getSnapshot(), current: { ...directory.getSnapshot().current, reasoningEffort: "low" } });
  status.emit(new Map([["s1", { running: false }]]));
  assert.deepEqual(calls.slice(-1), [["prompt", ANSWER_MARK + "answerNowPrompt", "queue"]], "no restore over the user's own choice");
  // The follow-up is hidden: a user-text rule claims the marked message and renders a hidden marker.
  const [rule] = rules;
  assert.equal(rule.id, "rhine-answer-now");
  assert.deepEqual(rule.match(ANSWER_MARK + "answerNowPrompt", 0), { id: "rhine-answer-now", start: 0, end: ANSWER_MARK.length + 15, data: {} });
  assert.equal(rule.match("answerNowPrompt", 0), undefined, "a message typed by hand stays visible");
  assert.equal(rule.match("x" + ANSWER_MARK, 1), undefined);
  assert.ok(slots.some(({ options }) => options.name === "conversation.user.text.node" && options.key === "rhine-answer-now"));
  const mark = AnswerNowMark();
  assert.equal(mark.props.hidden, true);
  assert.equal(mark.props["data-rl-answer-now"], "");
});

// Deleting archived conversations: the menu raises one warning dialog, which deletes on confirm.
await scenario({ change: (services) => {
  services.workspaces.list = store({ items: [], archivedSessionIds: ["s1", "s2", "s3"] });
  services.sessions.list = store({ phase: "ready", byId: { s1: { title: "First" }, s2: { displayTitle: "Second" }, s3: {} } });
} }, async ({ slots, mount, render, services, advance, internals: { deleteRequest, en } }) => {
  const t = (key) => en[key];
  const inner = (name) => slots.find(({ options }) => options.name === name && (name !== "shell.overlay" || options.id === "rhine-delete-confirm")).Component({}).props.children.type;
  const item = slots.find(({ options }) => options.id === "rhine-delete");
  const menuProps = { ...item.options.inject(), t, useMenuOpenState: () => [true, (open) => { menuOpen = open; }] };
  let menuOpen = true;
  const MenuItem = inner("sidebar.workspaces.session.menu.item"), Dialog = inner("shell.overlay");
  assert.equal(render(MenuItem, { ...menuProps, sessionId: "unarchived" }), null);
  const row = render(MenuItem, { ...menuProps, sessionId: "s1" });
  assert.equal(row.props.danger, true);
  assert.equal(row.props.children, en.delSession);
  assert.equal(render(Dialog, { t }), null);
  row.props.onSelect();
  assert.equal(menuOpen, false, "the menu closes; the dialog lives in shell.overlay");
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push([url, init.headers["x-rhine-splash"], JSON.parse(init.body).sessionId]);
    const status = { s1: "deleted", s2: "scheduled", s3: "missing" }[JSON.parse(init.body).sessionId];
    return { ok: true, json: async () => ({ status }) };
  };
  const open = (props) => {
    const node = render(Dialog, props);
    const form = mount(node.type, node.props);
    return { form, modal: () => form.render() };
  };
  let { modal } = open({ t });
  const dialog = modal();
  assert.equal(dialog.props.title, en.delTitle);
  assert.equal(dialog.props.description, "“First” will be deleted permanently. This cannot be undone.");
  const [cancel, confirm] = dialog.props.footer.props.children;
  assert.equal(cancel.props.autoFocus, true, "focus starts on Cancel");
  assert.equal(confirm.props.className, "rl-danger-action");
  cancel.props.onClick();
  assert.equal(deleteRequest.getSnapshot(), null);
  assert.equal(requests.length, 0, "cancel deletes nothing");
  row.props.onSelect();
  ({ modal } = open({ t }));
  await modal().props.footer.props.children[1].props.onClick();
  assert.deepEqual(requests, [["/rhine-splash/sessions/delete", "1", "s1"]]);
  assert.equal(deleteRequest.getSnapshot(), null);
  assert.equal(render(MenuItem, { ...menuProps, sessionId: "s1" }), null, "a deleted row hides at once");

  let settled;
  deleteRequest.open({ ids: ["s2", "s3"], onSettled: (results) => { settled = results; } });
  ({ modal } = open({ t }));
  assert.equal(modal().props.description, "The 2 selected conversations will be deleted permanently. This cannot be undone.");
  const pending = modal().props.footer.props.children[1].props.onClick();
  assert.equal(modal().props.footer.props.children[0].props.disabled, true, "no cancel while deleting");
  await pending;
  assert.deepEqual([...settled], [["s2", "scheduled"], ["s3", "missing"]]);
  assert.equal(render(MenuItem, { ...menuProps, sessionId: "s2" }), null, "a scheduled row hides like a deleted one");
  assert.deepEqual(requests.slice(1).map((request) => request[2]), ["s2", "s3"]);
  advance(5000);
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
  for (const id of ["rhine-billing", "rhine-effort", "rhine-delete", "rhine-delete-confirm", "archived-sessions"]) assert.ok(hasSlot(slots, id));
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
  assert.deepEqual(problems(compat), { todo: "absent", notify: "absent" });
});
for (const config of [
  { notifySystem: false, notifyToast: false, notifySound: false },
  { notifyCurrent: false, notifyOthers: false, notifyAway: false }
]) await scenario({ config: { ...config, todoCenter: false, rowStatus: false, billing: false, effortSlider: false }, change: (services) => { delete services.uiSession; } }, ({ internals: { compat }, advance }) => {
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
  ["workspaces.list.subscribe", ["archives"]], ["slots.entries", ["archives", "settings"]],
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
  assert.equal(root.getAttribute("data-rl-rows"), "on");
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
  assert.equal(root.getAttribute("data-rl-rows"), null);
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
  emit({ rowStatus: false });
  assert.equal(root.getAttribute("data-rl-rows"), null);
  emit({ rowStatus: true });
  assert.equal(root.getAttribute("data-rl-rows"), "on");
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
  for (const name of ["data-rl-ui", "data-rl-rows", "data-rl-accent", "data-rl-base", "data-rl-hero"]) assert.equal(root.getAttribute(name), null);
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
  configStore.emit({ status: "ready", value: { todoCenter: false, rowStatus: false, notifySystem: false, notifyToast: false, notifySound: false } });
  advance(20000);
  assert.deepEqual(problems(compat), { billing: "missing", effort: "missing" });
});
await scenario({ config: { todoCenter: false, notifySystem: false, notifyToast: false, notifySound: false }, change: (services) => { delete services.uiSession; } }, ({ configStore, internals: { compat }, advance }) => {
  configStore.emit({ status: "ready", value: { todoCenter: true, notifySystem: true } });
  advance(20000);
  assert.deepEqual(problems(compat), { todo: "absent", notify: "absent" });
});
await scenario({ config: { notifySystem: false, notifyToast: false, notifySound: false } }, ({ status, services, notifications, configStore, internals: { compat } }) => {
  assert.equal(status.listeners.size, 4, "notice, to-do, billing and answer-now watch start even when channels are off");
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
// The Windows desktop app sends system notices through the host, not Electron's web notifications.
{
  const savedLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", { configurable: true, writable: true, value: { protocol: "dsh-app:" } });
  try {
    await scenario({ config: { notifyToast: false, notifySound: false } }, ({ status, services, notifications }) => {
      const sent = [];
      globalThis.fetch = async (url, init) => { sent.push([url, init.method, init.headers["x-rhine-splash"], JSON.parse(init.body)]); return { ok: true, json: async () => ({ status: "shown" }) }; };
      document.documentElement.dataset = { platform: "win32" };
      document.hasFocus = () => false;
      services.sessions.list.emit({ phase: "ready", byId: { a: { title: "Conversation" } } });
      status.emit(new Map([["a", { running: true }]]));
      status.emit(new Map([["a", { running: false }]]));
      assert.equal(notifications.length, 0, "no Electron notification on Windows desktop");
      assert.deepEqual(sent, [["/rhine-splash/notify", "POST", "1", { title: "Conversation", body: "ntfDone", tag: "a" }]]);
      document.documentElement.dataset = { platform: "darwin" };
      status.emit(new Map([["a", { running: true }]]));
      status.emit(new Map([["a", { running: false }]]));
      assert.equal(notifications.length, 1, "other desktop platforms keep web notifications");
      assert.equal(sent.length, 1);
    });
  } finally {
    if (savedLocation) Object.defineProperty(globalThis, "location", savedLocation); else delete globalThis.location;
  }
}
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
  configStore.emit({ status: "ready", value: { billing: false, effortSlider: false, todoCenter: false, rowStatus: false, notifyAway: false, notifyOthers: false, notifyCurrent: false } });
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
  for (const field of ["budgetDaily", "budgetSession", "balanceAlert"]) {
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
  assert.equal(slots.find(({ options }) => options.name === "main").options.inject().getNavigation(), undefined);
  assert.deepEqual(compat.getSnapshot(), []);
});

await scenario({}, async ({ slots, configStore, render, internals: { live } }) => {
  const page = slots.find(({ options }) => options.name === "plugins.row.config").options.inject();
  page.edit("title", "Unsaved page title");
  const billing = slots.find(({ options }) => options.id === "rhine-billing");
  const props = billing.options.inject();
  await slots.find(({ options }) => options.name === "main").options.inject().saveSetting("budgetDaily", 12.34);
  assert.equal(configStore.getSnapshot().value.budgetDaily, 12.34);
  assert.equal(live.getSnapshot().budgetDaily, 12.34);
  assert.equal(configStore.getSnapshot().value.title, DEFAULTS.title, "panel saves an isolated draft");
  assert.equal(page.hooks.rhineSplash.getSnapshot().fields.title.text, "Unsaved page title");
  const card = render(billing.Component({}).props.children.type, { ...props, wide: true, t: (key) => key });
  assert.equal(card.props.className, "rl-bill");
  assert.equal(card.props.role, "button");
  assert.equal(card.props["aria-haspopup"], "dialog");
  assert.equal(card.props["aria-expanded"], false);
  assert.equal(card.props["aria-current"], undefined);
  assert.equal(card.props["aria-label"], "costOpen");
});

const nodesOf = (node) => Array.isArray(node) ? node.flatMap(nodesOf) : node && typeof node === "object" ? [node, ...nodesOf(node.props?.children)] : [];
await scenario({ config: { costOpen: "page" }, change: (services) => { services.pluginNavigation = { openBundle: noop }; } }, async ({ slots, services, mount, render, configStore, internals: i }) => {
  const entry = slots.find(({ options }) => options.id === "rhine-billing");
  const page = slots.find(({ options }) => options.name === "main");
  assert.equal(page.options.key, "rhine-cost");
  assert.equal(page.options.locale, "rhineSplash");
  assert.equal(page.Component({}).props.feature, "cost");
  const props = page.options.inject();
  const pageNode = render(page.Component({}).props.children.type, { ...props, t: (key) => i.en[key] || key });
  assert.equal(pageNode.props.className, "rl-cp");
  const pageNodes = nodesOf(pageNode);
  assert.ok(pageNodes.some((node) => node.type === "h1" && node.props.children === i.en.costTitle));
  assert.deepEqual(pageNodes.filter((node) => node.props?.["aria-pressed"] !== undefined && [i.en.costToday, i.en.costRange7, i.en.costRange30, i.en.cpRange62].includes(node.props.children)).map((node) => node.props["aria-pressed"]), [false, true, false, false]);
  assert.ok(pageNodes.some((node) => node.props?.className === "rl-cp-empty" && node.props.children === i.en.cpNoData));
  const backButton = pageNodes.find((node) => node.props?.className === "rl-cp-back");
  services.layout.selectPanel("rhine-cost");
  backButton.props.onClick();
  assert.equal(services.layout.panelInfo.getSnapshot().activePanelId, null);
  assert.strictEqual(props.sessions, services.sessions);
  assert.strictEqual(props.workspaces, services.workspaces);
  assert.strictEqual(props.panelInfo, services.layout.panelInfo);
  assert.strictEqual(props.getNavigation(), services.pluginNavigation);
  await props.saveSetting("budgetDaily", 12.35);
  assert.equal(configStore.getSnapshot().value.budgetDaily, 12.35);
  const selected = [], original = services.layout.selectPanel.bind(services.layout);
  services.layout.selectPanel = (id) => { selected.push(id); original(id); };
  const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => i.en[key] || key });
  let card = instance.render();
  assert.equal(card.props.className, "rl-bill");
  card.props.onClick();
  card = instance.render();
  assert.equal(card.props["data-open"], "true");
  assert.equal(card.props["aria-current"], "page");
  assert.equal(card.props["aria-haspopup"], undefined);
  assert.equal(card.props["aria-expanded"], undefined);
  assert.ok(!nodesOf(card).some((node) => node.props?.className === "rl-cost-pop"));
  card.props.onClick();
  assert.deepEqual(selected, ["rhine-cost", null]);
  assert.equal(instance.render().props["aria-current"], undefined);
  for (const key of ["Enter", " "]) {
    let prevented = false;
    instance.render().props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
    assert.ok(prevented);
  }
  assert.deepEqual(selected.slice(2), ["rhine-cost", null]);
  instance.render().props.onClick();
  props.back();
  assert.equal(services.layout.panelInfo.getSnapshot().activePanelId, null);
});

// The page reads the dated log: figures, the per-day columns, the table twin and conversation rows.
{
  const day = (back) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - back); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  const flash = (cost) => ({ cost, miss: 100000, hit: 900000, out: 20000 });
  const days = {
    [day(0)]: { models: { "deepseek-v4-flash": flash(1.5), "deepseek-v4-pro": flash(0.5) }, sessions: { a: 1.2, gone: 0.8 }, hours: Array.from({ length: 24 }, (_, h) => h === 10 ? 2 : 0), peak: 2, offPeak: 0 },
    [day(3)]: { models: { "deepseek-v4-flash": flash(1) }, sessions: { b: 1 } },
    [day(9)]: { models: { "deepseek-v4-flash": flash(4) }, sessions: { a: 4 } }
  };
  await scenario({
    config: { budgetDaily: 1.8, budgetSession: 3 },
    stored: { "rhine-splash:bill-days": JSON.stringify({ v: 1, currency: "CNY", days }), "rhine-splash:bill:a": JSON.stringify({ seen: { miss: 0, hit: 0, out: 0 }, cost: 5.2, currency: "CNY", model: "deepseek-v4-flash", at: 1 }) },
    change: (services) => {
      services.sessions.list = store({ phase: "ready", byId: { a: { title: "Alpha", updatedAt: Date.now() }, b: { title: "Beta", cwd: "/x/proj" } } });
      services.workspaces.list = store({ items: [{ workspaceId: "w", title: "Main", path: "/x/main", sessionIds: ["a"] }], archivedSessionIds: [] });
    }
  }, ({ slots, mount, internals: i }) => {
    const page = slots.find(({ options }) => options.name === "main");
    const view = mount(page.Component({}).props.children.type, { ...page.options.inject(), t: (key) => i.en[key] || key });
    let nodes = nodesOf(view.render());
    const tiles = nodes.filter((node) => node.props?.className === "rl-cp-kpi").map((node) => node.props["data-kind"]);
    assert.deepEqual(tiles, ["total", "average", "cache", "offpeak", "balance"]);
    const value = (kind) => nodesOf(nodes.find((node) => node.props?.className === "rl-cp-kpi" && node.props["data-kind"] === kind)).find((node) => node.props?.className === "rl-cp-kpi-v").props.children;
    assert.equal(value("total"), "¥3.00");
    assert.equal(value("offpeak"), "¥0.00");
    const chart = nodes.find((node) => node.type?.name === "CostColumns" && node.props.columns.length === 7);
    assert.equal(chart.props.columns.at(-1).total, 2);
    assert.deepEqual(chart.props.columns.at(-1).parts, { 1: 1.5, 2: 0.5 });
    assert.equal(chart.props.threshold, 1.8);
    assert.deepEqual(chart.props.series.map((entry) => entry.slot), [1, 2]);
    const rows = nodes.filter((node) => node.type === "tr" && node.key);
    assert.deepEqual(rows.filter((row) => ["a", "b", "gone"].includes(row.key)).map((row) => row.key), ["a", "b", "gone"]);
    assert.ok(nodes.some((node) => node.props?.className === "rl-cp-gone" && node.props.children === i.en.cpDeleted));
    const meter = nodes.find((node) => node.props?.className === "rl-cp-meter");
    assert.equal(meter.props["data-state"], "over");
    nodes.find((node) => node.props?.["aria-pressed"] === false && node.props.children === i.en.cpTable).props.onClick();
    nodes = nodesOf(view.render());
    assert.equal(nodes.find((node) => node.type?.name === "CostColumns" && node.props.columns.length === 7).props.table, true);
    nodes.find((node) => node.props?.children === i.en.costToday && node.props["aria-pressed"] === false).props.onClick();
    nodes = nodesOf(view.render());
    assert.ok(nodes.some((node) => node.type?.name === "CostColumns" && node.props.columns.length === 24 && node.props.threshold === 0));
  });
}

for (const path of ["layout", "layout.selectPanel", "layout.panelInfo.getSnapshot", "layout.panelInfo.subscribe"]) await scenario({ change: (services) => {
  const keys = path.split("."), last = keys.pop();
  delete keys.reduce((scope, key) => scope[key], services)[last];
} }, ({ slots, render, advance, internals: { compat } }) => {
  const entry = slots.find(({ options }) => options.id === "rhine-billing");
  assert.ok(!slots.some(({ options }) => options.name === "main"));
  if (path === "layout") {
    // The service may still arrive; only the absence check reports it.
    assert.equal(problems(compat).cost, undefined);
    advance(20000);
    assert.equal(problems(compat).cost, "absent");
  } else {
    assert.equal(problems(compat).cost, "missing");
    assert.ok(compat.getSnapshot().find((issue) => issue.feature === "cost").detail.includes(path));
  }
  const card = render(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => key });
  assert.equal(card.props.className, "rl-bill");
  // Without the page the card falls back to the small panel, which has no page link.
  assert.equal(card.props.role, "button");
  assert.equal(card.props["aria-haspopup"], "dialog");
  assert.equal(card.props["aria-current"], undefined);
});

// costOpen "popup": the card opens the small panel; its chart and "Full page" open the cost page.
{
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const days = { [key]: { models: { "deepseek-v4-flash": { cost: 1, miss: 10, hit: 20, out: 5 } }, sessions: { a: 1 } } };
  await scenario({ config: { costOpen: "popup" }, stored: { "rhine-splash:bill-days": JSON.stringify({ v: 1, currency: "CNY", days }) } }, ({ slots, services, mount, internals: i }) => {
    const entry = slots.find(({ options }) => options.id === "rhine-billing");
    const selected = [], original = services.layout.selectPanel.bind(services.layout);
    services.layout.selectPanel = (id) => { selected.push(id); original(id); };
    const view = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => i.en[key] || key });
    let card = view.render();
    assert.equal(card.props.className, "rl-bill");
    assert.equal(card.props["aria-haspopup"], "dialog");
    assert.equal(card.props["aria-expanded"], false);
    card.props.onClick();
    assert.deepEqual(selected, [], "the card itself does not open the page");
    let tree = view.render();
    const [trigger, panel] = tree.props.children;
    assert.equal(trigger.props["aria-expanded"], true);
    assert.equal(panel.props.className, "rl-cost-pop");
    let nodes = nodesOf(panel);
    const chart = nodes.find((node) => node.props?.className === "rl-cost-chart");
    assert.equal(chart.props.role, "button");
    assert.equal(chart.props.title, i.en.costChartOpen);
    let prevented = false;
    chart.props.onKeyDown({ key: "Enter", preventDefault: () => { prevented = true; } });
    assert.ok(prevented);
    assert.deepEqual(selected, ["rhine-cost"]);
    assert.equal(view.render().props.className, "rl-bill", "opening the page closes the panel");
    view.render().props.onClick();
    nodes = nodesOf(view.render().props.children[1]);
    nodes.find((node) => node.props?.children === i.en.costMore).props.onClick();
    assert.deepEqual(selected, ["rhine-cost", "rhine-cost"]);
  });
}
await scenario({ change: (services) => { delete services.workspaces; } }, ({ slots }) => {
  const page = slots.find(({ options }) => options.name === "main");
  assert.equal(page.options.inject().workspaces, null);
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

// Unarchive preserves row order, retains failures and needs no confirmation.
await scenario({ change: (services) => {
  services.workspaces.list.emit({ items: [], archivedSessionIds: ["a", "b", "c"] });
  services.sessions.list.emit({ phase: "ready", byId: { a: { updatedAt: 1 }, b: { updatedAt: 3 }, c: { updatedAt: 2 } } });
} }, async ({ slots, mount, services, advance, internals: { en, deleteRequest } }) => {
  const entry = slots.find(({ options }) => options.id === "archived-sessions");
  const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), t: (key) => en[key] });
  const nodes = () => nodesOf(instance.render());
  const button = (danger = false) => nodes().find((node) => node.props?.className === (danger ? "rl-arc-btn rl-arc-btn--danger" : "rl-arc-btn"));
  assert.equal(button().props.disabled, true);
  nodes().find((node) => node.type === "input").props.onChange();
  const called = [];
  let resolve;
  services.workspaces.unarchiveSession = async (id) => {
    called.push(id);
    if (id === "b") await new Promise((done) => { resolve = done; });
    if (id === "c") throw new Error("unarchive refused");
  };
  const pending = button().props.onClick();
  assert.deepEqual(called, ["b"]);
  assert.equal(deleteRequest.getSnapshot(), null);
  assert.equal(button().props.disabled, true);
  assert.equal(button(true).props.disabled, true);
  assert.ok(nodes().filter((node) => node.type === "input").every((node) => node.props.disabled));
  resolve();
  await pending;
  assert.deepEqual(called, ["b", "c", "a"]);
  assert.equal(button().props.children, "Unarchive (1)");
  const rows = nodes().filter((node) => node.props?.className === "rl-arc-row");
  assert.deepEqual(rows.map((row) => row.props.children[0].props.checked), [false, true, false]);
  assert.equal(rows[1].props["data-state"], "failed");
  assert.equal(rows[1].props.children[2].props.children, en.arcRestoreFailed);
  const host = document.body.children.find((node) => node.className === "rl-toast-host");
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].textContent, "Unarchived 2 conversations, 1 not deleted");
  assert.equal(host.children[0].dataset.tone, "warn");
  services.workspaces.unarchiveSession = async (id) => { called.push(id); };
  await button().props.onClick();
  assert.deepEqual(called, ["b", "c", "a", "c"]);
  assert.equal(button().props.children, "Unarchive (0)");
  assert.equal(host.children[1].textContent, "Unarchived 1 conversations");
  assert.equal(host.children[1].dataset.tone, "ok");
  advance(5000);
});
await scenario({ change: (services) => {
  services.workspaces.list.emit({ items: [], archivedSessionIds: ["a"] });
} }, async ({ slots, mount, services }) => {
  const entry = slots.find(({ options }) => options.id === "archived-sessions");
  const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), t: (key) => key }, true);
  let resolve;
  services.workspaces.unarchiveSession = () => new Promise((done) => { resolve = done; });
  nodesOf(instance.render()).find((node) => node.type === "input").props.onChange();
  const pending = nodesOf(instance.render()).find((node) => node.props?.className === "rl-arc-btn").props.onClick();
  instance.unmount();
  resolve();
  await pending;
  assert.ok(!document.body.children.some((node) => node.className === "rl-toast-host"));
});
await scenario({ change: (services) => { delete services.workspaces.unarchiveSession; } }, ({ slots, internals: { compat } }) => {
  assert.equal(problems(compat).archives, "missing");
  assert.equal(compat.getSnapshot().find((issue) => issue.feature === "archives").detail, "workspaces.unarchiveSession");
  assert.ok(!slots.some(({ options }) => options.id === "archived-sessions"));
});

// One tracker keeps the original first-snapshot and loading semantics with to-do off.
await scenario({ config: { todoCenter: false }, change: (services) => {
  services.sessions.list.emit({ phase: "loading", byId: {} });
  services.uiSession.sessionStatus.emit(new Map([["a", { running: true }]]));
} }, ({ status, services, slots, internals: { statusTimes }, dispose }) => {
  const original = Date.now;
  let stamp = 1000000;
  Date.now = () => stamp;
  try {
    assert.deepEqual(statusTimes.get("a"), { kind: "running", at: null });
    status.emit(new Map([["a", { completionUnread: true }], ["b", { running: true }]]));
    assert.deepEqual(statusTimes.get("a"), { kind: "done", at: null });
    services.sessions.list.emit({ phase: "ready", byId: { a: {}, b: {} } });
    status.emit(status.getSnapshot());
    assert.equal(statusTimes.get("a").at, null);
    assert.equal(statusTimes.get("b").at, null);
    status.emit(new Map([["a", { pendingInteraction: {} }], ["b", { running: true }]]));
    assert.deepEqual(statusTimes.get("a"), { kind: "pending", at: stamp });
    stamp++;
    status.emit(status.getSnapshot());
    assert.equal(statusTimes.get("a").at, stamp - 1);
    assert.equal(statusTimes.get("b").at, null);
    assert.strictEqual(slots.find(({ options }) => options.id === "rhine-todo").options.inject().since, statusTimes);
    assert.equal(status.listeners.size, 4, "one tracker subscription alongside notifications, billing and answer-now");
    status.emit(new Map([["a", {}]]));
    assert.equal(statusTimes.size, 0);
    dispose();
    assert.equal(statusTimes.size, 0);
  } finally { Date.now = original; }
});
await scenario({ config: { todoCenter: false }, change: (services) => {
  const now = Date.now();
  services.sessions.list.emit({ phase: "ready", byId: {
    pending: { updatedAt: now - 180000 }, running: { updatedAt: new Date(now - 180000).toISOString() },
    done: { updatedAt: now - 180000 }, invalid: { updatedAt: "bad" }
  } });
  services.uiSession.sessionStatus.emit(new Map([
    ["pending", { pendingInteraction: {} }], ["running", { running: true }], ["done", { completionUnread: true }],
    ["invalid", { running: true }], ["missing", { running: true }]
  ]));
} }, ({ slots, render, status, services, configStore, internals: { zh, en, statusTimes } }) => {
  const entry = slots.find(({ options }) => options.id === "rhine-status-time");
  assert.equal(entry.options.name, "sidebar.session.row.hover");
  assert.equal(entry.options.order, 20);
  assert.equal(entry.options.locale, "rhineSplash");
  const Component = entry.Component({}).props.children.type;
  const line = (sessionId, locale = en) => render(Component, { ...entry.options.inject(), sessionId, t: (key) => locale[key] });
  assert.deepEqual(line("running").props, { className: "rl-row-time", "data-kind": "running", children: "Running for 3 min" });
  assert.equal(line("pending").props.children, "Waiting for 3 min");
  assert.equal(line("done").props.children, "Finished 3 min ago");
  assert.equal(line("done", zh).props.children, "3 分钟前完成");
  for (const id of ["invalid", "missing", "idle"]) assert.equal(line(id), null);
  for (const [kind, value, text] of [["pending", { pendingInteraction: {} }, en.rowJustPending], ["running", { running: true }, en.rowJustRunning], ["done", { completionUnread: true }, en.rowJustDone]]) {
    status.emit(new Map([["running", value]]));
    statusTimes.set("running", { kind, at: Date.now() });
    assert.equal(line("running").props.children, text);
  }
  statusTimes.set("running", { kind: "pending", at: Date.now() });
  assert.equal(line("running").props.children, "Finished 3 min ago", "a stale kind falls back to row metadata");
  configStore.emit({ status: "ready", value: { rowStatus: false } });
  assert.equal(line("running"), null);
  configStore.emit({ status: "ready", value: { rowStatus: true } });
  assert.ok(line("running"));
});
await scenario({ change: (services) => {
  services.sessions.list.emit({ phase: "ready", byId: { a: { updatedAt: Date.now() - 59000 } } });
  services.uiSession.sessionStatus.emit(new Map([["a", { running: true }]]));
} }, ({ slots, mount, services, advance, internals: { en } }) => {
  const original = Date.now;
  let now = original();
  Date.now = () => now;
  try {
    const entry = slots.find(({ options }) => options.id === "rhine-status-time");
    const instance = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), sessionId: "a", t: (key) => en[key] }, true);
    assert.equal(instance.render().props.children, en.rowJustRunning);
    now += 30000;
    advance(30000);
    assert.equal(instance.render().props.children, "Running for 1 min");
    instance.unmount();
  } finally { Date.now = original; }
});

// Reports keep legacy coverage honest and attribute discounted cost per model-day.
await scenario({ apply: false }, ({ internals: { costReport, rangeDays, addToDayLog } }) => {
  const now = new Date(2026, 9, 21, 12).getTime();
  const empty = { v: 1, currency: "CNY", days: {} };
  const report = (log = empty, range = 7, extra = {}) => costReport({ log, now, range, list: { byId: {} }, workspaces: null, ledgers: () => null, budgets: { daily: 0, session: 0 }, ...extra });
  const blank = report();
  assert.deepEqual(Object.keys(blank).sort(), ["currency", "range", "days", "total", "previous", "activeDays", "average", "hours", "hoursKnown", "peakHours", "peak", "tokens", "hitRate", "split", "cacheSaved", "models", "sessions", "workspaces", "budget"].sort());
  assert.deepEqual(blank.days, rangeDays(now, 7).map((day) => ({ day, cost: 0, models: {} })));
  assert.equal(blank.total, 0);
  assert.equal(blank.previous, null);
  assert.equal(blank.activeDays, 0);
  assert.equal(blank.average, 0);
  assert.equal(blank.hitRate, 0);
  assert.deepEqual(blank.hours, Array(24).fill(0));
  assert.equal(blank.hoursKnown, 0);
  assert.deepEqual(blank.peak, { peak: 0, offPeak: 0, known: 0 });
  assert.deepEqual(blank.tokens, { miss: 0, hit: 0, out: 0 });
  assert.deepEqual(blank.split, { miss: 0, hit: 0, out: 0 });
  assert.equal(blank.cacheSaved, 0);
  for (const key of ["models", "sessions", "workspaces"]) assert.deepEqual(blank[key], []);
  assert.deepEqual(blank.budget, { daily: 0, today: 0, overDays: 0, session: 0, overSessions: 0 });
  const log = { v: 1, currency: "CNY", days: {
    "2026-10-14": { models: { legacy: { cost: 4, miss: 0, hit: 0, out: 0 } }, sessions: { a: 4 } },
    "2026-10-19": { models: { unknown: { cost: 2, miss: 0, hit: 0, out: 0 } }, sessions: { c: 2 } },
    "2026-10-20": { models: { "deepseek-flash": { cost: 10.04, miss: 1000000, hit: 1000000, out: 1000000 } }, sessions: { a: 4, b: 6.04 } },
    "2026-10-21": { models: {
      "deepseek-flash": { cost: 5.02, miss: 1000000, hit: 1000000, out: 1000000 },
      "deepseek-v4-pro": { cost: 9, miss: 1000000, hit: 0, out: 0 }
    }, sessions: { a: 2, b: 3.02, deleted: 9 }, hours: Array.from({ length: 24 }, (_, hour) => hour === 3 ? 5.02 : hour === 15 ? 9 : 0), peak: 9, offPeak: 5.02 }
  } };
  const before = JSON.stringify(log);
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`);
  const rows = { a: { title: "Alpha", updatedAt: now }, b: { displayTitle: "Beta", updatedAt: new Date(now).toISOString() }, c: { cwd: "C:\\work\\other", updatedAt: "invalid" } };
  const lifetime = { a: { model: "deepseek-flash", cost: 30 }, b: { model: "deepseek-flash", cost: 9.06 }, deleted: { model: "deepseek-v4-pro", cost: 9 } };
  const data = { list: { byId: rows }, workspaces: { items: [{ title: "Project", sessionIds: ["a", "b"] }] }, ledgers: (id) => lifetime[id], budgets: { daily: 10, session: 10 } };
  const result = report(log, 7, data);
  close(result.total, 26.06);
  assert.equal(result.previous, 4);
  assert.equal(result.activeDays, 3);
  close(result.average, 26.06 / 7);
  assert.deepEqual(result.days.at(-1), { day: "2026-10-21", cost: 14.02, models: { "deepseek-flash": 5.02, "deepseek-v4-pro": 9 } });
  assert.deepEqual(result.hours, log.days["2026-10-21"].hours);
  close(result.hoursKnown, 14.02);
  assert.deepEqual(result.peak, { peak: 9, offPeak: 5.02, known: 14.02 });
  assert.deepEqual(result.tokens, { miss: 3000000, hit: 2000000, out: 2000000 });
  close(result.hitRate, 0.4);
  close(result.split.miss, 12);
  close(result.split.hit, 0.06);
  close(result.split.out, 12);
  close(result.cacheSaved, 2.94);
  assert.deepEqual(result.models.map((row) => row.model), ["deepseek-flash", "deepseek-v4-pro", "unknown"]);
  close(result.models[0].cost, 15.06);
  close(result.models[0].share, 15.06 / 26.06);
  close(result.models[0].hitRate, 0.5);
  close(result.models[0].perMillion, 15.06 / 6);
  assert.equal(result.models[2].perMillion, 0);
  assert.deepEqual(result.sessions.map((row) => row.id), ["b", "deleted", "a", "c"]);
  const deleted = result.sessions[1];
  assert.deepEqual(deleted, { id: "deleted", title: null, workspace: null, model: "deepseek-v4-pro", cost: 9, share: 9 / result.total, at: null });
  assert.equal(result.sessions[0].title, "Beta");
  assert.equal(result.sessions[0].at, now);
  assert.equal(result.sessions[2].title, "Alpha");
  assert.equal(result.sessions[3].workspace, "other");
  assert.equal(result.sessions[3].at, null);
  assert.equal(result.sessions[3].model, null);
  assert.deepEqual(result.workspaces.map(({ key, title, count }) => ({ key, title, count })), [
    { key: "Project", title: "Project", count: 2 }, { key: "", title: null, count: 1 }, { key: "other", title: "other", count: 1 }
  ]);
  close(result.workspaces[0].cost, 15.06);
  close(result.workspaces[0].share, 15.06 / 26.06);
  assert.deepEqual(result.budget, { daily: 10, today: 14.02, overDays: 2, session: 10, overSessions: 1 });
  const oldOnly = report({ ...log, days: { "2026-10-20": log.days["2026-10-20"] } });
  close(oldOnly.total, 10.04);
  assert.equal(oldOnly.hoursKnown, 0);
  assert.equal(oldOnly.peak.known, 0);
  assert.equal(oldOnly.previous, null);
  assert.equal(report(log, 30).previous, null, "no row predating this range");
  assert.equal(report(log, 62).previous, null, "previous period exceeds retention");
  const retained = rangeDays(now, 62);
  const edge = { ...log, days: { ...log.days, [retained[0]]: log.days["2026-10-14"] } };
  assert.equal(report(edge, 30).previous, 0, "a retained earlier row permits a known empty comparison");
  assert.equal(report(edge, 62).previous, null);
  for (const count of [1, 7, 30, 62]) assert.equal(report(log, count).days.length, count);
  assert.equal(report(log, 1).previous, 10.04);
  const offset = new Date(now).getTimezoneOffset() / 60;
  assert.deepEqual(result.peakHours, Array.from({ length: 24 }, (_, hour) => {
    const beijing = (hour + offset + 56) % 24;
    return (beijing >= 9 && beijing < 12) || (beijing >= 14 && beijing < 18);
  }));
  assert.equal(JSON.stringify(log), before, "report never changes its input");
  const timed = addToDayLog(empty, { day: "2026-10-21", hour: 2, peak: false, model: "deepseek-flash", sessionId: "a", delta: { miss: 1000000, hit: 0, out: 0 }, cost: 1, currency: "CNY" });
  const next = addToDayLog(timed, { day: "2026-10-21", hour: 2, peak: true, model: "deepseek-flash", sessionId: "a", delta: { miss: 1000000, hit: 0, out: 0 }, cost: 2, currency: "CNY" });
  assert.equal(next.days["2026-10-21"].hours[2], 3);
  assert.equal(timed.days["2026-10-21"].hours[2], 1);
  assert.equal(next.days["2026-10-21"].peak, 2);
  assert.equal(next.days["2026-10-21"].offPeak, 1);
  const legacy = addToDayLog(next, { day: "2026-10-21", model: "deepseek-flash", sessionId: "a", delta: { miss: 1, hit: 0, out: 0 }, cost: 1, currency: "CNY" });
  assert.deepEqual(legacy.days["2026-10-21"].hours, next.days["2026-10-21"].hours);
  assert.equal(legacy.days["2026-10-21"].peak, 2);
  assert.equal(legacy.days["2026-10-21"].offPeak, 1);
});
for (const timing of [
  { hours: [] }, { hours: Array(23).fill(0) }, { hours: Array(25).fill(0) }, { hours: Array(24).fill(-1) },
  { hours: Array(24).fill(null) }, { hours: "invalid" }, { peak: -1 }, { peak: null }, { offPeak: "1" }
]) await scenario({ apply: false, stored: { "rhine-splash:bill-days": JSON.stringify({ v: 1, currency: "CNY", days: { "2026-10-21": { models: {}, sessions: {}, ...timing } } }) } }, ({ internals: { readDayLog } }) => {
  assert.deepEqual(readDayLog(), { v: 1, currency: "CNY", days: {} });
});
for (const timing of [{}, { hours: Array(24).fill(0), peak: 0, offPeak: 0 }, { peak: 0 }]) await scenario({ apply: false, stored: { "rhine-splash:bill-days": JSON.stringify({ v: 1, currency: "CNY", days: { "2026-10-21": { models: {}, sessions: {}, ...timing } } }) } }, ({ internals: { readDayLog } }) => {
  assert.deepEqual(readDayLog().days["2026-10-21"], { models: {}, sessions: {}, ...timing });
});
await scenario({ apply: false }, ({ internals: { recordUsage, readDayLog, dayKey } }) => {
  const now = Date.now();
  recordUsage("timed", { uncachedInputTokens: 1000000 }, "deepseek-flash", "CNY");
  const row = readDayLog().days[dayKey(now)];
  assert.equal(row.hours.length, 24);
  assert.equal(row.hours[new Date(now).getHours()], row.models["deepseek-flash"].cost);
  assert.equal(row.peak + row.offPeak, row.models["deepseek-flash"].cost);
});

// Noise controls and field-specific numeric validation.
await scenario({ apply: false }, ({ internals: i }) => {
  for (const [field, max] of [["notifyMinRun", 600], ["quietFrom", 23], ["quietTo", 23]]) {
    const spec = i.specs().find((row) => row.field === field);
    for (const value of [0, 1, max]) {
      assert.deepEqual(spec.parse(String(value)), { kind: "set", value });
      assert.equal(i.normalize({ [field]: value })[field], value);
    }
    for (const value of [-1, max + 1, 1.5, NaN, Infinity]) {
      assert.equal(spec.parse(String(value)), undefined);
      assert.equal(i.normalize({ [field]: value })[field], DEFAULTS[field]);
    }
  }
  const duration = i.specs().find((row) => row.field === "duration");
  assert.deepEqual(duration.parse("12.5"), { kind: "set", value: 12.5 });
  assert.equal(duration.parse("15001"), undefined);
  assert.equal(i.normalize({ duration: 15001 }).duration, DEFAULTS.duration);
  for (const [hour, from, to, expected] of [[22, 22, 8, true], [7, 22, 8, true], [8, 22, 8, false], [21, 22, 8, false], [10, 9, 17, true], [17, 9, 17, false], [22, 22, 22, false]]) {
    assert.equal(i.inQuietHours(new Date(2026, 9, 27, hour), from, to), expected);
  }
  const first = i.balanceAlertStep({ total: 4, limit: 5 });
  assert.deepEqual(first, { alert: true, low: true, state: { limit: 5, fired: true } });
  assert.equal(i.balanceAlertStep({ total: 3, limit: 5, state: first.state }).alert, false);
  const recovered = i.balanceAlertStep({ total: 5, limit: 5, state: first.state });
  assert.deepEqual(recovered, { alert: false, low: false, state: { limit: 5, fired: false } });
  assert.equal(i.balanceAlertStep({ total: 4, limit: 5, state: recovered.state }).alert, true);
  assert.equal(i.balanceAlertStep({ total: 4, limit: 6, state: first.state }).alert, true);
  assert.equal(i.balanceAlertStep({ total: -1, limit: 0 }).alert, false);
  const value = { balances: [{ currency: "CNY", total: "4" }] };
  for (const status of ["ready", "failed"]) assert.equal(i.balanceLow({ status, value }, 5), true);
  assert.equal(i.balanceLow({ status: "loading", value }, 5), false);
  assert.equal(i.balanceLow({ status: "failed", value: null }, 5), false);
  assert.equal(i.balanceLow({ status: "ready", value }, 4), false);
  assert.equal(i.balanceLow({ status: "ready", value }, 0), false);
  const args = { current: "0.2.8", seen: null, hasHistory: false };
  assert.deepEqual(i.whatsNewFor(args), { kind: "welcome", version: "0.2.8", items: Array.from({ length: 5 }, (_, n) => "wn_welcome_" + (n + 1)) });
  for (const extra of [{ seen: "0.2.7" }, { hasHistory: true }]) {
    assert.deepEqual(i.whatsNewFor({ ...args, ...extra }), { kind: "update", version: "0.2.8", items: Array.from({ length: 5 }, (_, n) => "wn_0_2_8_" + (n + 1)) });
  }
  for (const extra of [{ current: "" }, { seen: "0.2.8" }, { current: "0.2.9", hasHistory: true }, { current: "toString", hasHistory: true }]) assert.equal(i.whatsNewFor({ ...args, ...extra }), null);
  for (const [version, count] of Object.entries(i.WHATS_NEW)) for (let n = 1; n <= count; n++) {
    const key = "wn_" + version.replaceAll(".", "_") + "_" + n;
    assert.ok(i.zh[key] && i.en[key]);
  }
});
const domNodes = (node) => [node, ...(node.children || []).flatMap(domNodes)];
const noticeCount = () => domNodes(document.body).filter((node) => node.className === "rl-ntf").length;
await scenario({ config: { notifySound: false } }, ({ status, services, configStore, notifications }) => {
  services.sessions.list.emit({ phase: "ready", byId: { a: { title: "Short run" } } });
  const end = () => { status.emit(new Map([["a", { running: true }]])); status.emit(new Map([["a", { running: false }]])); };
  end();
  assert.equal(noticeCount(), 0, "short focused runs are dropped");
  document.hasFocus = () => false;
  end();
  assert.equal(notifications.length, 1, "short away runs still notify");
  document.hasFocus = () => true;
  status.emit(new Map([["a", { running: true, pendingInteraction: { kind: "question" } }]]));
  assert.equal(noticeCount(), 2, "pending interactions always show a card");
  configStore.emit({ status: "ready", value: { notifyMinRun: 0 } });
  end();
  assert.equal(noticeCount(), 3, "zero disables the minimum duration");
});
await scenario({ config: { notifySound: false }, change: (services) => {
  services.uiSession.sessionStatus.emit(new Map([["a", { running: true }]]));
  services.sessions.list.emit({ phase: "ready", byId: { a: { title: "Already running" } } });
} }, ({ status }) => {
  status.emit(new Map([["a", { running: false }]]));
  assert.equal(noticeCount(), 1, "unknown run starts still notify");
});
await scenario({ config: { notifySound: false, notifyCurrent: false, notifyOthers: false } }, ({ status, services, configStore }) => {
  services.sessions.list.emit({ phase: "ready", byId: { a: {} } });
  status.emit(new Map([["a", { running: true }]]));
  configStore.emit({ status: "ready", value: { notifyOthers: true } });
  status.emit(new Map([["a", { running: false }]]));
  assert.equal(noticeCount(), 0, "start tracking precedes the scene filter");
});
await scenario({ apply: false, config: { quietHours: true, quietFrom: new Date().getHours(), quietTo: (new Date().getHours() + 1) % 24 } }, ({ internals: { registerNotify }, notifications }) => {
  const disposers = [], savedAudio = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  let sounds = 0;
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { sounds++; throw new Error("blocked"); } } });
  const notify = registerNotify({ effect(fn) { disposers.push(fn()); }, inject() {} }, (key) => key);
  document.hasFocus = () => false;
  const hour = new Date().getHours();
  const config = { ...DEFAULTS, quietHours: true, quietFrom: hour, quietTo: (hour + 1) % 24 };
  try {
    notify.alert({ id: "balance-low", title: "Balance", status: "Low", open: noop });
    assert.equal(notifications.length, 0, "alerts also respect quiet hours");
    assert.equal(sounds, 0);
    assert.equal(noticeCount(), 1);
    document.visibilityState = "hidden";
    notify.alert({ id: "budget", title: "Budget", status: "Over", open: noop });
    assert.equal(noticeCount(), 1, "hidden cards queue during quiet hours");
    document.visibilityState = "visible";
    document.hasFocus = () => true;
    document.dispatch("visibilitychange");
    assert.equal(noticeCount(), 2);
    assert.equal(sounds, 0);
    notify.preview(config);
    assert.equal(notifications.length, 1);
    assert.equal(sounds, 1);
  } finally {
    disposers.reverse().forEach((fn) => fn());
    if (savedAudio) Object.defineProperty(globalThis, "AudioContext", savedAudio); else delete globalThis.AudioContext;
  }
});
await scenario({ config: { quietHours: true, quietFrom: new Date().getHours(), quietTo: (new Date().getHours() + 1) % 24, notifySound: false } }, ({ status, services, notifications }) => {
  document.hasFocus = () => false;
  services.sessions.list.emit({ phase: "ready", byId: { a: {} } });
  status.emit(new Map([["a", { running: true }]]));
  status.emit(new Map([["a", { running: false }]]));
  assert.equal(notifications.length, 0);
  assert.equal(noticeCount(), 1, "quiet hours retain in-app notices");
});

// Balance crossing alerts share the notice path and low-balance markup.
{
  let total = 4, failed = false;
  await scenario({ config: { balanceAlert: 5, notifyToast: false, notifySound: false }, fetcher: async () => ({ ok: !failed, json: async () => ({ status: "ready", balances: [{ currency: "CNY", total: String(total), granted: "0", toppedUp: String(total) }] }) }) }, async ({ internals: i, slots, mount, render, configStore, notifications, memory, services }) => {
    document.hasFocus = () => false;
    await new Promise(setImmediate);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].title, "balanceLow");
    assert.deepEqual(JSON.parse(memory.get("rhine-splash:balance-alert")), { limit: 5, fired: true });
    await i.balance.refresh();
    assert.equal(notifications.length, 1);
    const entry = slots.find(({ options }) => options.id === "rhine-billing");
    const widget = mount(entry.Component({}).props.children.type, { ...entry.options.inject(), wide: true, t: (key) => i.en[key] });
    let card = widget.render();
    assert.equal(card.props["data-low"], "true");
    const row = nodesOf(card).find((node) => node.props?.className === "rl-bill-row rl-bill-row--balance");
    assert.equal(row.props["data-low"], "true");
    assert.equal(row.props.title, i.fill(i.en.balanceLowTitle, { limit: "¥5.00" }));
    card.props.onClick();
    const panel = nodesOf(widget.render()).find((node) => node.props?.className === "rl-cost-balance");
    assert.equal(panel.props["data-low"], "true");
    const page = slots.find(({ options }) => options.name === "main");
    const cost = () => render(page.Component({}).props.children.type, { ...page.options.inject(), t: (key) => i.en[key] });
    assert.equal(nodesOf(cost()).find((node) => node.props?.["data-kind"] === "balance").props["data-low"], "true");
    failed = true;
    await i.balance.refresh();
    assert.equal(i.balance.getSnapshot().status, "failed");
    assert.equal(nodesOf(widget.render()).find((node) => node.props?.className === "rl-bill").props["data-low"], "true", "cached failed balance stays marked");
    failed = false;
    total = 5;
    await i.balance.refresh();
    assert.equal(notifications.length, 1);
    assert.equal(nodesOf(widget.render()).find((node) => node.props?.className === "rl-bill").props["data-low"], undefined);
    total = 4;
    await i.balance.refresh();
    assert.equal(notifications.length, 2, "recovery re-arms the threshold");
    configStore.emit({ status: "ready", value: { balanceAlert: 6 } });
    assert.equal(notifications.length, 3, "changing the live limit checks immediately");
    configStore.emit({ status: "ready", value: { balanceAlert: 0 } });
    assert.equal(notifications.length, 3);
    const saved = globalThis.Notification;
    let lastBalanceNotice;
    globalThis.Notification = class { static permission = "granted"; constructor() { lastBalanceNotice = this; } };
    try {
      configStore.emit({ status: "ready", value: { balanceAlert: 7 } });
      lastBalanceNotice.close = noop;
      lastBalanceNotice.onclick();
      assert.equal(services.layout.panelInfo.getSnapshot().activePanelId, "rhine-cost");
    } finally { globalThis.Notification = saved; }
  });
}
await scenario({ config: { balanceAlert: 5, notifyToast: false, notifySound: false }, stored: { "rhine-splash:balance-alert": JSON.stringify({ limit: 5, fired: true }) }, fetcher: async () => ({ ok: true, json: async () => ({ status: "ready", balances: [{ currency: "USD", total: "4", granted: "0", toppedUp: "4" }] }) }) }, async ({ notifications }) => {
  document.hasFocus = () => false;
  await new Promise(setImmediate);
  assert.equal(notifications.length, 0, "a persisted crossing stays quiet");
});

// The shared form renders in both settings locations, including the update banner.
await scenario({ config: { version: "0.2.7" }, stored: { "rhine-splash:update-check": JSON.stringify({ at: Date.now(), latest: "0.2.8" }) } }, async ({ slots, internals: i, render, mount, configStore, advance }) => {
  const plugin = slots.find(({ options }) => options.name === "plugins.row.config");
  const section = slots.find(({ options }) => options.id === "rhine-splash");
  assert.equal(section.options.name, "settings.section");
  assert.equal(section.options.order, 30);
  assert.equal(section.options.label(), "settingsNav");
  const injected = plugin.options.inject(), shared = section.options.inject();
  assert.strictEqual(injected.hooks.rhineSplash, shared.hooks.rhineSplash);
  assert.strictEqual(injected.hooks.rhineUpdate, i.updates);
  const props = { ...shared, t: (key) => i.en[key], useRhineSplash: () => shared.hooks.rhineSplash.getSnapshot(), useRhineUpdate: () => i.updates.getSnapshot() };
  const wrapper = render(section.Component({}).props.children.type, props);
  assert.equal(wrapper.props.className, "rl-set");
  const card = nodesOf(wrapper).find((node) => node.type.name === "Card");
  assert.ok(card);
  const instance = mount(card.type, card.props, true);
  const find = (className) => nodesOf(instance.render()).find((node) => node.props?.className === className);
  assert.equal(find("rl-cfg-update").props.role, "status");
  assert.equal(find("rl-cfg-update-code").props.children, "dsh-rhine-splash@0.2.8");
  assert.ok(find("rl-cfg-note").props.children.includes("0.2.7"));
  const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const savedRange = document.createRange, savedSelection = window.getSelection;
  try {
    const copied = [];
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async (text) => copied.push(text) } } });
    await find("rl-cfg-update-copy").props.onClick();
    assert.deepEqual(copied, ["dsh-rhine-splash@0.2.8"]);
    assert.equal(find("rl-cfg-update-copy").props.children, i.en.updCopied);
    advance(1500);
    assert.equal(find("rl-cfg-update-copy").props.children, i.en.updCopy);
    let selected = false;
    navigator.clipboard.writeText = async () => { throw new Error("denied"); };
    document.createRange = () => ({ selectNodeContents() { selected = true; } });
    window.getSelection = () => ({ removeAllRanges: noop, addRange: noop });
    await find("rl-cfg-update-copy").props.onClick();
    assert.equal(selected, true);
  } finally {
    if (savedNavigator) Object.defineProperty(globalThis, "navigator", savedNavigator); else delete globalThis.navigator;
    document.createRange = savedRange;
    window.getSelection = savedSelection;
  }
  configStore.emit({ status: "ready", value: { updateCheck: false } });
  assert.deepEqual(i.updates.getSnapshot(), { latest: null, newer: false });
  assert.equal(find("rl-cfg-update"), undefined);
  configStore.emit({ status: "ready", value: { updateCheck: true } });
  assert.equal(find("rl-cfg-update").props.role, "status");
  assert.equal(nodesOf(render(card.type, { ...card.props, useRhineUpdate: undefined })).some((node) => node.props?.className === "rl-cfg-update"), false);
});
await scenario({ change: (services) => {
  services.slots.entries = (name) => name === "settings.section" ? [{ options: { id: "rhine-splash" } }] : [];
} }, ({ slots }) => { assert.equal(slots.some(({ options }) => options.id === "rhine-splash"), false); });
for (const [version, latest, newer] of [["0.2.8", "0.2.8", false], ["0.2.9", "0.2.8", false], ["0.2.7", "0.2.8", true]]) {
  await scenario({ config: { version }, stored: { "rhine-splash:update-check": JSON.stringify({ at: Date.now(), latest }) } }, ({ internals: { updates } }) => {
    assert.deepEqual(updates.getSnapshot(), { latest, newer });
  });
}
{
  const requests = [];
  await scenario({ config: { version: "0.2.7" }, fetcher: async (url, init) => {
    if (url === "/rhine-splash/update") { requests.push(init); return { ok: true, json: async () => ({ status: "ready", latest: "0.2.8" }) }; }
    return { ok: true, json: async () => ({ status: "no-key" }) };
  } }, async ({ internals: { updates }, configStore, memory, advance }) => {
    await new Promise(setImmediate);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers["x-rhine-splash"], "1");
    assert.deepEqual(updates.getSnapshot(), { latest: "0.2.8", newer: true });
    assert.equal(JSON.parse(memory.get("rhine-splash:update-check")).latest, "0.2.8");
    configStore.emit({ status: "ready", value: { updateCheck: false } });
    configStore.emit({ status: "ready", value: { updateCheck: true } });
    advance(60000);
    await new Promise(setImmediate);
    assert.equal(requests.length, 1, "no repeated request within a day");
    const savedNow = Date.now;
    const later = savedNow() + 86400001;
    try {
      Date.now = () => later;
      advance(60000);
      await new Promise(setImmediate);
      assert.equal(requests.length, 2, "a new check is allowed after 24 h");
    } finally { Date.now = savedNow; }
  });
}
for (const config of [{ version: "" }, { version: "0.2.7", updateCheck: false }]) {
  let calls = 0;
  await scenario({ config, fetcher: async (url) => { if (url === "/rhine-splash/update") calls++; return { ok: true, json: async () => ({ status: "no-key" }) }; } }, async ({ internals: { updates } }) => {
    await new Promise(setImmediate);
    assert.equal(calls, 0);
    assert.deepEqual(updates.getSnapshot(), { latest: null, newer: false });
  });
}

// Resident welcome/update cards wait for the splash and never take focus.
await scenario({ config: { version: "0.2.8", updateCheck: false } }, ({ slots, mount, advance, memory, internals: i }) => {
  const overlay = slots.find(({ options }) => options.id === "rhine-whats-new");
  const card = mount(overlay.Component({}).props.children.type, { ...overlay.options.inject(), t: (key) => i.en[key] }, true);
  let focused = 0;
  document.activeElement = { focus() { focused++; } };
  assert.equal(card.render(), null);
  advance(1499);
  assert.equal(card.render(), null);
  advance(1);
  const node = card.render();
  assert.equal(node.props.className, "rl-wn");
  assert.equal(node.props["data-kind"], "welcome");
  assert.equal(node.props.role, "dialog");
  assert.equal(node.props["aria-modal"], "false");
  assert.equal(nodesOf(node).filter((item) => item.props?.className === "rl-wn-item").length, 5);
  assert.deepEqual(nodesOf(node).filter((item) => item.props?.className === "rl-wn-num").map((item) => item.props.children), ["01", "02", "03", "04", "05"]);
  assert.equal(nodesOf(node).some((item) => item.type === "a"), false);
  assert.equal(nodesOf(node).some((item) => item.props?.className === "rl-wn-btn rl-wn-btn--primary"), false);
  assert.equal(memory.get("rhine-splash:seen-version"), "0.2.8");
  assert.equal(focused, 0);
  document.dispatch("keydown", { key: "Escape" });
  assert.equal(card.render(), null);
});
await scenario({ config: { version: "0.2.8", updateCheck: false }, stored: { "rhine-splash:seen-version": "0.2.7" }, change: (services) => { services.pluginNavigation = { openBundle: noop }; } }, ({ slots, mount, advance, memory, services, internals: i }) => {
  let splash = true;
  document.visibilityState = "hidden";
  document.getElementById = () => splash ? {} : null;
  const overlay = slots.find(({ options }) => options.id === "rhine-whats-new");
  const card = mount(overlay.Component({}).props.children.type, { ...overlay.options.inject(), t: (key) => i.en[key] }, true);
  advance(3000);
  assert.equal(card.render(), null);
  assert.equal(memory.get("rhine-splash:seen-version"), "0.2.7");
  document.visibilityState = "visible";
  advance(900);
  assert.equal(card.render(), null);
  splash = false;
  advance(1500);
  const node = card.render();
  assert.equal(node.props["data-kind"], "update");
  assert.equal(nodesOf(node).find((item) => item.type === "a").props.rel, "noreferrer");
  let opened;
  services.pluginNavigation.openBundle = (id) => { opened = id; };
  nodesOf(node).find((item) => item.props?.className === "rl-wn-btn rl-wn-btn--primary").props.onClick();
  assert.equal(opened, "dsh-rhine-splash");
  assert.equal(card.render(), null);
});
await scenario({ config: { version: "0.2.8", updateCheck: false } }, ({ slots, mount, advance, memory, internals: i }) => {
  document.getElementById = () => ({});
  const overlay = slots.find(({ options }) => options.id === "rhine-whats-new");
  const card = mount(overlay.Component({}).props.children.type, { ...overlay.options.inject(), t: (key) => i.en[key] }, true);
  advance(21000);
  document.getElementById = () => null;
  advance(2000);
  assert.equal(card.render(), null, "give up after 20 s");
  assert.equal(memory.has("rhine-splash:seen-version"), false);
});
for (const stored of [{ "rhine-splash:bill:old": "{}" }, { "rhine-splash:seen-version": "0.2.7" }]) {
  await scenario({ config: { version: "0.2.9", updateCheck: false }, stored }, ({ memory, slots, render, advance, internals: i }) => {
    assert.equal(memory.get("rhine-splash:seen-version"), "0.2.9", "remember versions with no release entry too");
    advance(1500);
    const overlay = slots.find(({ options }) => options.id === "rhine-whats-new");
    assert.equal(render(overlay.Component({}).props.children.type, { ...overlay.options.inject(), t: (key) => i.en[key] }), null);
  });
}

// Load the actual splash script; reaching createElement proves the gate allowed playback.
{
  const splash = readFileSync(new URL("../lib/splash.js", import.meta.url), "utf8");
  const day = new Date(), today = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, "0"), String(day.getDate()).padStart(2, "0")].join("-");
  const run = (config, seen, played = false, blocked = false) => {
    const memory = new Map(seen === undefined ? [] : [["rhine-splash:splash-seen", typeof seen === "string" ? seen : JSON.stringify(seen)]]);
    let plays = 0;
    const sandbox = {
      __RHINE_SPLASH__: { ...config, version: config.version ?? "0.2.8", theme: "light" },
      document: { body: {}, documentElement: { dataset: {} }, getElementById: () => null, createElement() { plays++; throw new Error("splash-play"); } },
      sessionStorage: { getItem: () => played ? "1" : null, setItem: noop },
      localStorage: { getItem(key) { if (blocked) throw new Error("blocked"); return memory.get(key) ?? null; }, setItem(key, value) { if (blocked) throw new Error("blocked"); memory.set(key, value); } },
      matchMedia: () => ({ matches: false })
    };
    try { vm.runInNewContext(splash, sandbox); } catch (error) { assert.equal(error.message, "splash-play"); }
    return { sandbox, memory, plays };
  };
  assert.equal(run({ splashWhen: "daily" }, { day: today, version: "old" }).plays, 0);
  assert.equal(run({ splashWhen: "daily" }, { day: "2000-01-01", version: "0.2.8" }).plays, 1);
  assert.equal(run({ splashWhen: "update" }, { day: "2000-01-01", version: "0.2.8" }).plays, 0);
  assert.equal(run({ splashWhen: "update" }, { day: today, version: "0.2.7" }).plays, 1);
  assert.equal(run({ splashWhen: "update", version: "" }, { version: "" }).plays, 1);
  assert.equal(run({ splashWhen: "launch" }, { day: today, version: "0.2.8" }).plays, 1);
  for (const seen of [undefined, "{", null, [], 1]) assert.equal(run({ splashWhen: "daily" }, seen).plays, 1);
  assert.equal(run({ splashWhen: "launch" }, undefined, true).plays, 0, "session reload gate is retained");
  assert.equal(run({ splashWhen: "daily" }, undefined, false, true).plays, 1, "blocked storage does not prevent playback");
  const state = run({ splashWhen: "daily" }, { day: today, version: "0.2.8" }, true);
  assert.throws(() => state.sandbox.__rhineSplash.replay({ splashWhen: "daily" }), /splash-play/);
  assert.throws(() => state.sandbox.__rhineSplash.replay({ splashWhen: "update" }), /splash-play/);
  assert.deepEqual(JSON.parse(state.memory.get("rhine-splash:splash-seen")), { day: today, version: "0.2.8" });
}

console.log("Client tests passed (new settings/quiet/min-run, balance alerts/low DOM, updates/cache/banner/copy, settings section, welcome/update lifecycle, splash gates/replay, locale/default contracts, live config/root cleanup, accent controls, live brand/hero/notifications/resume, unconditional slots, cost report/hour/peak/page, unarchive, shared row-status timing, money/budget/loaded-recorder tests, helpers, safe boundaries, degraded services, absence timing, disposal).");
