# Security policy

## Reporting a vulnerability

Report security issues through a private
[GitHub security advisory](https://github.com/omdsh-dev/dsh-github-integration/security/advisories/new).
Do not open a public issue for an unpatched vulnerability. If a credential was
exposed, revoke it before reporting and do not include the live value.

## Scope

This repository publishes static workflow guidance and its dependency-free
packager. GitHub API clients, authentication providers, and model-facing tool
implementations are outside this repository. Report issues in those components
to their respective maintainers.

The workflow can request remote GitHub writes through a separately configured
tool provider. Use least-privilege credentials and retain human approval for
operations that change repositories, issues, or pull requests.
