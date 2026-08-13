#!/usr/bin/env node

import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const ENTRY_FILENAME = 'dsh-plugin.mjs'
const ASSET_DIRECTORY = 'dsh-plugin-assets'
const RUNTIME_BUILTIN = 'dsh-repository-plugin'
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
const ENVIRONMENT_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const PLACEHOLDER_PATTERN = /\$\{([^}]*)\}/g

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value, location) {
  if (!isRecord(value)) throw new Error(`${location} must be an object`)
  return value
}

function assertNonEmptyString(value, location) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${location} must be a non-empty string`)
  }
  return value
}

function assertOnlyKeys(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${location} contains unsupported property ${JSON.stringify(key)}`)
  }
}

function assertStringMap(value, location) {
  const record = assertRecord(value, location)
  for (const [key, item] of Object.entries(record)) {
    if (typeof item !== 'string') throw new Error(`${location}.${key} must be a string`)
  }
  return record
}

function assertTemplate(value, location) {
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
    if (!ENVIRONMENT_NAME_PATTERN.test(match[1])) {
      throw new Error(`${location} contains an unsupported environment placeholder ${JSON.stringify(match[0])}`)
    }
  }
  if (value.replace(PLACEHOLDER_PATTERN, '').includes('${')) {
    throw new Error(`${location} contains an unterminated environment placeholder`)
  }
}

function validateMcpDocument(content) {
  let document
  try {
    document = JSON.parse(content)
  } catch (cause) {
    throw new Error('invalid .mcp.json: expected JSON', { cause })
  }

  const root = assertRecord(document, '.mcp.json')
  assertOnlyKeys(root, new Set(['mcpServers']), '.mcp.json')
  const servers = assertRecord(root.mcpServers, '.mcp.json#mcpServers')

  for (const [name, rawDefinition] of Object.entries(servers)) {
    if (!SERVER_NAME_PATTERN.test(name)) {
      throw new Error(`MCP server name ${JSON.stringify(name)} must match ${SERVER_NAME_PATTERN.source}`)
    }
    const location = `mcpServers.${name}`
    const definition = assertRecord(rawDefinition, location)

    if (definition.type === 'http') {
      assertOnlyKeys(definition, new Set(['type', 'url', 'headers']), location)
      assertTemplate(assertNonEmptyString(definition.url, `${location}.url`), `${location}.url`)
      if (definition.headers !== undefined) {
        for (const [header, value] of Object.entries(assertStringMap(definition.headers, `${location}.headers`))) {
          assertTemplate(value, `${location}.headers.${header}`)
        }
      }
      continue
    }

    if (definition.type !== undefined && definition.type !== 'stdio') {
      throw new Error(`${location}.type must be "stdio" or "http"`)
    }
    assertOnlyKeys(definition, new Set(['type', 'command', 'args', 'env']), location)
    assertTemplate(assertNonEmptyString(definition.command, `${location}.command`), `${location}.command`)

    if (definition.args !== undefined) {
      if (!Array.isArray(definition.args) || definition.args.some((value) => typeof value !== 'string')) {
        throw new Error(`${location}.args must be an array of strings`)
      }
      definition.args.forEach((value, index) => assertTemplate(value, `${location}.args[${index}]`))
    }
    if (definition.env !== undefined) {
      for (const [key, value] of Object.entries(assertStringMap(definition.env, `${location}.env`))) {
        assertTemplate(value, `${location}.env.${key}`)
      }
    }
  }

  return document
}

function isOutside(root, candidate) {
  const path = relative(root, candidate)
  return path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)
}

async function resolveAsset(pluginDirectory, sourceRoot, configured, kind) {
  if (isAbsolute(configured)) {
    throw new Error(`DSH plugin asset path must be relative: ${JSON.stringify(configured)}`)
  }

  let path
  try {
    path = await realpath(resolve(pluginDirectory, configured))
  } catch (cause) {
    throw new Error(`DSH plugin asset does not exist: ${JSON.stringify(configured)}`, { cause })
  }
  if (isOutside(sourceRoot, path)) {
    throw new Error(`DSH plugin asset escapes its plugin source root: ${JSON.stringify(configured)}`)
  }

  const info = await stat(path)
  if (kind === 'directory' ? !info.isDirectory() : !info.isFile()) {
    throw new Error(`DSH plugin asset is not a ${kind}: ${JSON.stringify(configured)}`)
  }
  return path
}

async function assertNoSymlinks(root) {
  const queue = [root]
  while (queue.length > 0) {
    const directory = queue.pop()
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) {
        throw new Error('skill roots cannot contain symbolic links')
      }
      if (info.isDirectory()) queue.push(path)
    }
  }
}

async function findSkillDocument(source) {
  const direct = resolve(source, 'SKILL.md')
  const directInfo = await stat(direct).catch(() => null)
  if (directInfo?.isFile()) return direct

  for (const child of await readdir(source, { withFileTypes: true })) {
    if (!child.isDirectory()) continue
    const candidate = resolve(source, child.name, 'SKILL.md')
    const info = await stat(candidate).catch(() => null)
    if (info?.isFile()) return candidate
  }
  throw new Error('declared skill root has no SKILL.md (direct or one level deep)')
}

