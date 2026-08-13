# github-integration 技能源码

这是 `github-issue-pr` 工作流技能的静态源码包。本包只提供工作流指导；
兼容的 GitHub 工具提供方需要另行配置。

使用获授权的 npm registry 只读访问时，官方 `@deepseek-ai/dsh-repository-plugin` 依赖当前不可用，
因此本目录是打包候选，不是已经通过公开运行时验收的安装包。发布阻断项和
条件式配置见仓库根 README。

## 内容

```text
.dsh-plugin/
├── package.json
├── prepare.js
├── dsh-plugin.mjs
├── dsh-plugin-assets/
└── skills/
    └── github-issue-pr/
        └── SKILL.md
```

技能覆盖 Issue 批次调研、筛选、隔离修复分支、基于快照分支的 Pull Request、
锚点式跟踪表更新、上游链接、状态流转和交接。

官方 Repository Plugin 包可用后，再从已经审核的不可变 commit 加载
`.dsh-plugin`。条件式配置与离线验证方法见仓库根 README。
