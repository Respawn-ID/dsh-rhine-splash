# 莱茵生命开屏动画

## 简介

面向 DeepSeek Harness 桌面版 v0.2.0-rc.2 的第三方组合包。
启动时播放莱茵生命灵感的原创几何科研风开屏动画，不含明日方舟官方素材。
默认跟随系统深浅色，可点击跳过；文案、配色、时长与退场动画均可配置。
安装见下文「安装」；给模型（dsh 的 agent、Claude Code、Codex 等）的说明在 `AGENTS.md`。
仓库：<https://github.com/Respawn-ID/dsh-rhine-splash> · 许可：MIT

插件仅包含宿主端入口，使用 Node 内置模块，无 npm 依赖或 DSH peer 依赖。
宿主通过 `webserver/index-inject` 注入样式与脚本，桌面前端在 React 外壳启动前应用。
注入使用默认追加顺序，位于主题引导行之后，不使用 `prepend`。

## 动画说明

约 4.5 秒，分两幕，纯 CSS 动画 + 内联 SVG + 两张 Codex 生成的位图（板条阵列背景、显微样本图）。
视觉语言参考《明日方舟》特别映像「莱茵生命：访问」：暖白底、黑色字标、少量橙色强调、档案与仪器式的机能风标注。

| 时间 | 画面 |
| --- | --- |
| 0–0.5s | **框架**：顶部状态栏（REQUESTING ACCESS）、四角括号、左上字标、左侧 01–05 索引栏主轴；背景板条阵列、大圆弧轨道缓慢进场 |
| 0.25–1.45s | **第一幕 · 权限验证**：`REQUESTING ACCESS...` 逐字解码为宽字距 `PERMISSION AUTHORIZED`；外围 HUD 按顺时针依次启动（右上显微样本 → 右下警示条与进度 → 左下档案框） |
| 1.25s | **授权节拍**：状态栏切到 ACCESS GRANTED、索引 02 点亮、`• ID CONFIRMED` 升起、两个橙点同时闪烁 |
| 1.4–2.1s | **转场**：字母向两侧散开，一道橙色细线从中心展开，交棒给徽记的基准线 |
| 1.6–3.3s | **第二幕 · 欢迎进入终端**：徽记描线、毛玻璃面板展开、`WELCOME TO / 反白标题 / INTERNAL TERMINAL`；标题下的 **LINK 链路条** 随会话进度推进（读数头 + 指针 + 流光）；模块方块依次翻入（索引 03），会话建立（索引 04） |
| 3.3s | **就绪节拍**：状态栏 TERMINAL READY、四角括号闪橙、索引 05 点亮、进度与链路条到 97% |
| 退场（约 0.7–1.1s） | 两个计量条冲满，随后播放一种退场动画，见下方「退场动画」 |

动效统一使用四条缓动曲线（进场 / 描线擦除 / 退场 / 弹出），所有循环动画（呼吸灯、光标、扫描线、警示条、旋转）都按 1.2 秒基础节拍的整数倍运行；节拍时间点定义在 `lib/splash.css` 顶部的 `--B / --G / --R` 和 `lib/splash.js` 的 `BEAT`，两边需保持一致。

- **结束条件**：播放满 `duration` 且 Harness 主界面已渲染才退场；主界面迟迟未出现时最多等到 `maxWait`，另有硬性兜底，覆盖层不会卡住界面。
- **跳过**：点击任意处，或按 Esc / Enter / 空格。顶部 44px 保留为窗口拖动区。
- **每次启动播放一次**：Cmd+R 刷新页面不会重播（`replayOnReload: true` 可改）。
- **减少动态效果**：系统开启「减弱动态效果」时跳过第一幕，只显示静态的第二幕约 0.9 秒后淡出。
- **深浅色**：`theme: auto` 时读取 Harness 当前主题（设置 → 通用 → 外观），否则跟随系统；两套位图分别对应浅色和深色底。
- **小窗口**：窗口较窄或较矮时会依次隐藏显微样本、档案框、索引栏和水印，保证主体不重叠。
- 所有图形与图片均为原创/程序生成，不含明日方舟官方 Logo、角色或美术素材。

### 退场动画

默认每次启动随机选一种，且不与上一次重复；可在配置 `exit` 里固定为某一种。总时长不变：退场越长，进入退场的时间就越早。

