#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plugin = resolve(repository, 'plugins/github-integration/.dsh-plugin')
const sourceSkill = resolve(plugin, 'skills/github-issue-pr/SKILL.md')
const preparedSkill = resolve(plugin, 'dsh-plugin-assets/skills/0/github-issue-pr/SKILL.md')
const preparedEntry = resolve(plugin, 'dsh-plugin.mjs')

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
  if (result.status !== 0) {
    process.stderr.write(result.stdout)
    process.stderr.write(result.stderr)
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`)
  }
  return result.stdout
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = resolve(directory, entry.name)
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
  for (const file of files.filter(path => path.endsWith('.md'))) {
    const body = await readFile(file, 'utf8')
    for (const match of body.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)) {
      let target = match[1].trim()
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1)
      target = target.split(/\s+["']/)[0]
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue
      const pathname = decodeURIComponent(target.split('#', 1)[0].split('?', 1)[0])
      if (pathname.length === 0) continue
      const resolved = resolve(dirname(file), pathname)
      assert(isInside(repository, resolved), `${relative(repository, file)} links outside the repository`)
      await stat(resolved).catch(() => {
        throw new Error(`${relative(repository, file)} has a broken link: ${target}`)
      })
    }
  }
}

async function verifyReleaseHygiene(files) {
  const legacyOrganization = ['dsh', 'external'].join('-')
  const oldTestOrganization = ['dsh', '2026'].join('')
  const restrictedLabel = ['N', 'DA'].join('')
  const internalTestingLabel = '\u5185\u6d4b'
  const absoluteUserPrefix = ['/', 'Users', '/'].join('')
  const linuxHomePrefix = ['/', 'home', '/'].join('')
  const windowsUserPrefix = ['C:', '\\\\', 'Users', '\\\\'].join('')
  const personalMailDomain = ['outlook', 'com'].join('\\.')
  const privateSourcePhrase = ['private', '(?: source| repository| github| checkout)'].join('')
  const rules = [
    ['legacy organization', new RegExp(legacyOrganization, 'i')],
    ['old test organization', new RegExp(oldTestOrganization, 'i')],
    ['restricted-program label', new RegExp(`\\b${restrictedLabel}\\b`, 'i')],
    ['internal-testing label', new RegExp(internalTestingLabel, 'i')],
    ['old snapshot date', /\b08(?:04|06|09|12)\b/],
    ['absolute user path', new RegExp(absoluteUserPrefix)],
    ['Linux home path', new RegExp(linuxHomePrefix)],
    ['Windows user path', new RegExp(windowsUserPrefix.replaceAll('\\', '\\\\'), 'i')],
    ['email address', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
    ['personal mail address', new RegExp(personalMailDomain, 'i')],
    ['non-public source wording', new RegExp(privateSourcePhrase, 'i')],
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
    ['cloud access key', /AKIA[0-9A-Z]{16}/],
  ]

  for (const file of files) {
    const body = await readFile(file, 'utf8')
    for (const [label, pattern] of rules) {
      assert(!pattern.test(body), `${relative(repository, file)} contains ${label}`)
    }
  }
}

assert.equal(await stat(resolve(repository, 'packages')).catch(() => null), null,
  'the release repository must not contain host packages')

const manifest = JSON.parse(await readFile(resolve(plugin, 'package.json'), 'utf8'))
const readme = await readFile(resolve(repository, 'README.md'), 'utf8')
assert.equal(manifest.private, true)
assert.equal(manifest.license, 'MIT')
assert.equal(manifest.repository?.url,
  'git+https://github.com/omdsh-dev/dsh-github-integration.git')
assert.deepEqual(manifest.dsh?.skills, ['skills'])
assert.match(await readFile(resolve(repository, 'LICENSE'), 'utf8'), /^MIT License\n/)
assert((await stat(resolve(plugin, 'prepare.js'))).size < 20_000,
  'prepare.js must remain a small original implementation, not a runtime bundle')
assert.match(readme,
  /@deepseek-ai\/dsh-repository-plugin` returned HTTP 404/,
  'README must disclose the unavailable npm runtime dependency')
assert.match(readme, /runtime\s+acceptance only after the official Repository Plugin package becomes available/,
  'README must keep runtime acceptance conditional')
assert.match(readme, /Passing this gate does not establish compatibility with a published DSH\s+runtime/,
  'README must distinguish static verification from runtime compatibility')

const skill = await readFile(sourceSkill, 'utf8')
assert.match(skill, /^---\s*\nname:\s*github-issue-pr\s*$/m)
assert.match(skill, /^description:\s*\S+/m)

const beforeEntry = await readFile(preparedEntry)
const beforeSkill = await readFile(preparedSkill)
run(process.execPath, ['prepare.js'], plugin)
assert.deepEqual(await readFile(preparedEntry), beforeEntry, 'generated plugin entry is not reproducible')
assert.deepEqual(await readFile(preparedSkill), beforeSkill, 'generated skill asset is not reproducible')
assert.deepEqual(await readFile(preparedSkill), await readFile(sourceSkill),
  'prepared skill differs from its source')
run(process.execPath, ['--check', 'prepare.js'], plugin)

const loaded = await import(`${pathToFileURL(preparedEntry).href}?verify=${Date.now()}`)
assert.equal(loaded.name, 'github-integration')
assert.deepEqual(loaded.inject, ['loader', 'skills'])
const calls = []
const runtime = Object.freeze({ name: 'repository-plugin' })
await loaded.apply({
  loader: { builtins: { 'dsh-repository-plugin': runtime } },
  async plugin(...args) { calls.push(args) },
})
assert.equal(calls.length, 1)
assert.equal(calls[0][0], runtime)
assert.deepEqual(calls[0][1].manifest, {
  name: 'github-integration',
  skills: ['dsh-plugin-assets/skills/0'],
})

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const pack = JSON.parse(run(npm, ['pack', '--dry-run', '--ignore-scripts', '--json'], plugin))[0]
assert.deepEqual(pack.files.map(file => file.path).sort(), [
  'dsh-plugin-assets/skills/0/github-issue-pr/SKILL.md',
  'dsh-plugin.mjs',
  'package.json',
  'prepare.js',
  'skills/github-issue-pr/SKILL.md',
])

const files = await walk(repository)
await verifyMarkdownLinks(files)
await verifyReleaseHygiene(files)
console.log(`release verification: OK (${files.length} files, ${pack.entryCount} packed files)`)
