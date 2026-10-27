import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { refuseRequest, readJson, reply } from './http.js';

const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const amount = (value) => Number.isFinite(value) && value >= 0;
const currency = (value) => ['CNY', 'USD'].includes(value);
const buckets = (value) => object(value) && ['miss', 'hit', 'out'].every((key) => amount(value[key]));
const own = (value, key) => Object.hasOwn(value, key) ? value[key] : undefined;
const dayKey = (time) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const validDay = (day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && dayKey(new Date(day + 'T12:00:00')) === day;
const retainedDays = (now) => {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - 61);
  return new Set(Array.from({ length: 62 }, () => { const key = dayKey(date); date.setDate(date.getDate() + 1); return key; }));
};

export function validLedger(value) {
  return object(value) && currency(value.currency) && (value.cost === null || amount(value.cost)) && buckets(value.seen);
}
export function validBillDays(value) {
  return object(value) && value.v === 1 && currency(value.currency) && object(value.days)
    && Object.entries(value.days).every(([day, row]) => validDay(day) && object(row) && object(row.models) && object(row.sessions)
      && Object.values(row.models).every((entry) => buckets(entry) && amount(entry.cost)) && Object.values(row.sessions).every(amount)
      && (!Object.hasOwn(row, 'hours') || (Array.isArray(row.hours) && row.hours.length === 24 && row.hours.every(amount)))
      && ['peak', 'offPeak'].every((key) => !Object.hasOwn(row, key) || amount(row[key])));
}
export function validRunDays(value) {
  return object(value) && value.v === 1 && object(value.days) && Object.entries(value.days).every(([day, row]) => validDay(day)
    && object(row) && Number.isInteger(row.runs) && row.runs > 0 && amount(row.ms) && row.ms >= 1000
    && amount(row.longest) && row.longest >= 1000 && row.longest <= row.ms);
}
const levels = (value) => Array.isArray(value) && value.every((n) => n === 80 || n === 100);
const validBudget = (value) => value === null || (object(value) && validDay(value.day) && levels(value.daily) && object(value.ids)
  && Object.values(value.ids).every((entry) => object(entry) && validDay(entry.day) && levels(entry.levels)));
const validBalance = (value) => value === null || (object(value) && amount(value.limit) && typeof value.fired === 'boolean');
const validAlerts = (value) => object(value) && (!Object.hasOwn(value, 'budget') || validBudget(value.budget))
  && (!Object.hasOwn(value, 'balance') || validBalance(value.balance));
export function emptyRecords() {
  return { v: 1, rev: 0, billDays: { v: 1, currency: 'CNY', days: {} }, ledgers: {}, runDays: { v: 1, days: {} },
    runEnds: {}, alerts: { budget: null, balance: null }, imported: {} };
}
export function validRecords(doc) {
  return object(doc) && doc.v === 1 && Number.isSafeInteger(doc.rev) && doc.rev >= 0 && validBillDays(doc.billDays)
    && object(doc.ledgers) && Object.values(doc.ledgers).every(validLedger) && validRunDays(doc.runDays)
    && object(doc.runEnds) && Object.values(doc.runEnds).every(amount) && validAlerts(doc.alerts)
    && object(doc.imported) && Object.values(doc.imported).every(amount);
}
export function validRecordOp(op) {
  if (!object(op)) return false;
  if (op.type === 'usage') return typeof op.sessionId === 'string' && !!op.sessionId && typeof op.model === 'string'
    && currency(op.currency) && buckets(op.seen) && object(op.prices)
    && ['CNY', 'USD'].every((key) => op.prices[key] === null || buckets(op.prices[key]))
    && typeof op.peak === 'boolean' && validDay(op.day) && Number.isInteger(op.hour) && op.hour >= 0 && op.hour < 24 && amount(op.at);
  if (op.type === 'run') return typeof op.sessionId === 'string' && !!op.sessionId && validDay(op.day) && amount(op.ms) && op.ms >= 1000 && amount(op.endedAt);
  if (op.type === 'alerts') return validAlerts(op) && (Object.hasOwn(op, 'budget') || Object.hasOwn(op, 'balance'));
  if (op.type === 'import') return typeof op.origin === 'string' && !!op.origin
    && (!Object.hasOwn(op, 'billDays') || validBillDays(op.billDays))
    && (!Object.hasOwn(op, 'ledgers') || (object(op.ledgers) && Object.values(op.ledgers).every(validLedger)))
    && (!Object.hasOwn(op, 'runDays') || validRunDays(op.runDays)) && (!Object.hasOwn(op, 'alerts') || validAlerts(op.alerts));
  return false;
}
export function pruneRecords(source, now = Date.now()) {
  const doc = structuredClone(source), retained = retainedDays(now), sessions = new Set();
  for (const key of ['billDays', 'runDays']) doc[key].days = Object.fromEntries(Object.entries(doc[key].days).filter(([day]) => retained.has(day)));
  for (const row of Object.values(doc.billDays.days)) for (const id of Object.keys(row.sessions)) sessions.add(id);
  doc.ledgers = Object.fromEntries(Object.entries(doc.ledgers).filter(([id, row]) => sessions.has(id) || !Number.isFinite(row.at) || row.at >= now - 62 * 86400000));
  doc.runEnds = Object.fromEntries(Object.entries(doc.runEnds).filter(([, at]) => at >= now - 86400000));
  return doc;
}

