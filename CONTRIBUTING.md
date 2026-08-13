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

The verifier regenerates and compares the prepared asset, validates the plugin
wrapper and package contents, checks relative links, and performs a release
hygiene scan. Commit the source and regenerated asset together. Keep English
and Chinese documentation aligned when either version changes.
