#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const readme = readFileSync('README.md', 'utf8')
const version = packageJson.version
const errors = []
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

if (!semverPattern.test(version)) {
  errors.push(`package.json version is not valid SemVer: ${version}`)
}

if (packageLock.version !== version) {
  errors.push(`package-lock.json version ${packageLock.version} does not match ${version}`)
}

if (packageLock.packages?.['']?.version !== version) {
  errors.push(
    `package-lock.json root package version ${packageLock.packages?.['']?.version ?? '(missing)'} does not match ${version}`,
  )
}

if (!changelog.includes(`## [${version}] - `)) {
  errors.push(`CHANGELOG.md has no dated release section for ${version}`)
}

if (!readme.includes(`Current package version: \`${version}\``)) {
  errors.push(`README.md does not identify ${version} as the current package version`)
}

const tagIndex = process.argv.indexOf('--tag')
if (tagIndex >= 0) {
  const tag = process.argv[tagIndex + 1]
  if (!tag) {
    errors.push('--tag requires a value')
  } else if (tag !== `v${version}`) {
    errors.push(`release tag ${tag} does not match package version v${version}`)
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Version check failed: ${error}`)
  process.exitCode = 1
} else {
  console.log(`Version metadata is consistent: ${version}`)
}
