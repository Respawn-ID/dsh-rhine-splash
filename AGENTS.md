# AGENTS.md — dsh-rhine-splash

A DeepSeek Harness (dsh) **bundle** that plays a Rhine Lab style boot splash in the desktop app. Read this before installing, configuring, removing, or changing it. Reply to the user in their language (the owner writes Chinese).

## Facts

| Item | Value |
| --- | --- |
| Package / bundle name | `dsh-rhine-splash` |
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

## Configure

Append an override to `~/.dsh/profiles/desktop/cordis.patch.yml` and keep the existing content. The override replaces the whole `config` block; omitted keys fall back to their defaults. Restart the app afterwards.

```yaml
- id: rhine-splash
  config:
    exit: iris
    duration: 5000
```

| Key | Default | Allowed |
| --- | --- | --- |
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

- `lib/index.js`: host half. It validates config and injects a style row and a body script through the `webserver/index-inject` event, so the splash appears before the shell boots. Images are inlined as data URIs.
- `lib/splash.css` and `lib/splash.js`: the browser half. All CSS stays scoped under `#rhine-splash` with an `rl-` prefix.
  - Beats: `--B`, `--G` and `--R` in CSS must match `BEAT` in JS.
  - Exits are registered in `EXITS`. The reduced-motion setting always uses a plain fade.
- Checks: `npm test`, plus `node --check lib/splash.js`. Preview with `npm run preview`, then open `http://localhost:4173/preview/`; the page has selectors for exit, theme and duration.
- Version control: work on a branch, merge with `--no-ff`, and tag releases (`vX.Y.Z`). Keep `package.json` `version` in sync with the tag.
