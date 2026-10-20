# AGENTS.md — dsh-rhine-splash

A DeepSeek Harness (dsh) **bundle** that plays a Rhine Lab style boot splash in the desktop app and in `dsh web`, re-themes the interface through design tokens, and replaces the brand marks. Read this before installing, configuring, removing, or changing it. Reply to the user in their language (the owner writes Chinese).

## Facts

| Item | Value |
| --- | --- |
| Package / bundle name | `dsh-rhine-splash` |
| Display name | 莱茵生命主题 (en: Rhine Lab Theme) — what the Plugins page lists |
| Plugin entry id | `rhine-splash` |
| Version | see `package.json` |
| Install source (remote) | `github:Respawn-ID/dsh-rhine-splash` (pin with `#vX.Y.Z`), or the absolute path of a release `.tgz` from https://github.com/Respawn-ID/dsh-rhine-splash/releases |
| Install source (local) | absolute path of this repository root — the directory containing this file. Get it with `pwd`; it may contain spaces. Prefer this when you are working inside a clone. |
| DSH peer dependencies | none → never request or grant a version exemption |
| Install scripts | none → never pass `approvedBuilds` |
| Takes effect | on the next app launch; the splash plays once per launch |

## Install with the `plugin_manager` tool (inside dsh)

1. Call `plugin_manager` with `{ "action": "list_bundles" }`. Look for an entry named `dsh-rhine-splash`.
   - Present and enabled → already installed. Tell the user and stop.
   - Present but disabled → call `{ "action": "set_bundle", "target": "dsh-rhine-splash", "enabled": true }`, then go to step 3.
2. Call `{ "action": "install_bundle", "target": "<source>" }`, where `<source>` is the absolute repository path when you are inside a clone, and otherwise `github:Respawn-ID/dsh-rhine-splash`. Pass paths exactly, spaces included, without quotes. The bundle is enabled by default. If GitHub is unreachable, ask the user to download the release `.tgz` and install from its path.
3. Tell the user to fully quit DeepSeek Harness (⌘Q) and reopen it to see the splash.

Each call asks the user for approval; that is expected. If `plugin_manager` is not available in this session, do not edit profile files by hand. Tell the user to either switch the session to the **Creator** preset or install from the sidebar: **插件 → 添加插件**, paste the repository path, then **立即启用** and restart.

## Install from a shell (other coding agents)

Run this only if the user asks for a terminal install. The desktop app must be fully quit first, because it holds the profile.

```bash
dsh plugin --profile desktop add "<absolute repository path>"
```

- If `dsh` is not on PATH, use `"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"`, or ask the user to run the menu item **DeepSeek Harness → 管理 dsh 命令… → 安装**.
- The error `Open DeepSeek Harness Desktop once to initialize its profile, then fully quit it` means the app has never run, or it is still running.
- A successful install adds `dsh-rhine-splash` to `dsh.profile.bundles` in `~/.dsh/profiles/desktop/package.json`. That file is the read-only way to verify the install.
- Web app (`dsh web`): stop it, then run `dsh plugin --profile web add "<source>"` and start `dsh web` again. dsh calls the `pnpm` on PATH; if it is missing, tell the user rather than installing it. Paths and verification are the same with `web` in place of `desktop`.

## Configure

Prefer the UI: the config page (sidebar **插件** → this plugin → **配置**) or the `/splash` command; both save through dsh settings. The page saves each change immediately (text fields on blur or Enter), its single **恢复默认** button resets every changed field at once, and its preview plays the current settings. Otherwise, append an override to `~/.dsh/profiles/desktop/cordis.patch.yml` and keep the existing content. The override replaces the whole `config` block; omitted keys fall back to their defaults. Restart the app afterwards.

```yaml
- id: rhine-splash
  config:
    exit: iris
    duration: 5000
```

