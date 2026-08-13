# GitHub integration workflow skill source

A static DSH skill source package for structured GitHub issue and pull-request
campaigns. It guides a model through issue-batch survey, triage, isolated fixes,
pull-request creation, tracking-table updates, upstream links, and handoff.

This repository intentionally contains workflow knowledge and static plugin
packaging only. It does not bundle a GitHub API client, a model-facing tool
provider, or credentials.

## Availability

**Packaging candidate only.** An authorized read-only registry query for
`@deepseek-ai/dsh-repository-plugin` returned HTTP 404, and no official renamed
package was identified. The repository can verify its own static package
offline, but it cannot currently verify installation or runtime compatibility
from npm artifacts.

Treat the configuration below as conditional documentation. Perform runtime
acceptance only after the official Repository Plugin package becomes available
from an authoritative source. Do not substitute a similarly named package.

## Requirements for later runtime acceptance

- A DSH runtime that supports repository plugins and static skills.
- A compatible GitHub tool provider exposing the `github_issue_*` and
  `github_pr_*` tools referenced by the skill.
- Authentication configured according to that provider's documentation.

## Repository layout

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

`prepare.js` is a dependency-free packager. It validates plugin metadata,
asset containment, symbolic-link safety, skill frontmatter, and any declared
MCP configuration before staging the generated plugin entry and assets.

## Conditional Git-source configuration

After the official Repository Plugin dependency becomes available, pin the
skill source to a reviewed immutable commit:

```yaml
- id: repository-plugins
  name: '@deepseek-ai/dsh-repository-plugin'
  config:
    repositories:
      - 'github:omdsh-dev/dsh-github-integration#<COMMIT_SHA>&path:/plugins/github-integration/.dsh-plugin'
```

Replace `<COMMIT_SHA>` with the release commit. This example is not a claim
that the currently unavailable npm dependency can be installed today.

## Verify locally

```sh
node scripts/verify-release.mjs
```

The gate rebuilds the static plugin, checks reproducibility and skill
frontmatter, exercises the generated wrapper, performs a package dry run, and
audits repository links and release hygiene. It does not access the network.
Passing this gate does not establish compatibility with a published DSH
runtime; that acceptance remains pending on the official dependency.

The package remains marked `private: true` to prevent accidental registry
publication. Pinned Git source is the planned distribution path once the
official loader dependency is available.

## Security

The repository contains no credentials. Keep authentication in the configured
tool provider, never commit tokens, and review the pinned commit before use.
See [SECURITY.md](SECURITY.md) for reporting guidance.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Change the source `SKILL.md`, regenerate
the prepared asset, and run the release gate before submitting a change.

## License

MIT; see [LICENSE](LICENSE). Third-party dependencies retain their own licenses.
