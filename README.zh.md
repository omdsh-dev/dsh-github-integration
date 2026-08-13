# GitHub 集成工作流技能源码

这是一个 DSH 静态技能源码包，用于规范化处理 GitHub Issue 与 Pull
Request 协作流程。技能指导模型完成 Issue 批次调研、筛选、隔离修复、创建
Pull Request、维护跟踪表、回挂上游链接和交接。

本仓库只发布工作流知识与静态插件打包代码，不包含 GitHub API 客户端、
模型工具提供方或任何凭据。

## 可用性

**当前仅为打包候选。** 使用获授权的 registry 只读访问探测显示
`@deepseek-ai/dsh-repository-plugin` 返回 HTTP 404，也没有发现官方改名包。
本仓库可以离线验证自己的静态包，但目前无法基于 npm 产物验证安装和
运行时兼容性。

下面的配置仅作为条件式文档保留。必须等官方 Repository Plugin 包通过权威
来源可用后，才能进行运行验收；不要用名称相似的第三方包代替。

## 后续运行验收要求

- 支持 Repository Plugin 和静态技能的 DSH 运行时。
- 一个兼容的 GitHub 工具提供方，能够提供技能引用的 `github_issue_*` 和
  `github_pr_*` 工具。
- 按该工具提供方的文档完成认证配置。

## 仓库结构

```text
plugins/github-integration/
├── README.md
├── README.zh.md
└── .dsh-plugin/
    ├── package.json
    ├── prepare.js
    ├── dsh-plugin.mjs
    ├── dsh-plugin-assets/
    └── skills/github-issue-pr/SKILL.md
```

`prepare.js` 是无外部依赖的打包程序。生成插件入口和静态资源前，它会验证
插件元数据、资源路径边界、符号链接安全、技能 frontmatter，以及声明的 MCP
配置。

## 条件式 Git source 配置

官方 Repository Plugin 依赖可用后，将技能源码固定到已经审核的不可变提交：

```yaml
- id: repository-plugins
  name: '@deepseek-ai/dsh-repository-plugin'
  config:
    repositories:
      - 'github:omdsh-dev/dsh-github-integration#<COMMIT_SHA>&path:/plugins/github-integration/.dsh-plugin'
```

请将 `<COMMIT_SHA>` 替换为正式发布提交。该示例不表示目前缺失的 npm 依赖
已经能够安装。

## 本地验证

```sh
node scripts/verify-release.mjs
```

该门禁会重新生成静态插件，检查产物可复现性与技能 frontmatter，冒烟验证生成
的入口，执行打包预检，并审核仓库链接和发布卫生；整个过程不会访问网络。
门禁通过不代表已经兼容某个公开发布的 DSH 运行时；运行验收仍等待官方依赖。

包清单继续保留 `private: true`，以避免误发布到 registry。项目只支持通过
固定 Git commit 的方式分发，并且必须等官方 loader 依赖可用后才能实际接入。

## 安全

仓库不包含凭据。认证信息应由已配置的工具提供方管理；不要提交 token，并在
使用前审核所固定的 commit。
安全问题报告方式见 [SECURITY.md](SECURITY.md)。

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。请修改源 `SKILL.md`，重新生成静态
资源，并在提交变更前运行发布门禁。

## 许可

MIT；详见 [LICENSE](LICENSE)。第三方依赖保留各自的许可证。
