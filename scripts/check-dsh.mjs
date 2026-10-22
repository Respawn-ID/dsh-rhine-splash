import { open, readFile, readdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const CONTRACTS = [
  { feature: "host", needles: ['"webserver/index-inject"', "settings.configure", "webServer.register"] },
  { feature: "theme", needles: ["--dsw-alias-bg-base", "data-ds-dark-theme"] },
  { feature: "brand", needles: ['"sidebar.brand.mark"', '"sidebar.brand.name"', '"conversation.hero.brand.mark"'] },
  { feature: "settings", needles: ['"plugins.row.config"', "whileServed", "SettingsFormModel", "settingsNumberField", "settingsTextField"] },
  { feature: "heroBackground", needles: ["data-phase"] },
  { feature: "notify", needles: ["sessionStatus", "completionUnread", "pendingInteraction", '"plan-review"', "openSession", "selection"] },
  { feature: "todo", needles: ['"sidebar.session.row.hover"', "sessionStatus", "completionUnread", "pendingInteraction", '"plan-review"', "openSession", '"sidebar.footer.action"'] },
  { feature: "billing", needles: ['"sidebar.footer.action"', "binding(", "faceOf", '"tokenUsage"', "directoryFor", "pluginNavigation", "credentials.resolve", "requestRejection"] },
  { feature: "cost", needles: ["selectPanel", "panelInfo", "activePanelId", '"main"'] },
  { feature: "effort", needles: ['"conversation.input.right"', "directoryFor", "subagentAddress", "useAnchoredPosition", "useDismissOnOutsidePointer"] },
  { feature: "archives", needles: ['"sidebar.workspaces.session.menu.item"', '"settings.section"', '"shell.overlay"', "archivedSessionIds", "unarchiveSession", "unpinSession", "detachSession", "sessionPersistence", "requestRejection", "api-session/removed", "missingSessionPaths", "invalidSessionPaths", "coldLogMemo", "sessionProjectionCache", "requireTable", "searchSessions"] },
  { feature: "command", needles: ["popupSelect", "available(", "SettingsFormModel"] }
];

// Usage: node scripts/check-dsh.mjs [app.asar | directory]. Reads only.
const target = resolve(process.argv[2] || "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar");
const versionPath = "dsh/node_modules/@deepseek-ai/dsh-desktop-host/package.json";
const libraryPath = /^dsh\/node_modules\/@deepseek-ai\/[^/]+\/lib\/.*\.js$/;

async function fromDirectory(root) {
  const texts = [];
  let version;
  async function scan(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await scan(path, relative + "/");
      else if (entry.isFile()) {
        if (entry.name.endsWith(".js")) texts.push(await readFile(path, "utf8"));
        if (relative === versionPath) version = JSON.parse(await readFile(path, "utf8")).version;
      }
    }
  }
  await scan(root);
  return { texts, version };
}

async function fromAsar(path) {
  const file = await open(path, "r");
  try {
    const { size } = await file.stat();
    async function bytes(position, length) {
      if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < 0 || length < 0 || position + length > size) {
        throw new Error("Invalid asar byte range");
      }
      const buffer = Buffer.alloc(length);
      let offset = 0;
      while (offset < length) {
        const { bytesRead } = await file.read(buffer, offset, length - offset, position + offset);
        if (!bytesRead) throw new Error("Truncated asar archive");
        offset += bytesRead;
      }
      return buffer;
    }
    const first = await bytes(0, 16);
    const base = 8 + first.readUInt32LE(4);
    const headerLength = first.readUInt32LE(12);
    if (base < 16 + headerLength || base > size) throw new Error("Invalid asar header");
    const header = JSON.parse((await bytes(16, headerLength)).toString("utf8"));
    const entries = new Map();
    function walk(node, prefix = "") {
      for (const [name, entry] of Object.entries(node.files || {})) {
        const relative = prefix + name;
        if (entry.files) walk(entry, relative + "/");
        else entries.set(relative, entry);
      }
    }
    walk(header);
    async function text(relative, seen = new Set()) {
      if (seen.has(relative)) throw new Error("Cyclic asar link: " + relative);
      seen.add(relative);
      const entry = entries.get(relative);
      if (!entry) throw new Error("Missing asar entry: " + relative);
      if (entry.link) return text(entry.link, seen);
      if (entry.unpacked) {
        const root = resolve(path + ".unpacked");
        const unpacked = resolve(root, relative);
        if (!unpacked.startsWith(root + sep)) throw new Error("Invalid unpacked path");
        return readFile(unpacked, "utf8");
      }
      return (await bytes(base + Number(entry.offset), entry.size)).toString("utf8");
    }
    const texts = [];
    for (const relative of entries.keys()) if (libraryPath.test(relative)) texts.push(await text(relative));
    const version = entries.has(versionPath) ? JSON.parse(await text(versionPath)).version : undefined;
    return { texts, version };
  } finally {
    await file.close();
  }
}

try {
  const { texts, version } = (await stat(target)).isDirectory() ? await fromDirectory(target) : await fromAsar(target);
  if (version !== undefined) console.log("Harness version: " + version);
  let failed = 0;
  for (const { feature, needles } of CONTRACTS) {
    const missing = needles.filter((needle) => !texts.some((text) => text.includes(needle)));
    if (missing.length) failed++;
    console.log(feature + ": " + (missing.length ? "MISSING: " + missing.join(", ") : "ok"));
  }
  console.log(`Harness contracts: ${CONTRACTS.length - failed}/${CONTRACTS.length} passed (${texts.length} JavaScript files).`);
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error("Cannot read Harness: " + String(error?.message || error));
  process.exitCode = 2;
}
