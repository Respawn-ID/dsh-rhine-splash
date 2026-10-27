<!--
Release 说明模板。新建 Release 时：

1. 标签选择 `vX.Y.Z`，标题填写 `vX.Y.Z · <这个版本的主要变化>`，例如 `v0.1.0 · 首个公开版本`。
2. 复制本注释之后的全部内容作为正文，替换所有 `<…>` 和 `X.Y.Z`。
3. 用平实的语气写给使用者看：先说这个版本带来了什么，再分项介绍。参考 CHANGELOG.md 中对应版本的内容，
   但不必逐条照搬，没有对应内容的小节可以删掉。
4. 上传 `npm pack` 生成的 `dsh-rhine-splash-X.Y.Z.tgz`，SHA-256 用 `shasum -a 256 <文件>` 计算。
5. 发布 Release 后，在 Actions 中运行 publish 工作流，把同一版本发到 npm，正文里的 npm 安装方式才能用。
6. 首个版本没有上一版可比较，删除页脚的「完整变更」链接；没有旧版本可升级时，删除升级说明。
-->

<用一两句话说明这个版本带来了什么。>

## 新功能

**<功能名称>**

<这个功能是什么、在哪里使用。>

## 改进

- <改进内容>

## 问题修复

- <修复内容>

## 安装

在 Harness 侧栏点击 **插件** > **添加插件**，输入 `dsh-rhine-splash@X.Y.Z`，安装后点击 **立即启用**，然后完全退出并重新打开 Harness。连不上 npm 官方源时，Harness 会自动改用国内镜像 npmmirror。

也可以输入 `github:Respawn-ID/dsh-rhine-splash#vX.Y.Z` 从 GitHub 安装。两者都装不上时，可以下载下方的 `dsh-rhine-splash-X.Y.Z.tgz`，添加插件时填写文件路径。

在网页版中安装时，先停止 `dsh web`，运行以下命令，然后重新启动 `dsh web`：

```bash
dsh plugin --profile web add dsh-rhine-splash@X.Y.Z
```

如果已经装了旧版本，请先在插件页卸载旧版本，再安装新版本。其他安装方式请参阅 [README](https://github.com/Respawn-ID/dsh-rhine-splash#安装)。

## 兼容性

适用于 DeepSeek Harness 桌面版和网页版 <Harness 版本>。

附件 `dsh-rhine-splash-X.Y.Z.tgz` 的 SHA-256：`<sha256>`

---

[使用文档](https://github.com/Respawn-ID/dsh-rhine-splash#readme) · [更新日志](https://github.com/Respawn-ID/dsh-rhine-splash/blob/main/CHANGELOG.md) · [问题反馈](https://github.com/Respawn-ID/dsh-rhine-splash/issues) · [完整变更](https://github.com/Respawn-ID/dsh-rhine-splash/compare/v<上一版>...vX.Y.Z)