// Replay absolute observations rather than adding a window's estimated delta.
export function applyRecordOp(source, op, now = Date.now()) {
  if (!validRecordOp(op)) return { doc: source, result: null };
  const doc = structuredClone(source);
  let result = { applied: true };
  if (op.type === 'usage') {
    const previous = own(doc.ledgers, op.sessionId), code = previous?.currency || op.currency, rates = op.prices[code];
    // An observation older than the ledger (another window's late request) must
    // not rewind `seen`, or the next newer one would be priced twice.
    if (previous && Number.isFinite(previous.at) && op.at < previous.at) {
      return { doc: source, result: { ledger: previous, added: 0, day: own(doc.billDays.days, op.day) ?? null, currency: doc.billDays.currency } };
    }
    let cost = previous?.cost ?? null, added = 0, delta = op.seen;
    const price = (value) => (value.miss * rates.miss + value.hit * rates.hit + value.out * rates.out) / 1000000 * (op.peak ? 1 : 0.5);
    if (!previous || previous.cost === null) { cost = rates ? price(op.seen) : null; added = cost ?? 0; }
    else {
      delta = Object.fromEntries(Object.keys(op.seen).map((key) => [key, op.seen[key] - previous.seen[key]]));
      if (!rates) cost = null;
      else if (Object.values(delta).every((n) => n >= 0) && Object.values(delta).some((n) => n > 0)) { added = price(delta); cost += added; }
    }
    const ledger = { seen: op.seen, cost, currency: code, model: op.model, at: op.at };
    Object.defineProperty(doc.ledgers, op.sessionId, { value: ledger, enumerable: true, configurable: true, writable: true });
    if (added > 0) {
      const days = doc.billDays.currency === code ? doc.billDays.days : {};
      const row = own(days, op.day) || { models: {}, sessions: {} }, before = own(row.models, op.model) || { cost: 0, miss: 0, hit: 0, out: 0 };
      const hours = [...(row.hours || Array(24).fill(0))];
      hours[op.hour] += added;
      days[op.day] = { ...row, hours, peak: (row.peak || 0) + (op.peak ? added : 0), offPeak: (row.offPeak || 0) + (op.peak ? 0 : added),
        models: { ...row.models, [op.model]: { cost: before.cost + added, miss: before.miss + delta.miss, hit: before.hit + delta.hit, out: before.out + delta.out } },
        sessions: { ...row.sessions, [op.sessionId]: (own(row.sessions, op.sessionId) || 0) + added } };
      doc.billDays = { v: 1, currency: code, days };
    }
    result = { ledger, added, day: doc.billDays.days[op.day] ?? null, currency: doc.billDays.currency };
  } else if (op.type === 'run') {
    const before = own(doc.runEnds, op.sessionId);
    if (before !== undefined && Math.abs(before - op.endedAt) <= 15000) result = { applied: false };
    else {
      const row = own(doc.runDays.days, op.day) || { runs: 0, ms: 0, longest: 0 };
      doc.runDays.days[op.day] = { runs: row.runs + 1, ms: row.ms + op.ms, longest: Math.max(row.longest, op.ms) };
      doc.runEnds = { ...doc.runEnds, [op.sessionId]: op.endedAt };
    }
  } else if (op.type === 'alerts') {
    for (const key of ['budget', 'balance']) if (Object.hasOwn(op, key)) doc.alerts[key] = structuredClone(op[key]);
  } else if (!Object.hasOwn(doc.imported, op.origin)) {
    if (op.billDays && (doc.billDays.currency === op.billDays.currency || !Object.keys(doc.billDays.days).length)) {
      doc.billDays.currency = op.billDays.currency;
      for (const [day, incoming] of Object.entries(op.billDays.days)) {
        const row = own(doc.billDays.days, day) || { models: {}, sessions: {} };
        for (const [model, entry] of Object.entries(incoming.models)) if (!own(row.models, model) || entry.cost > row.models[model].cost) row.models = { ...row.models, [model]: entry };
        for (const [id, cost] of Object.entries(incoming.sessions)) row.sessions = { ...row.sessions, [id]: Math.max(own(row.sessions, id) || 0, cost) };
        if (incoming.hours) row.hours = incoming.hours.map((n, hour) => Math.max(row.hours?.[hour] || 0, n));
        for (const key of ['peak', 'offPeak']) if (incoming[key] !== undefined) row[key] = Math.max(row[key] || 0, incoming[key]);
        doc.billDays.days[day] = row;
      }
    }
    for (const [id, entry] of Object.entries(op.ledgers || {})) {
      const before = own(doc.ledgers, id), total = (row) => row.seen.miss + row.seen.hit + row.seen.out;
      if (!before || total(entry) > total(before) || (total(entry) === total(before) && (entry.at || 0) > (before.at || 0))) doc.ledgers = { ...doc.ledgers, [id]: entry };
    }
    for (const [day, entry] of Object.entries(op.runDays?.days || {})) {
      const row = own(doc.runDays.days, day) || { runs: 0, ms: 0, longest: 0 };
      doc.runDays.days[day] = Object.fromEntries(['runs', 'ms', 'longest'].map((key) => [key, Math.max(row[key], entry[key])]));
    }
    for (const key of ['budget', 'balance']) if (doc.alerts[key] == null && op.alerts?.[key] != null) doc.alerts[key] = op.alerts[key];
    doc.imported = { ...doc.imported, [op.origin]: now };
  } else return { doc: source, result: { applied: false } };
  const pruned = pruneRecords(doc, now);
  return validRecords(pruned) ? { doc: pruned, result } : { doc: source, result: null };
}

