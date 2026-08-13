# github-integration skill source

The static source package for the `github-issue-pr` workflow skill. This
package ships workflow guidance only; a compatible GitHub tool provider must
be configured separately.

The official `@deepseek-ai/dsh-repository-plugin` dependency was unavailable to
an authorized read-only npm registry query. This directory is therefore a packaging
candidate, not a publicly runtime-validated installation. See the root README
for the release blocker and conditional configuration.

## Contents

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

The skill covers issue-batch survey, triage, isolated fix branches, pull
requests on snapshot bases, anchored tracking-table updates, upstream links,
status transitions, and handoff.

When the official Repository Plugin package becomes available, load
`.dsh-plugin` from a reviewed immutable commit. See the repository root README
for conditional configuration and offline verification.