| `exit` | 名称 | 时长 | 画面 |
| --- | --- | --- | --- |
| `doors` | 舱门 | 0.82s | 内容淡出，橙色光缝展开，上下两扇舱门分开 |
| `decode` | 代码消散 | 1.1s | 一道前沿把画面「编码」成满屏等宽字符，第二道锯齿前沿让字符逐格闪烁清除，前沿处高亮橙色 |
| `glitch` | 故障撕裂 | 0.72s | 画面切成 7 条水平条带，三次随机错位并带红青色分离，再随机闪烁消失，伴随橙色扫描条 |
| `iris` | 六边形光圈 | 1.1s | 先用 0.3s 把视线引到徽记：周围画面压暗、橙色基准线收回徽记、徽记六边形蓄能、三道六边形脉冲扩散；随后从徽记中心打开六边形孔径，双层橙色描边沿孔边扩张到全屏 |

系统开启「减弱动态效果」时，无论配置如何都只做简单淡出。

## 目录结构

```text
.
├── AGENTS.md              # 给模型看的安装/开发说明（dsh 的 agent 会自动读取）
├── package.json           # 组合包元数据与命令
├── cordis.patch.yml       # 插件插入行与可编辑配置
├── icon.svg               # 组合包图标
├── assets/                # 板条阵列背景（浅/深）与显微样本图
├── lib/
│   ├── index.js           # 宿主入口、配置校验与注入
│   ├── splash.css         # 开屏样式与时间轴
│   └── splash.js          # 开屏动画与退场动画脚本
├── locale/                # 插件页显示的中英文名称与简介
├── scripts/
│   ├── test-host.mjs      # 无依赖宿主测试
│   └── render-assets.mjs  # 图片素材生成脚本
├── preview/               # 独立浏览器预览
└── .claude/launch.json    # 预览启动配置
```

## 安装

插件来源（下文 `<来源>`）三选一：

