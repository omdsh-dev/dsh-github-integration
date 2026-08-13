---
name: github-issue-pr
description: GitHub 修复战役工作流——拉取 issue 批次、核验官方已修、批量建 PR（快照 base）、锚点维护跟踪总表、上游挂"已修"链接。当用户要求处理 GitHub issue 批次、批量建 PR、更新跟踪表、核验 issue 状态时使用。GitHub campaign workflow — batch issue survey, verify official fixes, batch PR creation on snapshot bases, anchor tracking-table upkeep, upstream fix links. Use when handling GitHub issue batches, batch PR creation, tracking-table updates, or issue status verification. Requires the github_* tools (see dsh-github-integration README).
---

# GitHub 修复战役 / GitHub Issue-PR Campaign

快照制开源协作的标准流程:**官方发快照 → 社区修 issue → 批量建 PR(永不合并)→ 官方下个快照吸收**。
`github_*` 工具让这个战役全程结构化,不再手工拼 JSON / 写脚本。

The standard flow of snapshot-based open-source collaboration: **upstream
publishes snapshots → community fixes issues → batch PRs (never merged) →
the next upstream snapshot absorbs them**. The `github_*` tools make the whole
campaign structured — no hand-built JSON or glue scripts.

## 前置条件 / Prerequisites

- 已配置兼容的 GitHub 工具提供方，能够提供本文使用的 `github_issue_*` 和
  `github_pr_*` 工具。本仓库不附带工具实现。
  Configure a compatible GitHub tool provider exposing the `github_issue_*`
  and `github_pr_*` tools used below. This repository does not bundle one.
- 按工具提供方文档配置凭据，不要在提示词、日志或仓库中复制凭据。
  Configure credentials according to the provider documentation; never copy
  credentials into prompts, logs, or repositories.

## 战役流程 / Campaign flow

### ① 拉取 issue 批次 / Survey the issue batch

```
github_issue_list { owner: 上游org/upstream-org, repo: issues, state: open, since: 快照日期/snapshot-date }
```
- 需要正文时逐个 `github_issue_view`(正文保留代码块/行号/图片链接)。
  Use `github_issue_view` for full bodies (code blocks, line refs, image links preserved).
- 需要核验"官方已修"时 `github_issue_comments`(找"fixed in snapshot"类评论)。
  Verify "officially fixed" with `github_issue_comments` (look for "fixed in snapshot" remarks).

### ② 筛选与排序 / Triage

- 剔除/ Drop:官方已修(officially fixed)、误建 junk、设计行为(by design)、需产品决策项(product decision)。
- 排序/Prioritize:P0(死锁/核心)→ P1(小改)→ P2(功能)。

### ③ 逐条修复 / Fix per issue

- 分支命名/Branch naming:`fix/issue<N>-<slug>`;一个分支可修多个 issue。
- 质量门槛/Quality gates:组件测试 N/N + tsc 0 错误 + 双语 Agent Note。

### ④ 批量建 PR / Batch PR creation

```
github_pr_create {
  owner: 你的仓库org/your-org, repo: 工作台仓库/workspace-repo,
  title: "fix(scope): 描述",           # Conventional Commits
  head: "fix/issue<N>-<slug>",
  base: "snapshots/<快照哈希>/<snapshot-hash>",   # ⚠️ 快照分支,不是 main / snapshot branch, not main
  body: "Fixes example-org/issues#N\n\n总结/summary...\nBase: <base-commit>"
}
```
- 每个分支调一次,单项失败不中断,汇总 `created N, failed M`。
  One call per branch; per-item failures don't abort; report `created N, failed M`.
- **PR 号立即返回**/PR numbers return immediately,记下来(后续总表行依赖它)。

### ⑤ 锚点维护跟踪总表 / Anchor tracking-table upkeep

```
github_issue_update {
  owner, repo: 你的工作台仓库/workspace-repo, number: 总表issue号/tracking-issue,
  anchorInsert: {
    marker: "## 维护约定",             # ⚠️ 必须与总表现有标记一致/must match the table's marker
    before: true,
    lines: ["| 日期/date | example-org/issues#N | PR#M | 一句话/one-liner |"]
  }
}
```
- 锚点插入只动标记前/后的行,**不覆盖其他段落**;找不到标记会报错(先 view 确认)。
  Anchor inserts touch only lines next to the marker, never other paragraphs;
  a missing marker fails loudly (view first).

### ⑥ 上游挂"已修"链接 / Upstream fix links

```
github_issue_comment { owner: 上游org/upstream-org, repo: issues, number: N,
  body: "Fixed in <你的org/your-org>/<工作台/workspace> PR#M" }
```

### ⑦ 状态流转与交接 / Status flow & handoff

- `github_issue_update` 加 label(`fix-in-progress` / `fixed-pending-snapshot`)让状态公开可见。
  Add labels so status is publicly visible.
- `github_pr_list` 轮询吸收情况(`mergedAt` 出现 = 已被官方快照吸收)。
  Poll absorption with `github_pr_list` (`mergedAt` present = absorbed).
- handoff 文档由 `github_pr_list` + `github_issue_list` 组合生成,不再手写。
  Generate handoff from `github_pr_list` + `github_issue_list` instead of handwriting.

## 关键约定 / Key conventions (from real-world pitfalls)

1. **base 永远是快照分支**/always a snapshot branch(`snapshots/<hash>`);PR 永不合并是设计/unmerged PRs are by design.
2. **跨仓库引用原样写**/keep cross-repo refs verbatim:`Fixes example-org/issues#N`(issue 在仓库 A、PR 在仓库 B)。
3. **凭据由工具提供方管理**/credentials belong to the tool provider:不要在工作流文本或仓库中传递凭据/never pass credentials through workflow text or repositories.
4. **批量语义**/batch semantics:逐项失败不中断、汇总报告、PR 号立即输出。
5. **总表是 markdown 表格**/the table is markdown:锚点插入保留非目标段落;标记行要精确匹配。
6. **issue 正文是结构化数据**/issue bodies are structured:保留代码块、行号引用、附件链接。
