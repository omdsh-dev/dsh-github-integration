# DSH GitHub Integration

A static `github-issue-pr` Skill for planning and running auditable GitHub Issue and Pull Request campaigns. It contains guidance only; GitHub authentication and tool permissions are supplied by the user's chosen provider.

## Workshop contract

The release under `plugins/github-integration/.dsh-plugin` declares the public `package.json#dshWorkshop` Skill contract. It is reviewed as source and is never executed by the Workshop Harness.

- Protocol: `skill`
- Admission mode: guided
- Artifact: `skills/github-issue-pr/SKILL.md`
- Declared scopes: GitHub read and write
- Registry authority: none; a passing static review remains Catalog-only

The former Repository Plugin wrapper and generated asset copy have been removed. The Skill document is now the only source of truth.

## Verify

```bash
node scripts/verify-release.mjs
```

The gate validates metadata, frontmatter, contained links, high-risk command patterns, package contents, and public-release hygiene without running instructions from the Skill.

## License

MIT