| 来源 | 填什么 | 适合 |
| --- | --- | --- |
| GitHub | `github:Respawn-ID/dsh-rhine-splash`（指定版本：`github:Respawn-ID/dsh-rhine-splash#v0.1.0`） | 最省事，直接从仓库安装 |
| 打包文件 | 从 [Releases](https://github.com/Respawn-ID/dsh-rhine-splash/releases) 下载 `dsh-rhine-splash-<版本>.tgz`，填它的绝对路径 | 访问 GitHub 不稳定时（插件页安装失败可选「改用国内镜像」也解决不了 GitHub 地址，下载 tgz 最稳） |
| 本地文件夹 | `git clone` 后本项目的绝对路径，如 `/Users/<你>/dsh-rhine-splash` | 想改代码：以链接方式安装，改完重启 app 即生效 |

插件不声明 DSH 版本依赖、也没有安装脚本，安装时不会出现版本豁免或「允许构建脚本」的提示。

### 方式一：插件页（推荐）

1. DeepSeek Harness 侧栏点 **插件** →「添加插件」。
2. 输入框填 `<来源>`，点「安装」；完成后点「立即启用」。
3. 完全退出（⌘Q）再重新打开 DeepSeek Harness，开屏动画会在启动时播放。

### 方式二：让 dsh 的 agent 安装

在 dsh 里以本项目文件夹为工作区新建会话，对它说「安装这个插件」。agent 会读取仓库根目录的 `AGENTS.md`，用内置的 `plugin_manager` 工具完成安装并提醒你重启。该工具只在 **Creator** 模式下开放，执行前会请求你批准。

### 方式三：命令行

1. 菜单栏「DeepSeek Harness → 管理 dsh 命令…」→「安装」，新开一个终端，运行 `dsh --version` 确认可用。
2. 完全退出 DeepSeek Harness（app 运行时 profile 被占用）。
3. 运行（路径含空格，必须加引号）：

   ```bash
   dsh plugin --profile desktop add "<来源>"
   ```

4. 重新打开 DeepSeek Harness。

### 更新

- 本地文件夹安装：修改代码后重启 app 即可。
- GitHub 或打包文件安装：Harness 暂不支持插件自动更新，先卸载，再安装新版（版本记录见 `CHANGELOG.md` 与 Releases）。

## 配置项

推荐在 `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾按 id 覆盖，保存后重启 app。
这一层在所有组合包之后应用，对任何安装来源都有效；覆盖会替换整个 `config`，没写的键回到默认值。
（本地文件夹安装时，直接改本项目 `cordis.patch.yml` 里的 `config` 块也可以。）
未知键会被忽略，无效值回退为默认值。

```yaml
- id: rhine-splash
  config:
    title: 'DEEPSEEK HARNESS'
    duration: 5000
```

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `title` | `DEEPSEEK HARNESS` | 主标题，去除两端空白，最多 80 个字符 |
| `subtitle` | `RHINE LAB STYLE · ARTIFICIAL INTELLIGENCE DIVISION` | 副标题，去除两端空白，最多 80 个字符 |
| `code` | `RL-DSH/0.2` | 角落 HUD 编号，去除两端空白，最多 80 个字符 |
| `accentLight` | `#e46f24` | 浅色模式强调色（橙），`#` 后为 3–8 位十六进制字符 |
| `accentDark` | `#f0893e` | 深色模式强调色（橙），`#` 后为 3–8 位十六进制字符 |
| `theme` | `auto` | `auto` 跟随系统，也可固定为 `light` 或 `dark` |
| `duration` | `4500` | 开屏总时长（毫秒），限制在 0–15000；动画节奏随之等比缩放 |
| `maxWait` | `8000` | 强制退出等待时长（毫秒），限制在 `duration`–20000 |
| `skippable` | `true` | 是否允许点击跳过 |
| `replayOnReload` | `false` | 是否在页面刷新时重新播放 |
| `exit` | `random` | 退场动画：`random`（随机、不与上次重复）/ `doors` / `decode` / `glitch` / `iris` |

`maxWait` 确保应用尚未渲染时也会结束动画。
时长配置需使用 YAML 数字，开关需使用布尔值，颜色应加引号。

## 预览

在项目目录运行 `npm run preview`，然后打开：
[http://localhost:4173/preview/](http://localhost:4173/preview/)。
预览服务器使用 Python 3；按 `Ctrl+C` 停止服务。
页面底部可切换深浅色、时长、模拟主界面就绪时间（立即 / 1.2s / 6s / 永不）和减少动态效果，
按 `R` 或「重播」再次播放；也支持 URL 参数，如 `?theme=dark&duration=6000&ready=-1`。
预览页面用于检查动画外观，宿主注入行为由测试与实际 app 验证。

## 图片素材

`assets/` 里的三张图由 `scripts/render-assets.mjs` 程序化生成（纯 Node + macOS 自带 `sips`，无依赖，结果可复现）：

| 文件 | 尺寸 | 内容 |
| --- | --- | --- |
| `bars-light.jpg` / `bars-dark.jpg` | 3200×1800（2× 分辨率，Retina 下不糊） | 透视立板阵列背景，左侧 35% 为纯背景色 |
| `specimen.jpg` | 320×320 | 扫描电镜风格的细胞样本，显微圆窗里放大 170% 显示 |

- 重新生成全部：`npm run assets`（约 30 秒，峰值内存约 1 GB）
- 只重新生成样本图：`node scripts/render-assets.mjs specimen`
- 宿主在启动时把图片以 data URI 内联进注入的样式，缺图时动画照常播放，只是少了对应背景。

## 测试

运行 `npm test`，或直接运行 `node scripts/test-host.mjs`。
测试覆盖默认值、配置校验、HTML 转义、注入顺序与宿主注册。
动画资源尚未生成时也可测试：使用模拟资源验证注入，确认宿主安全跳过注册。
资源齐全时，测试会触发实际注册的处理函数并检查样式与 body 脚本行。

## 卸载与故障恢复

- 插件页：打开「莱茵生命开屏动画」→ 卸载（只想暂时关掉就用开关）。
- 命令行（先退出 app）：`dsh plugin --profile desktop remove dsh-rhine-splash`。
- 让 dsh 的 agent 卸载：同样会按 `AGENTS.md` 执行。

卸载或关闭后重启 app 生效。若插件导致启动异常，Harness 会备份 patch 并禁用第三方组合包，便于恢复；图片素材缺失时插件只记录警告，动画照常播放。
