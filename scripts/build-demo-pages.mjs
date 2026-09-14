import {mkdir} from 'node:fs/promises'
import {parseReleaseTags, renderChangelogEntries} from './changelog.mjs'

const packageJson = await Bun.file('./package.json').json()
const readmeMarkdown = (await Bun.file('./README.md').text()).replaceAll('</script', '<\\/script')
const componentReadmeMarkdown = (await Bun.file('./src/lgs1920-timeline/README.md').text()).replaceAll('</script', '<\\/script')

const readGitReleases = () => {
    const result = Bun.spawnSync([
        'git',
        'for-each-ref',
        '--sort=-version:refname',
        '--format=%(refname:short)%00%(creatordate:iso-strict)%00%(contents)%00',
        'refs/tags/v*',
    ], {stdout: 'pipe', stderr: 'pipe'})

    if (result.exitCode !== 0) {
        return []
    }

    return parseReleaseTags(new TextDecoder().decode(result.stdout))
}

const banner = currentPage => `
<nav class="site-banner" aria-label="Site navigation">
    <div class="site-banner-left">
        <a class="site-banner-logo" href="https://lgs1920.fr/" target="_blank" rel="noopener noreferrer" aria-label="LGS1920 website">
            <img src="./assets/logo/logo-horizontal.png" alt="LGS1920">
        </a>
        <div class="site-banner-pages">
            <a href="./">Demo</a>
            <a href="./docs/"${currentPage === 'docs' ? ' aria-current="page"' : ''}>Documentation</a>
            <a href="./readme.html"${currentPage === 'readme' ? ' aria-current="page"' : ''}>README</a>
            <a href="./changelog.html"${currentPage === 'changelog' ? ' aria-current="page"' : ''}>Changelog</a>
        </div>
    </div>
    ${controls}
    <div class="site-banner-external">
        <a href="https://github.com/lgs1920/timeline" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">GitHub</a>
        <a href="https://www.npmjs.com/package/@lgs1920/timeline" target="_blank" rel="noopener noreferrer" aria-label="npm package">npm</a>
    </div>
</nav>`

const themeScript = `<script type="module">
const config = {theme: 'default', mode: 'dark', color: 'blue'}
const themes = {
    default: ['wa-theme-default', 'wa-palette-default'],
    awesome: ['wa-theme-awesome', 'wa-palette-bright'],
    shoelace: ['wa-theme-shoelace', 'wa-palette-shoelace'],
}
const apply = () => {
    document.documentElement.className = [...themes[config.theme], 'wa-brand-' + config.color, config.mode === 'light' ? 'wa-light' : 'wa-dark'].join(' ')
}
document.querySelectorAll('[data-theme-control]').forEach(control => control.addEventListener('change', event => {
    config[event.target.dataset.themeControl] = event.target.value
    apply()
}))
apply()
</script>`

const controls = `<div class="site-banner-controls" aria-label="Display settings">
    <label>Theme <select data-theme-control="theme"><option>default</option><option>awesome</option><option>shoelace</option></select></label>
    <label>Mode <select data-theme-control="mode"><option value="dark">Dark</option><option value="light">Light</option></select></label>
    <label>Brand <select data-theme-control="color"><option>blue</option><option>red</option><option>orange</option><option>green</option><option>cyan</option><option>purple</option><option>pink</option></select></label>
</div>`

const shell = (currentPage, title, content) => `<!doctype html>
<html lang="en" class="wa-theme-default wa-palette-default wa-brand-blue wa-dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${title} for the @lgs1920/timeline package.">
    <title>${title} · LGS1920 Timeline</title>
    <link rel="stylesheet" href="./assets/webawesome.css">
    <link rel="stylesheet" href="./assets/styles.css">
</head>
<body>
${banner(currentPage)}
<main class="demo-shell"><article class="readme-content">${content}</article></main>
<script type="module" src="./assets/readme.bundle.js"></script>
${themeScript}
</body>
</html>`

const readmeHtml = `<wa-markdown><script type="text/markdown">${readmeMarkdown}</script></wa-markdown>`
const changelogHtml = `<header class="demo-header"><p class="eyebrow">Release history</p><h1>LGS1920 Timeline releases</h1><p class="intro">Each entry comes from an annotated version tag in the repository.</p></header><section class="changelog-list">${renderChangelogEntries(readGitReleases())}</section>`
const docsNavigation = `<p class="docs-navigation-title">Reference</p>
<a href="#installation">Installation</a>
<a href="#usage">Usage</a>
<a href="#public-properties">Public properties</a>
<a href="#react-adapter">React adapter</a>
<a href="#slots">Slots</a>
<a href="#events">Events</a>
<a href="#css-customization">CSS customization</a>
<a href="#methods">Methods</a>
<a href="#accessibility">Accessibility</a>
<a href="#license">License</a>`
const docsHtml = `<!doctype html>
<html lang="en" class="wa-theme-default wa-palette-default wa-brand-blue wa-dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Complete documentation for the @lgs1920/timeline package.">
    <title>Documentation · LGS1920 Timeline</title>
    <link rel="stylesheet" href="../assets/webawesome.css">
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
<wa-page class="docs-page" mobile-breakpoint="52rem">
    <header slot="header" class="docs-header">
        <a class="docs-header-brand" href="../" aria-label="LGS1920 Timeline demo home">
            <img src="../assets/logo/logo-horizontal.png" alt="LGS1920">
            <span>Timeline docs</span>
        </a>
        <div class="docs-header-links" aria-label="Site navigation">
            <a href="../">Demo</a>
            <a href="../readme.html">README</a>
            <a href="../changelog.html">Changelog</a>
            <a href="https://github.com/lgs1920/timeline" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.npmjs.com/package/@lgs1920/timeline" target="_blank" rel="noopener noreferrer">npm</a>
        </div>
        ${controls}
    </header>
    <nav slot="navigation" class="docs-navigation" aria-label="Documentation sections">
        ${docsNavigation}
    </nav>
    <main class="docs-main" id="main-content">
        <article class="docs-content">
            <wa-markdown><script type="text/markdown">${componentReadmeMarkdown}</script></wa-markdown>
        </article>
    </main>
    <footer slot="footer" class="docs-footer">LGS1920 Timeline · Complete component reference</footer>
</wa-page>
<script type="module" src="../assets/docs.bundle.js"></script>
${themeScript}
</body>
</html>`

await mkdir('./demo/dist', {recursive: true})
await mkdir('./demo/dist/docs', {recursive: true})
const demoPath = './demo/dist/index.html'
const demoHtml = (await Bun.file(demoPath).text()).replace('@lgs1920/timeline vx.y.z', `@lgs1920/timeline v${packageJson.version}`)
await Bun.write(demoPath, demoHtml)
await Bun.write('./demo/dist/readme.html', shell('readme', 'Component reference', readmeHtml))
await Bun.write('./demo/dist/changelog.html', shell('changelog', 'Changelog', changelogHtml))
await Bun.write('./demo/dist/docs/index.html', docsHtml)