async function validateSkillRoot(source) {
  await assertNoSymlinks(source)
  const document = (await readFile(await findSkillDocument(source), 'utf8')).slice(0, 4096)
  const frontmatter = document.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)
  if (frontmatter === null || !/^name:\s*\S+/m.test(frontmatter[1])) {
    throw new Error('SKILL.md is missing frontmatter name')
  }
  if (!/^description:\s*\S+/m.test(frontmatter[1])) {
    throw new Error('SKILL.md is missing frontmatter description')
  }
}

function validatePackage(document) {
  const packageJson = assertRecord(document, 'package.json')
  const name = assertNonEmptyString(packageJson.name, 'package.json#name')
  const dsh = assertRecord(packageJson.dsh, 'package.json#dsh')
  assertOnlyKeys(dsh, new Set(['skills', 'mcpServers']), 'package.json#dsh')

  const skills = dsh.skills ?? []
  if (!Array.isArray(skills) || skills.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new Error('package.json#dsh.skills must be an array of non-empty relative paths')
  }
  const mcpServers = dsh.mcpServers === undefined
    ? undefined
    : assertNonEmptyString(dsh.mcpServers, 'package.json#dsh.mcpServers')
  if (skills.length === 0 && mcpServers === undefined) {
    throw new Error('package.json#dsh must declare at least one skill root or mcpServers file')
  }
  return { name, skills, mcpServers }
}

function wrapperSource(manifest) {
  const inject = [
    'loader',
    ...(manifest.skills.length > 0 ? ['skills'] : []),
    ...(manifest.mcpServers === undefined ? [] : ['tools']),
  ]
  return [
    '// Generated by dsh-plugin-prepare. Do not edit.',
    `const manifest = ${JSON.stringify(manifest)}`,
    `export const name = ${JSON.stringify(manifest.name)}`,
    `export const inject = ${JSON.stringify(inject)}`,
    'export async function apply(ctx) {',
    `  const runtime = ctx.loader.builtins[${JSON.stringify(RUNTIME_BUILTIN)}]`,
    `  if (runtime === undefined) throw new Error(${JSON.stringify(`missing Cordis builtin ${RUNTIME_BUILTIN}`)})`,
    '  await ctx.plugin(runtime, { baseUrl: import.meta.url, manifest })',
    '}',
    '',
  ].join('\n')
}

async function prepare(directory = process.cwd()) {
  const pluginDirectory = await realpath(resolve(directory))
  const sourceRoot = await realpath(dirname(pluginDirectory))

  let packageJson
  try {
    packageJson = JSON.parse(await readFile(join(pluginDirectory, 'package.json'), 'utf8'))
  } catch (cause) {
    throw new Error('failed to read DSH plugin package metadata', { cause })
  }
  const metadata = validatePackage(packageJson)

  const skillSources = []
  for (const configured of metadata.skills) {
    const source = await resolveAsset(pluginDirectory, sourceRoot, configured, 'directory')
    if (!isOutside(source, pluginDirectory)) {
      throw new Error(`DSH skill root cannot contain the .dsh-plugin package: ${JSON.stringify(configured)}`)
    }
    await validateSkillRoot(source)
    skillSources.push(source)
  }

  let mcpSource
  if (metadata.mcpServers !== undefined) {
    mcpSource = await resolveAsset(pluginDirectory, sourceRoot, metadata.mcpServers, 'file')
    validateMcpDocument(await readFile(mcpSource, 'utf8'))
  }

  const manifest = {
    name: metadata.name,
    skills: skillSources.map((_, index) => `${ASSET_DIRECTORY}/skills/${index}`),
    ...(mcpSource === undefined ? {} : { mcpServers: `${ASSET_DIRECTORY}/.mcp.json` }),
  }

  const staging = await mkdtemp(join(pluginDirectory, '.dsh-plugin-prepare-'))
  try {
    const stagedAssets = join(staging, ASSET_DIRECTORY)
    await mkdir(join(stagedAssets, 'skills'), { recursive: true })
    await Promise.all(skillSources.map((source, index) => cp(
      source,
      join(stagedAssets, 'skills', String(index)),
      { recursive: true, force: false, errorOnExist: true },
    )))
    if (mcpSource !== undefined) await copyFile(mcpSource, join(stagedAssets, '.mcp.json'))
    await writeFile(join(staging, ENTRY_FILENAME), wrapperSource(manifest))

    await rm(join(pluginDirectory, ASSET_DIRECTORY), { recursive: true, force: true })
    await rm(join(pluginDirectory, ENTRY_FILENAME), { force: true })
    await rename(stagedAssets, join(pluginDirectory, ASSET_DIRECTORY))
    await rename(join(staging, ENTRY_FILENAME), join(pluginDirectory, ENTRY_FILENAME))
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  return manifest
}

try {
  const manifest = await prepare()
  const mcp = manifest.mcpServers === undefined ? '' : ', 1 mcp'
  console.log(`prepare: OK ${manifest.name} (${manifest.skills.length} skill root(s)${mcp})`)
} catch (error) {
  process.stderr.write(`prepare: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
