# 更新日志

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [0.2.0] - 2026-10-11

在开屏动画之外，把整个界面换成莱茵风格，并提供图形化配置。适用于 DeepSeek Harness 桌面版与网页版（`dsh web`）0.2.0-rc.2。

### 新增

- 莱茵界面主题：只覆盖 dsh 设计变量，暖白 / 暖炭黑灰阶、莱茵橙品牌色、切角圆角；跟随深浅色。
- 品牌替换：侧栏标志与名称、空会话页大标志改为莱茵风设计，两套 Logo（模块铭牌 / 开放细胞）可切换；关闭后恢复官方品牌。
- 插件页配置页：图形化修改全部选项，可立即预览开屏。
- `/splash` 命令：预览开屏、开关开屏、切换退场、开关界面主题与品牌、切换 Logo。
- 新增配置 `enabled`、`uiTheme`、`brand`、`logo`；所有配置可在 dsh 内保存，重启后生效。
- 支持网页版：`dsh plugin --profile web add` 安装后，开屏、界面主题、品牌与配置页均可用。
- README 加入深浅色开屏与主界面截图（`screenshots/`）。
- Release 说明模板 `.github/RELEASE_TEMPLATE.md`，统一发布页的标题与正文结构。

### 变更

- 重写 README：统一术语与排版，按「简介 → 环境要求 → 安装 → 配置 → 动画说明 → 常见问题 → 开发」重新组织章节，补充验证安装、常见问题、发布流程与声明。
- 更新日志改用 Keep a Changelog 格式。

## [0.1.0] - 2026-10-08

首个公开版本，适用于 DeepSeek Harness 桌面版 0.2.0-rc.2。莱茵生命风格的原创机能风设计，不含《明日方舟》官方素材。

### 新增

- 两幕开场：`REQUESTING ACCESS` 逐字解码为 `PERMISSION AUTHORIZED`，转场后进入 `WELCOME TO / DEEPSEEK HARNESS / INTERNAL TERMINAL` 字标与模块方块。
- 常驻 HUD：公司字标、01–05 索引栏、显微样本圆窗、档案编号框与条码、警示条、LINK 链路计量条、加载百分比。
- 四种退场动画：舱门、代码消散、故障撕裂、六边形光圈（带视觉引导），默认随机且不与上一次重复。
- 节拍化动效：统一缓动曲线，循环动画按 1.2 秒基础节拍编排。
- 跟随 Harness 深浅色；支持系统「减弱动态效果」。
- 可点击或按 <kbd>Esc</kbd> 跳过；每次启动只播放一次。
- Retina 级程序化素材（板条阵列背景、扫描电镜样本图），由宿主以 data URI 内联注入。
- 配置项：标题、副标题、编号、强调色、主题、退场动画、时长、最长等待、可跳过、刷新重播。
- 双受众安装说明：README 面向用户，`AGENTS.md` 面向模型（dsh agent 可自动读取）。

[未发布]: https://github.com/Respawn-ID/dsh-rhine-splash/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Respawn-ID/dsh-rhine-splash/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Respawn-ID/dsh-rhine-splash/releases/tag/v0.1.0
