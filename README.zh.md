# DSH GitHub Integration

用于规划和执行可审计 GitHub Issue、Pull Request 批处理的静态 `github-issue-pr` Skill。本仓只提供工作流指导；GitHub 身份认证与工具权限由用户选择的工具提供方负责。

## Workshop 契约

`plugins/github-integration/.dsh-plugin` 中的版本声明公开 `package.json#dshWorkshop` Skill 契约。Workshop Harness 只做静态检查，不执行 Skill 中的指令。

- 协议：`skill`
- 接入方式：引导接入
- 制品：`skills/github-issue-pr/SKILL.md`
- 权限声明：GitHub 读、写
- Registry 权限：无；静态检查通过后仍然只是 Catalog 条目

旧 Repository Plugin wrapper 与重复生成的资源副本已经移除，Skill 文档现在是唯一事实源。

## 验证

```bash
node scripts/verify-release.mjs
```

门禁会检查元数据、frontmatter、链接边界、危险命令模式、打包文件和公开发布卫生，不会执行 Skill 指令。

## 许可证

MIT