export function registerStore(ctx, { warn = () => {} } = {}) {
  let doc = emptyRecords(), queued = [], stamp, timer, chain = Promise.resolve(), disposed = false, warned = false, failure;
  const serial = (fn) => { const task = chain.then(fn); chain = task.catch(() => {}); return task; };
  const paths = () => {
    const root = ctx.get('sessionPersistence')?.root;
    return typeof root === 'string' && root ? join(dirname(root), 'rhine-splash') : null;
  };
  const load = async (folder) => {
    const file = join(folder, 'records.json');
    let raw;
    try { raw = await readFile(file, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return emptyRecords(); throw error; }
    let value;
    try { value = JSON.parse(raw); } catch {}
    if (value?.v > 1) throw Object.assign(new Error('Newer records'), { newer: true });
    if (!validRecords(value)) {
      let at = Date.now(), backup;
      while (true) {
        backup = file + '.bad-' + at++;
        try { const reservation = await open(backup, 'wx'); await reservation.close(); break; }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
      await rename(file, backup);
      if (!warned) { warned = true; warn(ctx, 'Rhine records were invalid; the original file was preserved.'); }
      return emptyRecords();
    }
    return value;
  };
  const mtime = async (folder) => {
    try { const value = await stat(join(folder, 'records.json')); return `${value.mtimeMs}:${value.size}`; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const reload = async (folder) => {
    const next = await mtime(folder);
    if (!queued.length && (stamp === undefined || next !== stamp)) {
      await mkdir(folder, { recursive: true });
      const handle = await lock(folder);
      if (!handle) throw new Error('Records busy');
      try { doc = await load(folder); stamp = await mtime(folder); }
      finally { await handle.close(); await unlink(join(folder, 'records.lock')); }
    }
  };
  const schedule = () => {
    if (!disposed && !timer) timer = setTimeout(() => { timer = undefined; flush().catch(() => {}); }, 300);
  };
  const lock = async (folder) => {
    const file = join(folder, 'records.lock'), start = Date.now();
    while (true) {
      try { return await open(file, 'wx'); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        try { if (Date.now() - (await stat(file)).mtimeMs > 10000) { await unlink(file); continue; } }
        catch (error) { if (error.code !== 'ENOENT') throw error; continue; }
        if (Date.now() - start >= 2000) return null;
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }
  };
  const flush = () => serial(async () => {
    clearTimeout(timer); timer = undefined;
    if (!queued.length) return;
    const folder = paths();
    if (!folder) return;
    try {
      await mkdir(folder, { recursive: true });
      const handle = await lock(folder);
      if (!handle) { schedule(); return; }
      try {
        let next = await load(folder);
        for (const op of queued) {
          const previous = op.type === 'usage' ? own(next.ledgers, op.sessionId) : null;
          if (previous && previous.at >= op.at && ['miss', 'hit', 'out'].every((key) => previous.seen[key] >= op.seen[key])
            && previous.cost !== null && op.prices[previous.currency]) continue;
          next = applyRecordOp(next, op).doc;
        }
        next = pruneRecords(next);
        next.rev++;
        await writeFile(join(folder, 'records.json.tmp'), JSON.stringify(next), { mode: 0o600 });
        await rename(join(folder, 'records.json.tmp'), join(folder, 'records.json'));
        doc = next; queued = []; stamp = await mtime(folder); failure = undefined;
      } finally { await handle.close(); await unlink(join(folder, 'records.lock')); }
    } catch (error) { failure = error; if (!error.newer) schedule(); throw error; }
  });
  const register = (child) => {
    child.effect(() => () => { disposed = true; clearTimeout(timer); return flush().catch(() => {}); });
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/records',
      handler: async (req, res) => {
        try {
          if (refuseRequest(ctx, req, res, req.method === 'POST' ? 'POST' : 'GET')) return;
          let body;
          if (req.method === 'POST') {
            body = await readJson(req, 512 * 1024);
            if (body === undefined) { reply(res, 413, { status: 'invalid' }); return; }
            if (!Array.isArray(body?.ops) || body.ops.length > 200) { reply(res, 400, { status: 'invalid' }); return; }
          }
          const value = await serial(async () => {
            const folder = paths();
            if (!folder) return { status: 'unavailable' };
            if (failure) throw failure;
            await reload(folder);
            if (req.method === 'POST') {
              const results = body.ops.map((op) => {
                const applied = applyRecordOp(doc, op);
                if (applied.result !== null) { doc = applied.doc; queued.push(structuredClone(op)); }
                return applied.result;
              });
              if (queued.length) schedule();
              return { status: 'ready', rev: doc.rev, results };
            }
            const rev = new URL(req.url, 'http://localhost').searchParams.get('rev');
            if (rev !== null && Number(rev) === doc.rev) return { status: 'ready', rev: doc.rev, unchanged: true };
            const file = join(folder, 'records.json'), home = homedir();
            return { status: 'ready', rev: doc.rev, file: file.startsWith(home + '/') || file.startsWith(home + '\\') ? '~' + file.slice(home.length) : file,
              doc: { billDays: doc.billDays, ledgers: doc.ledgers, runDays: doc.runDays, alerts: doc.alerts } };
          });
          reply(res, 200, value);
        } catch (error) { reply(res, 200, error.newer ? { status: 'unavailable', reason: 'newer' } : { status: 'failed' }); }
      },
    }));
  };
  register.flush = flush;
  return register;
}
