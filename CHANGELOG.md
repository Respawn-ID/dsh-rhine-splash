# 更新日志

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

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

[未发布]: https://github.com/Respawn-ID/dsh-rhine-splash/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Respawn-ID/dsh-rhine-splash/releases/tag/v0.1.0
