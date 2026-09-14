if (process.env.TIMELINE_BUN_PUBLISH_LIFECYCLE === '1') process.exit(0)

const args = Bun.argv.slice(2)
const increments = ['patch', 'minor', 'major']
const preview = args.includes('--preview')
const incrementArgs = args.filter(arg => arg !== '--preview')

if (incrementArgs.length > 1 || incrementArgs.some(arg => !increments.includes(arg.slice(2)) || !arg.startsWith('--'))) {
    console.error('Usage: bun run publish [--patch|--minor|--major] [--preview]')
    process.exit(1)
}

const increment = incrementArgs.length === 0 ? 'patch' : incrementArgs[0].slice(2)

const output = (command, commandArgs) => {
    const result = Bun.spawnSync([command, ...commandArgs], {stdout: 'pipe', stderr: 'pipe'})

    if (result.exitCode !== 0) {
        const error = new TextDecoder().decode(result.stderr).trim()
        console.error(error || `Command failed: ${command} ${commandArgs.join(' ')}`)
        process.exit(result.exitCode || 1)
    }

    return new TextDecoder().decode(result.stdout).trim()
}

const run = async (command, commandArgs) => {
    const child = Bun.spawn([command, ...commandArgs], {stdout: 'inherit', stderr: 'inherit'})
    const exitCode = await child.exited
    if (exitCode !== 0) process.exit(exitCode)
}

if (output('git', ['status', '--porcelain'])) {
    console.error('Publication arrêtée : le dépôt contient des changements non commités.')
    process.exit(1)
}

const latestTag = output('git', ['tag', '--list', 'v*', '--sort=-version:refname']).split('\n')[0]
const releasePaths = ['.github', 'src', 'entries', 'demo', 'scripts', 'test', 'README.md']
if (latestTag && !output('git', ['diff', '--name-only', `${latestTag}..HEAD`, '--', ...releasePaths])) {
    console.error(`Publication arrêtée : aucun changement dans ${releasePaths.join(', ')} depuis ${latestTag}.`)
    process.exit(1)
}

const packageJson = await Bun.file('./package.json').json()
const currentVersion = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(packageJson.version)
if (!currentVersion) {
    console.error(`Version invalide dans package.json : ${packageJson.version}`)
    process.exit(1)
}

let [major, minor, patch] = currentVersion.slice(1).map(Number)
if (increment === 'major') {
    major += 1
    minor = 0
    patch = 0
} else if (increment === 'minor') {
    minor += 1
    patch = 0
} else {
    patch += 1
}

const nextVersion = `${major}.${minor}.${patch}`
const readme = await Bun.file('./README.md').text()
const releaseLine = /^The current release is `[^`]+`/m
const changeRange = latestTag ? `${latestTag}..HEAD` : 'HEAD'
const changedFiles = output('git', ['diff', '--name-only', changeRange, '--', '.github', 'src', 'entries', 'demo', 'scripts', 'test'])
    .split('\n')
    .filter(Boolean)
const releaseChangeMessages = [
    ['.github', 'Updated CI and release automation.'],
    ['src', 'Updated timeline behavior, rendering, and editing.'],
    ['entries', 'Updated the public package entry points.'],
    ['demo', 'Updated the interactive demonstration.'],
    ['scripts', 'Updated build, documentation, or release automation.'],
    ['test', 'Updated automated test coverage.'],
].filter(([path]) => changedFiles.some(file => file === path || file.startsWith(`${path}/`)))
    .map(([, message]) => `- ${message}`)
const releaseChanges = releaseChangeMessages.join('\n') || '- Updated the package implementation and release configuration.'
const compareUrl = latestTag
    ? `https://github.com/lgs1920/timeline/compare/${latestTag}...v${nextVersion}`
    : `https://github.com/lgs1920/timeline/releases/tag/v${nextVersion}`
const tagMessage = `v${nextVersion}\n\nChanges:\n${releaseChanges}\n\nChanges between releases: ${compareUrl}`

if (!releaseLine.test(readme)) {
    console.error('Publication arrêtée : ligne de version introuvable dans README.md.')
    process.exit(1)
}

if (preview) {
    console.log(`Proposed release: v${nextVersion}\n\n${tagMessage}`)
    process.exit(0)
}

await Bun.write('./package.json', `${JSON.stringify({...packageJson, version: nextVersion}, null, 2)}\n`)
await Bun.write('./README.md', readme.replace(releaseLine, `The current release is \`${nextVersion}\``))
await run('git', ['add', 'package.json', 'README.md'])
await run('git', ['commit', '-m', `v${nextVersion}`])
await run('git', ['tag', '-a', `v${nextVersion}`, '-m', tagMessage])
await run('git', ['push', 'origin', 'main', '--follow-tags'])
console.log(`GitHub release: https://github.com/lgs1920/timeline/releases/tag/v${nextVersion}`)
