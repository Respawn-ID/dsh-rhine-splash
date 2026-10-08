<div align="center">

<img src="icon.svg" width="96" height="96" alt="莱茵生命开屏动画图标">

# 莱茵生命开屏动画

为 DeepSeek Harness 桌面版添加一段莱茵生命风格的开屏动画。

[![Release](https://img.shields.io/github/v/release/Respawn-ID/dsh-rhine-splash?label=release)](https://github.com/Respawn-ID/dsh-rhine-splash/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.0--rc.2-e46f24.svg)](#环境要求)

[安装](#安装) · [配置](#配置) · [动画说明](#动画说明) · [开发](#开发) · [更新日志](CHANGELOG.md)

</div>

## 目录

- [简介](#简介)
- [环境要求](#环境要求)
- [安装](#安装)
- [配置](#配置)
- [动画说明](#动画说明)
- [常见问题](#常见问题)
- [开发](#开发)
- [声明](#声明)
- [许可证](#许可证)

## 简介

`dsh-rhine-splash` 是面向 DeepSeek Harness 桌面版的第三方组合包（bundle），内含一个插件 `rhine-splash`。Harness 启动时，它会在主界面加载前播放一段约 4.5 秒的开屏动画。

视觉语言参考《明日方舟》特别映像「莱茵生命：访问」：暖白底、黑色字标、少量橙色强调，以及档案与仪器式的机能风标注。所有图形与图片均为原创或程序生成，不含《明日方舟》官方素材。

### 特性

- **两幕叙事**：先是权限验证（`REQUESTING ACCESS` → `PERMISSION AUTHORIZED`），再进入终端欢迎页（`WELCOME TO / DEEPSEEK HARNESS / INTERNAL TERMINAL`）。
- **四种退场动画**：舱门、代码消散、故障撕裂、六边形光圈，默认每次随机且不与上一次重复。
- **跟随主题**：读取 Harness 的深浅色设置，浅色与深色各有一套背景素材。
- **不阻塞启动**：主界面就绪后才退场，并设有最长等待时间；随时可以点击或按键跳过。
- **尊重系统设置**：系统开启「减弱动态效果」时，只显示静态画面并淡出。
- **零依赖**：仅使用 Node 内置模块，没有 npm 依赖、DSH peer 依赖或安装脚本。
- **可配置**：文案、强调色、主题、时长与退场动画均可覆盖。

## 环境要求

| 项目 | 要求 |
| --- | --- |
| DeepSeek Harness 桌面版 | 0.2.0-rc.2 |
| Python 3 | 可选，仅本地预览需要 |
| Node.js | 可选，仅运行测试或重新生成图片素材需要 |
| macOS `sips` | 可选，仅重新生成图片素材需要（系统自带） |

## 安装

### 选择安装来源

下文中的 `<来源>` 可以是以下三种之一：

| 来源 | `<来源>` 填写内容 | 适用场景 |
| --- | --- | --- |
| GitHub | `github:Respawn-ID/dsh-rhine-splash`；指定版本时追加标签，如 `github:Respawn-ID/dsh-rhine-splash#v0.1.0` | 推荐。能正常访问 GitHub 时最省事 |
| 发布包 | 从 [Releases](https://github.com/Respawn-ID/dsh-rhine-splash/releases) 下载 `dsh-rhine-splash-<版本>.tgz`，填写它的绝对路径 | GitHub 访问不稳定时。插件页的「改用国内镜像」对 GitHub 地址无效，下载发布包最稳妥 |
| 本地目录 | `git clone` 后的仓库绝对路径，如 `/Users/<用户名>/dsh-rhine-splash` | 需要修改代码时。以链接方式安装，修改后重启 Harness 即可生效 |

> [!NOTE]
> 本组合包不声明 DSH 版本依赖，也没有安装脚本，安装时不会出现版本豁免或「允许构建脚本」的提示。

### 方式一：插件页（推荐）

1. 在 DeepSeek Harness 侧栏打开 **插件**，点击 **添加插件**。
2. 在输入框中填写 `<来源>`，点击 **安装**；完成后点击 **立即启用**。
3. 完全退出 Harness（<kbd>⌘</kbd> + <kbd>Q</kbd>）并重新打开，开屏动画会在启动时播放。

### 方式二：由 dsh agent 安装

1. 在 Harness 中以本仓库目录为工作区新建会话，并切换到 **Creator** 预设。
2. 对 agent 说「安装这个插件」。
3. agent 会读取仓库根目录的 [`AGENTS.md`](AGENTS.md)，调用内置的 `plugin_manager` 工具完成安装。每次调用都会请求你批准。
4. 按提示完全退出并重新打开 Harness。

### 方式三：命令行

1. 在菜单栏选择 **DeepSeek Harness → 管理 dsh 命令… → 安装**，然后新开一个终端，运行 `dsh --version` 确认命令可用。
2. 完全退出 Harness。Harness 运行期间会占用 profile，命令行无法写入。
3. 运行以下命令。路径含空格时必须加引号：

   ```bash
   dsh plugin --profile desktop add "<来源>"
   ```

4. 重新打开 Harness。

### 验证安装

- 插件页中出现「莱茵生命开屏动画」，且开关处于开启状态；或者
- `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 中包含 `dsh-rhine-splash`。该文件仅用于查看，请勿手动编辑。

### 更新

- **本地目录安装**：修改代码后重启 Harness 即可。
- **GitHub 或发布包安装**：Harness 暂不支持组合包自动更新，请先卸载，再安装新版本。各版本变更见 [CHANGELOG.md](CHANGELOG.md) 与 [Releases](https://github.com/Respawn-ID/dsh-rhine-splash/releases)。

### 卸载

| 方式 | 操作 |
| --- | --- |
| 插件页 | 打开「莱茵生命开屏动画」，点击 **卸载**。只想暂时停用时，关闭开关即可 |
| dsh agent | 对 agent 说「卸载这个插件」，它会按 `AGENTS.md` 执行 |
| 命令行 | 先退出 Harness，再运行 `dsh plugin --profile desktop remove dsh-rhine-splash` |

卸载或停用后，重启 Harness 生效。

## 配置

在 `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾按插件 id 追加覆盖项，保留文件原有内容，保存后重启 Harness：

```yaml
- id: rhine-splash
  config:
    title: 'DEEPSEEK HARNESS'
    accentLight: '#e46f24'
    exit: iris
    duration: 5000
```

- 这一层在所有组合包之后应用，对任何安装来源都有效。
- 覆盖会**替换整个 `config` 块**，没有写出的键恢复为默认值。
- 本地目录安装时，也可以直接修改仓库内 `cordis.patch.yml` 的 `config` 块。
- 未知键会被忽略，无效值回退为默认值。
- 时长须写成 YAML 数字，开关须写成布尔值；颜色值必须加引号，否则 `#` 之后的内容会被 YAML 当作注释。

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | 字符串 | `DEEPSEEK HARNESS` | 主标题。去除首尾空白，最多 80 个字符 |
| `subtitle` | 字符串 | `RHINE LAB STYLE · ARTIFICIAL INTELLIGENCE DIVISION` | 副标题。规则同 `title` |
| `code` | 字符串 | `RL-DSH/0.2` | 角落 HUD 编号。规则同 `title` |
| `accentLight` | 颜色 | `#e46f24` | 浅色主题的强调色，`#` 后接 3–8 位十六进制字符 |
| `accentDark` | 颜色 | `#f0893e` | 深色主题的强调色，格式同 `accentLight` |
| `theme` | 枚举 | `auto` | `auto` 跟随 Harness 的外观设置；也可固定为 `light` 或 `dark` |
| `exit` | 枚举 | `random` | 退场动画：`random`、`doors`、`decode`、`glitch` 或 `iris`，见[退场动画](#退场动画) |
| `duration` | 数字（毫秒） | `4500` | 开屏最短时长，范围 0–15000。时间轴随之等比缩放 |
| `maxWait` | 数字（毫秒） | `8000` | 最长等待时长，范围 `duration`–20000。到时无论主界面是否就绪都会退场 |
| `skippable` | 布尔 | `true` | 是否允许点击或按键跳过 |
| `replayOnReload` | 布尔 | `false` | 刷新页面时是否重新播放 |

## 动画说明

### 时间轴

动画分为两幕，由纯 CSS 动画、内联 SVG 和程序生成的位图（板条阵列背景、显微样本图）组成。下表时间点基于默认的 `duration: 4500`，修改 `duration` 后按比例缩放。

| 时间 | 阶段 | 画面 |
| --- | --- | --- |
| 0–0.5 秒 | 框架 | 顶部状态栏（`REQUESTING ACCESS`）、四角括号、左上字标和左侧 01–05 索引栏依次就位；背景板条阵列与大圆弧轨道缓慢进场 |
| 0.25–1.45 秒 | 第一幕 · 权限验证 | `REQUESTING ACCESS...` 逐字解码为宽字距的 `PERMISSION AUTHORIZED`；外围 HUD 按顺时针依次启动：右上显微样本 → 右下警示条与进度 → 左下档案框 |
| 1.25 秒 | 授权节拍 | 状态栏切换为 `ACCESS GRANTED`，索引 02 点亮，`• ID CONFIRMED` 升起，两个橙点同时闪烁 |
| 1.4–2.1 秒 | 转场 | 字母向两侧散开，一道橙色细线从中心展开，交接给徽记的基准线 |
| 1.6–3.3 秒 | 第二幕 · 欢迎进入终端 | 徽记描线，毛玻璃面板展开，依次显示 `WELCOME TO`、反白标题和 `INTERNAL TERMINAL`；标题下方的 LINK 链路条随会话进度推进（读数头、指针与流光）；模块方块依次翻入（索引 03），会话建立（索引 04） |
| 3.3 秒 | 就绪节拍 | 状态栏切换为 `TERMINAL READY`，四角括号闪烁橙色，索引 05 点亮，进度与链路条到达 97% |
| 末尾 0.7–1.1 秒 | 退场 | 两个计量条冲满，随后播放一种退场动画 |

### 退场动画

默认每次启动随机选择一种，且不与上一次重复；也可以通过 `exit` 固定为其中一种。开屏总时长保持不变：退场动画越长，开始退场的时间就越早。

| `exit` | 名称 | 时长 | 画面 |
| --- | --- | --- | --- |
| `doors` | 舱门 | 0.82 秒 | 内容淡出，橙色光缝展开，上下两扇舱门分开 |
| `decode` | 代码消散 | 1.1 秒 | 第一道前沿把画面「编码」为满屏等宽字符；第二道锯齿前沿让字符逐格闪烁清除，前沿处高亮为橙色 |
| `glitch` | 故障撕裂 | 0.72 秒 | 画面切分为 7 条水平条带，经过三次随机错位并伴有红青色分离，随后随机闪烁消失，同时扫过橙色扫描条 |
| `iris` | 六边形光圈 | 1.1 秒 | 先用 0.3 秒把视线引向徽记：周围画面压暗，橙色基准线收回徽记，徽记六边形蓄能并扩散出三道六边形脉冲；随后从徽记中心打开六边形孔径，双层橙色描边沿孔边扩张至全屏 |

> [!NOTE]
> 系统开启「减弱动态效果」时，无论 `exit` 如何配置，都只做简单淡出。

### 行为细节

- **退场时机**：播放满 `duration` 且 Harness 主界面已渲染后才退场。主界面迟迟未出现时，最多等待 `maxWait`；另有硬性兜底，覆盖层不会卡住界面。
- **跳过**：点击任意位置，或按 <kbd>Esc</kbd>、<kbd>Enter</kbd>、<kbd>Space</kbd>。顶部 44 px 保留为窗口拖动区。
- **每次启动只播放一次**：按 <kbd>⌘</kbd> + <kbd>R</kbd> 刷新页面不会重播；设置 `replayOnReload: true` 后会重播。
- **减弱动态效果**：系统开启该选项时，跳过第一幕，只显示静态的第二幕，约 0.9 秒后淡出。
- **深浅色**：`theme: auto` 时读取 Harness 的外观设置（**设置 → 通用 → 外观**）；脱离 Harness 运行（如预览页）时跟随系统。
- **小窗口**：窗口较窄或较矮时，依次隐藏显微样本、档案框、索引栏和水印，保证主体内容不重叠。

## 常见问题

**安装后没有看到开屏动画？**

开屏动画只在启动时播放，且每次启动只播放一次。请确认插件已启用，然后用 <kbd>⌘</kbd> + <kbd>Q</kbd> 完全退出 Harness 再重新打开；仅关闭窗口或刷新页面不会触发。

**命令行提示 `Open DeepSeek Harness Desktop once to initialize its profile, then fully quit it`？**

说明 Harness 从未启动过，或者仍在运行。先打开一次 Harness，再完全退出，然后重新执行命令。

**终端找不到 `dsh` 命令？**

在菜单栏选择 **DeepSeek Harness → 管理 dsh 命令… → 安装**，或者直接使用完整路径：

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add "<来源>"
```

**插件页从 GitHub 安装失败？**

下载 [Releases](https://github.com/Respawn-ID/dsh-rhine-splash/releases) 中的 `dsh-rhine-splash-<版本>.tgz`，改用它的绝对路径安装。

**插件导致 Harness 启动异常？**

Harness 会自动备份 patch 并禁用第三方组合包，便于恢复。图片素材缺失时，插件只记录警告，动画照常播放，只是缺少对应背景。

## 开发

### 工作原理

组合包只包含宿主端入口 `lib/index.js`。Harness 启动时，宿主通过 `webserver/index-inject` 事件向页面注入样式行和 body 脚本，因此开屏动画会在 React 外壳启动之前出现。注入使用默认的追加顺序，位于主题引导行之后，不使用 `prepend`。图片素材以 data URI 形式内联进样式。

### 目录结构

```text
.
├── AGENTS.md              # 面向模型的安装与开发说明（dsh agent 会自动读取）
├── CHANGELOG.md           # 更新日志
├── package.json           # 组合包元数据与 npm 脚本
├── cordis.patch.yml       # 插件插入行与默认配置
├── icon.svg               # 组合包图标
├── assets/                # 板条阵列背景（浅色 / 深色）与显微样本图
├── lib/
│   ├── index.js           # 宿主端入口：配置校验与注入
│   ├── splash.css         # 开屏样式与时间轴
│   └── splash.js          # 开屏动画与退场动画脚本
├── locale/                # 插件页显示的中英文名称与简介
├── preview/               # 独立的浏览器预览页
├── scripts/
│   ├── test-host.mjs      # 宿主端测试（无依赖）
│   └── render-assets.mjs  # 图片素材生成脚本
├── .github/
│   └── RELEASE_TEMPLATE.md  # Release 说明模板
└── .claude/launch.json    # 预览服务启动配置
```

### 本地预览

```bash
npm run preview
```

然后打开 <http://localhost:4173/preview/>。预览服务基于 Python 3，按 <kbd>Ctrl</kbd> + <kbd>C</kbd> 停止。

- 页面底部的控制栏可以切换退场动画、深浅色、时长、模拟主界面就绪时间（立即 / 1.2 秒 / 6 秒 / 永不）以及减弱动态效果。
- 按 <kbd>R</kbd> 或点击 **重播** 再次播放。
- 支持 URL 参数 `theme`、`exit`、`duration`、`ready`、`reduced`，例如 `?theme=dark&duration=6000&ready=-1`。

预览页只用于检查动画外观；宿主注入行为由测试和实际运行的 Harness 验证。

### 测试

```bash
npm test                    # 宿主端测试
node --check lib/splash.js  # 浏览器脚本语法检查
```

测试覆盖默认值、配置校验与范围限制、HTML 转义、注入顺序和宿主注册：

- 动画资源尚未生成时，用模拟资源验证注入，并确认宿主会安全跳过注册。
- 资源齐全时，触发实际注册的处理函数，检查样式行与 body 脚本行。

### 图片素材

`assets/` 中的三张图片由 `scripts/render-assets.mjs` 程序化生成，只依赖 Node 与 macOS 自带的 `sips`，结果可复现。

| 文件 | 尺寸 | 内容 |
| --- | --- | --- |
| `bars-light.jpg`、`bars-dark.jpg` | 3200 × 1800（2 倍分辨率，适配 Retina 屏幕） | 透视立板阵列背景，左侧 35% 为纯背景色 |
| `specimen.jpg` | 320 × 320 | 扫描电镜风格的细胞样本，在显微圆窗中放大至 170% 显示 |

- 重新生成全部素材：`npm run assets`。耗时约 30 秒，峰值内存约 1 GB，并会覆盖 `assets/`。
- 只重新生成样本图：`node scripts/render-assets.mjs specimen`。

### 动效约定

- 统一使用四条缓动曲线：进场、描线擦除、退场、弹出。
- 所有循环动画（呼吸灯、光标、扫描线、警示条、旋转）都按 1.2 秒基础节拍的整数倍运行。
- 节拍时间点定义在 `lib/splash.css` 顶部的 `--B`、`--G`、`--R` 与 `lib/splash.js` 的 `BEAT` 中，两处必须保持一致。
- 所有 CSS 限定在 `#rhine-splash` 作用域内，类名使用 `rl-` 前缀。
- 新增退场动画时，在 `lib/splash.js` 的 `EXITS` 中注册。

### 发布流程

1. 在分支上开发，用 `git merge --no-ff` 合并回 `main`。
2. 更新 `package.json` 的 `version`，并把 `CHANGELOG.md` 中「未发布」小节整理为新版本。
3. 运行 `npm test` 与 `node --check lib/splash.js`。
4. 打标签并推送：`git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`。
5. 运行 `npm pack` 生成 `dsh-rhine-splash-X.Y.Z.tgz`。
6. 在 GitHub 新建 Release，按 [`.github/RELEASE_TEMPLATE.md`](.github/RELEASE_TEMPLATE.md) 填写标题与正文，并上传 tgz。

## 声明

- 本项目是非官方的第三方组合包，与《明日方舟》的权利方鹰角网络（Hypergryph）没有任何关联。
- 视觉语言参考《明日方舟》特别映像「莱茵生命：访问」。所有图形与图片均为原创或程序生成，不包含《明日方舟》官方 Logo、角色或美术素材。
- 《明日方舟》及相关名称、标识归其权利人所有。

## 许可证

[MIT](LICENSE) © 2026 ArtemisFowl