| Key | Default | Allowed |
| --- | --- | --- |
| `enabled` | `true` | boolean — splash on launch (theme/brand unaffected) |
| `uiTheme` | `true` | boolean — Rhine interface theme |
| `brand` | `true` | boolean — replace sidebar and conversation brand marks |
| `logo` | `plate` | `plate` \| `cell` |
| `effortSlider` | `true` | boolean — reasoning effort slider next to the model selector |
| `billing` | `true` | boolean — conversation cost and account balance card in the sidebar footer |
| `todoCenter` | `true` | boolean — to-do center in the sidebar footer (conversations waiting for you, finished unread, running) and the `/todo` command |
| `heroBackground` | `random` | `random` (per launch, never repeats the last one) \| `grid` \| `bars` \| `full` \| `off` — blank conversation page background |
| `resumeEffect` | `random` | `random` (per play, never repeats the last one) \| `scan` \| `iris` \| `glitch` \| `off` — effect when the window returns from the background |
| `resumeTrigger` | `away` | `away` (back after ≥ 30 s away) \| `always` (every refocus) \| `hidden` (only after minimize / hide / another Space) |
| `notifyCurrent`, `notifyOthers`, `notifyAway` | `true` | booleans — when Rhine notices fire: for the open conversation, for other conversations while in the app, while the app is unfocused or hidden |
| `notifySystem`, `notifyToast`, `notifySound` | `true` | booleans — Rhine notices when a run ends or waits for the user: system notification (only while the window is in the background), in-app card, chime |
| `title`, `subtitle`, `code` | `DEEPSEEK HARNESS`, `RHINE LAB STYLE · ARTIFICIAL INTELLIGENCE DIVISION`, `RL-DSH/0.2` | strings, ≤ 80 chars |
| `accentLight`, `accentDark` | `#e46f24`, `#f0893e` | quoted `#` hex, 3–8 digits |
| `theme` | `auto` | `auto` \| `light` \| `dark` |
| `exit` | `random` | `random` (never repeats the last one) \| `doors` \| `decode` \| `glitch` \| `iris` |
| `duration` | `4500` | ms, 0–15000; the timeline scales with it |
| `maxWait` | `8000` | ms, ≥ `duration`, ≤ 20000 |
| `skippable` | `true` | boolean |
| `replayOnReload` | `false` | boolean |

## Uninstall

Use `plugin_manager` `{ "action": "remove_bundle", "target": "dsh-rhine-splash" }`. From a shell, with the app quit, run `dsh plugin --profile desktop remove dsh-rhine-splash`. Either way, restart the app afterwards. To pause the splash without uninstalling, use `set_bundle` with `"enabled": false`.

## Never

- Modify anything inside `/Applications/DeepSeek Harness.app` (signed, integrity-checked).
- Hand-edit `~/.dsh/profiles/desktop/package.json` or `pnpm-workspace.yaml`.
- Grant version exemptions, or pass `approvedBuilds`.
- Run `npm run assets` unless asked. It takes about 30 s, uses about 1 GB of memory, and rewrites `assets/`.

## Development

