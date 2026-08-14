# Contributing

Contributions should stay within this repository's public scope: the
`github-issue-pr` workflow, static plugin packaging, and documentation. Do not
add GitHub client implementations, runtime source, generated credentials, or
environment-specific artifacts.

The source of truth is:

```text
plugins/github-integration/.dsh-plugin/skills/github-issue-pr/SKILL.md
```

After editing it, run:

```sh
node scripts/verify-release.mjs
```

The verifier validates the direct Skill manifest and package contents, checks
frontmatter and relative links, rejects high-risk command patterns, and performs
a release-hygiene scan. There is no generated Repository Plugin asset. Keep
English and Chinese documentation aligned when either version changes.
