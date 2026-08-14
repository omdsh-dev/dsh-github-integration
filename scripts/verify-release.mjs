#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plugin = resolve(repository, 'plugins/github-integration/.dsh-plugin')
const skillPath = resolve(plugin, 'skills/github-issue-pr/SKILL.md')

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    },
  })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`)
  return result.stdout
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = resolve(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`${relative(repository, path)}: symbolic links are not allowed`)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

function isInside(root, candidate) {
  const path = relative(root, candidate)
  return path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith('/')
}

async function verifyMarkdownLinks(files) {
  for (const file of files.filter((path) => path.endsWith('.md'))) {
    const body = await readFile(file, 'utf8')
    for (const match of body.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)) {
      let target = match[1].trim()
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1)
      target = target.split(/\s+["']/)[0]
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue
      const pathname = decodeURIComponent(target.split('#', 1)[0].split('?', 1)[0])
      if (!pathname) continue
      const resolved = resolve(dirname(file), pathname)
      assert(isInside(repository, resolved), `${relative(repository, file)} links outside the repository`)
      await stat(resolved).catch(() => { throw new Error(`${relative(repository, file)} has a broken link: ${target}`) })
    }
  }
}

async function verifyReleaseHygiene(files) {
  const forbidden = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
    ['cloud access key', /AKIA[0-9A-Z]{16}/],
    ['retired source', /github\.com\/dsh-external\//i],
  ]
  for (const file of files) {
    const body = await readFile(file, 'utf8')
    for (const [label, pattern] of forbidden) assert(!pattern.test(body), `${relative(repository, file)} contains ${label}`)
  }
}

const manifest = JSON.parse(await readFile(resolve(plugin, 'package.json'), 'utf8'))
assert.equal(manifest.version, '0.1.0-rc.2')
assert.equal(manifest.private, true)
assert.equal(manifest.license, 'MIT')
assert.equal(manifest.repository?.url, 'git+https://github.com/omdsh-dev/dsh-github-integration.git')
assert(manifest.keywords?.includes('dsh-plugin'), 'package discovery keyword is missing')
assert.equal(manifest.scripts, undefined, 'Skill package must not have lifecycle scripts')
assert.equal(manifest.dsh, undefined, 'legacy Repository Plugin declaration must be removed')
assert.deepEqual(manifest.dshWorkshop, {
  schema: 'omdsh-workshop-package/v1',
  type: 'plugin',
  integration: { protocol: 'skill', artifact: 'skills/github-issue-pr/SKILL.md' },
  install: { mode: 'guided', adapter: 'skill', failurePolicy: 'manual', touchesCurrentBeforeActivation: false },
  lifecycle: { activation: 'immediate', dispose: 'unsupported' },
  permissions: ['github:read', 'github:write'],
  evidence: { install: null, failureIsolation: null, hotReload: null, remove: null },
})

const skill = await readFile(skillPath, 'utf8')
assert.match(skill, /^---\s*\nname:\s*github-issue-pr\s*$/m)
assert.match(skill, /^description:\s*\S+/m)
assert(!/\bcurl\b[^\n|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/i.test(skill), 'Skill contains a pipe-to-shell command')
assert(!/\bsudo\b|\brm\s+-[^\n]*r[^\n]*f/i.test(skill), 'Skill contains a high-risk command')

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const pack = JSON.parse(run(npm, ['pack', '--dry-run', '--ignore-scripts', '--json'], plugin))[0]
assert.deepEqual(pack.files.map((file) => file.path).sort(), [
  'package.json',
  'skills/github-issue-pr/SKILL.md',
])

const files = await walk(repository)
await verifyMarkdownLinks(files)
await verifyReleaseHygiene(files)
console.log(`release verification: OK; direct Skill contract (${files.length} files, ${pack.entryCount} packed files)`)