- `cordis.patch.yml` must not carry a `config` block: defaults live in the `Config` schema in `lib/index.js`. dsh copies the whole merged config into the user layer on the first save, so a bundle-level block would mark every field as overridden.
- `lib/index.js`: host half. It validates config and injects a style row and a body script through the `webserver/index-inject` event, so the splash appears before the shell boots. Images are inlined as data URIs.
- Host config is a schemastery `Config` (all fields `.volatile()`), read on every index render; `@deepseek-ai/schemastery` is an optional peer resolved from the dsh runtime.
- `lib/theme.css`: interface theme, `--dsw-*` token overrides only (never component class names). `lib/brand/`: `mark-plate.svg`, `mark-cell.svg` (optional `hero-<logo>.svg`), `name.html`; injected as `globalThis.__RHINE_BRAND__`.
- `lib/client.js`: browser half in the shipped `window.__ModuleLoader__.load` format, no build step, so it stays one file. Layout: constants and the `FIELDS` / `SECTIONS` / `PREVIEWS` tables (they generate the config page groups, `specs()`, the `/splash` rows and their validation), locale, the self-contained `// <resume-layer>` and `// <notice-layer>` blocks, the `CSS` array, components, then one `register…(ctx, …)` function per feature, wired in order by `apply`. To add a setting, add a `FIELDS` entry (plus the host schema, `DEFAULTS` and validation); to add a feature, add a registrar and call it from `apply`. Host features live in `lib/host/` (`billing.js`, `archives.js`), re-exported from `lib/index.js` for the tests. It occupies the single `sidebar.brand.*` slots (the bundle patch disables `ui-brand-official`), `conversation.hero.brand.mark`, the Plugins-page `plugins.row.config` page, the `/splash` and `/todo` popup commands, and the composer `conversation.input.right` effort slider. The slider reads and writes the same per-session directory as the official model selector (`modelDirectories` service from `@deepseek-ai/dsh-client-ui-model-selection`); any scope that calls `modelDirectories.directoryFor()` must also inject `remote` and `remote.session`, because the service resolves `ctx.remote.session` through the caller's scope when it creates a directory; `preview/effort.html` renders its styles from the `CSS` array in `client.js`.
- Commands: every `commandUi.register()` contribution must carry `available(session)` (return `true` when always available). dsh calls it for each contribution while building the slash menu, and one contribution without it makes the whole menu fail, official commands included.
- Billing: the host registers `GET /rhine-splash/balance` on dsh's web server (auth via the `connection` service), resolves `DEEPSEEK_API_KEY` through the `credentials` service and queries `https://api.deepseek.com/user/balance`, returning amounts only (cached 60 s). Never log or return the key. The client `sidebar.footer.action` card prices the open session's `tokenUsage` projection with the table in `priceOf()` (update it when DeepSeek's prices change) and keeps a per-session ledger in `localStorage`.
- Deleting archived conversations: the host serves `POST /rhine-splash/sessions/delete` (connection auth plus an `x-rhine-splash: 1` header). It only acts on ids in `workspaceRegistry.archivedSessionIds` that are not loaded (`sessions.get(id)`), checks the folder is a `session-*` folder under `sessionPersistence.root`, and moves it to the trash (`trashTarget()`), never deleting it. At startup the host drops archived ids whose conversation no longer exists (`staleArchivedIds()` + `workspaceRegistry.unarchiveSession`, which accepts missing sessions), so deleted conversations do not linger in the archive set. The client adds a two-click danger item to `sidebar.workspaces.session.menu.item`, plus a native settings page (`ArchiveSection`, `settings.section` id `archived-sessions`, which dsh already maps to its archive icon; skipped if dsh registers that id itself) that deletes selected archived sessions one at a time through the same endpoint.
- Blank page background: pure CSS in the client `CSS` array. The client sets `<html data-rl-hero="grid|bars|full">` (and `--rl-hb-label` from `code`); the rules draw `::before` / `::after` at `z-index:-1` on the conversation root while it carries `data-phase="hero"` (the official conversation module's blank state; its CSS module class names are hashed, so never target those). The bars image variables reach it because `buildAssetStyle()` emits `#rhine-splash,[data-phase=hero]`. If a Harness update renames `data-phase`, the background simply stops showing.
- Rhine notices (`registerNotify`): subscribes to `uiSession.sessionStatus` (service from `@deepseek-ai/dsh-client-ui-session`; a `Map` of `{ running, pendingInteraction, completionUnread }` per session). A run ending is `running` true → false; `pendingInteraction` appearing means the agent waits (`pendingInteraction.kind` is `approval`, with `toolName`, `question` or `plan-review`). The first snapshot is only a baseline; only ids in `sessions.list` are considered, and each event is classed as `notifyAway` (window hidden or unfocused), `notifyCurrent` (the open conversation) or `notifyOthers`, and dropped when that switch is off. Clicks call `uiWorkspace.openSession(id)`. System notifications carry the title and status only, never content, and are sent only while the window is unfocused or hidden (the desktop app grants the `notifications` permission; macOS may still block it per app); cards show at once while the window is visible and queue only while it is hidden. Never scrape the DOM for run state.
- To-do center (`registerTodo`, `TodoWidget`): reads the same `sessionStatus` store. `todoKind()` ranks a conversation as `pending` (any `pendingInteraction`), `running`, or `done` (`completionUnread`, which dsh clears when the conversation is opened); `todoGroups()` skips subagents (`origin: "subagent"`), blank placeholders and ids missing from `sessions.list`. Durations come from the plugin's own `since` map (state changes seen after the list is ready); older states fall back to the row's `updatedAt`. The trigger is a `sidebar.footer.action` entry (`order: -20`, left of the billing card) with three layouts in `data-mode`: `tile` beside the billing card, `bar` without it, `rail` when the sidebar is collapsed. The panel is portalled to `document.body`, positioned from the trigger's rect, and closes on Escape, an outside pointer press or a pick. `preview/todo.html` mirrors its markup.
- Resume effects: the block between `// <resume-layer>` and `// </resume-layer>` in `lib/client.js` (`RESUME_MS`, `resumeLayer(doc, kind)`) is self-contained so `preview/hero.html` can lift it; keep it free of closure state. The trigger listens to window `blur`/`focus` and `visibilitychange` (blur into an in-page iframe does not count), skips while `#rhine-splash` is present or reduced motion is on, and keeps the away state until the window is actually visible. The overlay (`pointer-events:none`, appended to `body`) starts only after two animation frames plus a short settle delay, so the opening is not lost while the window is being brought forward, and is removed when its own animations finish (`RESUME_MS[kind]` + 2 s is only a fallback).
- `lib/splash.css` and `lib/splash.js`: the splash itself; `globalThis.__rhineSplash.replay({ exit })` replays it on demand. All CSS stays scoped under `#rhine-splash` with an `rl-` prefix.
  - Beats: `--B`, `--G` and `--R` in CSS must match `BEAT` in JS.
  - Exits are registered in `EXITS`. The reduced-motion setting always uses a plain fade.
- Checks: `npm test`, plus `node --check lib/splash.js`. Preview with `npm run preview`, then open `http://localhost:4173/preview/`; the page has selectors for exit, theme and duration.
- Version control: work on a branch, merge with `--no-ff`, and tag releases (`vX.Y.Z`). Keep `package.json` `version` in sync with the tag.
- Changelog and releases: `CHANGELOG.md` follows Keep a Changelog; add entries under `[未发布]`. Write release notes from `.github/RELEASE_TEMPLATE.md`, title `vX.Y.Z · <summary>`, and attach the `npm pack` tarball.
