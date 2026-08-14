# GitHub Integration Skill

可接入的唯一源码是 `.dsh-plugin/skills/github-issue-pr/SKILL.md`。它使用公开 Workshop Skill Manifest，不包含包生命周期脚本或生成的 Repository Plugin wrapper。

在仓库根目录运行 `node scripts/verify-release.mjs` 执行静态入库检查。通过只证明 Skill 契约与源码安全，不会授予 Registry 安装权限或 GitHub 权限。
