<!--
Release 说明模板。新建 Release 时：

1. 标签选择 `vX.Y.Z`，标题填写 `vX.Y.Z · <一句话主题>`，例如 `v0.1.0 · 首个公开版本`。
2. 复制本注释之后的全部内容作为正文，替换所有 `<…>` 与 `X.Y.Z` 占位符。
3. 「更新内容」直接复制 CHANGELOG.md 中对应版本的小节，去掉版本标题，保留「新增 / 变更 / 修复」等分类。
4. 上传 `npm pack` 生成的 `dsh-rhine-splash-X.Y.Z.tgz`。SHA-256 用 `shasum -a 256 <文件>` 计算，
   或复制 Release 附件旁 GitHub 显示的 sha256。
5. 首个版本没有可比较的上一版，删除页脚的「完整变更」链接。
-->

> <一句话概述本版本>。适用于 DeepSeek Harness 桌面版 <Harness 版本>。

## 更新内容

<从 CHANGELOG.md 复制本版本小节>

## 安装

| 方式 | 操作 |
| --- | --- |
| 插件页（推荐） | 侧栏 **插件 → 添加插件**，填写 `github:Respawn-ID/dsh-rhine-splash#vX.Y.Z`，安装后点击 **立即启用** |
| 离线安装 | 下载下方附件 `dsh-rhine-splash-X.Y.Z.tgz`，在 **添加插件** 中填写它的绝对路径 |
| 命令行 | 先完全退出 Harness，再运行 `dsh plugin --profile desktop add github:Respawn-ID/dsh-rhine-splash#vX.Y.Z` |
| dsh agent | 在仓库目录中对 agent 说「安装这个插件」，它会按 `AGENTS.md` 操作 |

安装后完全退出 Harness（<kbd>⌘</kbd> + <kbd>Q</kbd>）并重新打开。从旧版本升级时，先卸载旧版本，再按上表安装。

## 兼容性

- DeepSeek Harness 桌面版 <Harness 版本>
- 无 npm 依赖、无 DSH peer 依赖、无安装脚本

## 附件

| 文件 | 用途 | SHA-256 |
| --- | --- | --- |
| `dsh-rhine-splash-X.Y.Z.tgz` | 离线安装用发布包 | `<sha256>` |

---

[使用文档](https://github.com/Respawn-ID/dsh-rhine-splash#readme) · [更新日志](https://github.com/Respawn-ID/dsh-rhine-splash/blob/main/CHANGELOG.md) · [问题反馈](https://github.com/Respawn-ID/dsh-rhine-splash/issues) · 完整变更：[`v<上一版>...vX.Y.Z`](https://github.com/Respawn-ID/dsh-rhine-splash/compare/v<上一版>...vX.Y.Z)
