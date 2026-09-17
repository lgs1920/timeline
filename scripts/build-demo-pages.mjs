/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: build-demo-pages.mjs
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-14
 * Last modified: 2026-09-17
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {mkdir} from 'node:fs/promises'
import {parseReleaseTags, renderChangelogEntries} from './changelog.mjs'

const packageJson = await Bun.file('./package.json').json()
const protectMarkdownScript = markdown => markdown.replaceAll('</script', '<\\/script')
const readmeMarkdown = protectMarkdownScript((await Bun.file('./README.md').text())
    .replaceAll('](docs/specifications.md)', '](./docs/specifications.html)'))
const componentReadmeMarkdown = protectMarkdownScript((await Bun.file('./src/lgs1920-timeline/README.md').text())
    .replaceAll('](../../README.md)', '](../readme.html)')
    .replaceAll('](../../docs/specifications.md)', '](./specifications.html)')
    .replaceAll('](../../LICENSE.md)', '](https://github.com/lgs1920/timeline/blob/main/LICENSE.md)'))
const specificationsMarkdown = protectMarkdownScript((await Bun.file('./docs/specifications.md').text())
    .replaceAll('](../README.md)', '](../readme.html)')
    .replaceAll('](../src/lgs1920-timeline/README.md)', '](./)'))

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

const banner = (currentPage, basePath = './') => `
<nav class="site-banner" aria-label="Site navigation">
    <div class="site-banner-left">
        <a class="site-banner-logo" href="https://lgs1920.fr/" target="_blank" rel="noopener noreferrer" aria-label="LGS1920 website">
            <img src="${basePath}assets/logo/logo-horizontal.png" alt="LGS1920">
        </a>
        <div class="site-banner-pages">
            <a href="${basePath}"${currentPage === 'demo' ? ' aria-current="page"' : ''}>Demo</a>
            <a href="${basePath}docs/"${currentPage === 'docs' ? ' aria-current="page"' : ''}>Documentation</a>
            <a href="${basePath}readme.html"${currentPage === 'readme' ? ' aria-current="page"' : ''}>README</a>
            <a href="${basePath}changelog.html"${currentPage === 'changelog' ? ' aria-current="page"' : ''}>Changelog</a>
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
    <wa-select data-theme-control="theme" label="Theme" size="medium" value="default">
        <wa-option value="default">Default</wa-option>
        <wa-option value="awesome">Awesome</wa-option>
        <wa-option value="shoelace">Shoelace</wa-option>
    </wa-select>
    <wa-select data-theme-control="mode" label="Mode" size="medium" value="dark">
        <wa-option value="dark">Dark</wa-option>
        <wa-option value="light">Light</wa-option>
    </wa-select>
    <wa-select data-theme-control="color" label="Brand" size="medium" value="blue">
        <wa-option value="blue">Blue</wa-option>
        <wa-option value="red">Red</wa-option>
        <wa-option value="orange">Orange</wa-option>
        <wa-option value="green">Green</wa-option>
        <wa-option value="cyan">Cyan</wa-option>
        <wa-option value="purple">Purple</wa-option>
        <wa-option value="pink">Pink</wa-option>
    </wa-select>
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
<a href="#keyboard-shortcuts">Keyboard shortcuts</a>
<a href="#events">Events</a>
<a href="#css-customization">CSS customization</a>
<a href="#methods">Methods</a>
<a href="#accessibility">Accessibility</a>
<a href="#license">License</a>`
const docsPage = ({title, description, navigation, markdown, footer}) => `<!doctype html>
<html lang="en" class="wa-theme-default wa-palette-default wa-brand-blue wa-dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <title>${title} · LGS1920 Timeline</title>
    <link rel="stylesheet" href="../assets/webawesome.css">
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
${banner('docs', '../')}
<wa-page class="docs-page" mobile-breakpoint="52rem">
    <nav slot="navigation" class="docs-navigation" aria-label="Documentation sections">
        ${navigation}
    </nav>
    <main class="docs-main" id="main-content">
        <article class="docs-content">
            <wa-markdown><script type="text/markdown">${markdown}</script></wa-markdown>
        </article>
    </main>
    <footer slot="footer" class="docs-footer">${footer}</footer>
</wa-page>
<script type="module" src="../assets/docs.bundle.js"></script>
${themeScript}
</body>
</html>`

const docsHtml = docsPage({
    description: 'Complete documentation for the @lgs1920/timeline package.',
    footer: 'LGS1920 Timeline · Complete component reference',
    markdown: componentReadmeMarkdown,
    navigation: docsNavigation,
    title: 'Documentation',
})
const specificationsHtml = docsPage({
    description: 'Functional, technical, and software specifications for the @lgs1920/timeline package.',
    footer: 'LGS1920 Timeline · Functional, technical, and software specifications',
    markdown: specificationsMarkdown,
    navigation: `<p class="docs-navigation-title">Specifications</p>
<a href="#functional-specifications">Functional specifications</a>
<a href="#technical-specifications">Technical specifications</a>
<a href="#software-specifications">Software specifications</a>`,
    title: 'Specifications',
})

await mkdir('./demo/dist', {recursive: true})
await mkdir('./demo/dist/docs', {recursive: true})
const demoPath = './demo/dist/index.html'
const demoHtml = (await Bun.file(demoPath).text()).replace('@lgs1920/timeline vx.y.z', `@lgs1920/timeline v${packageJson.version}`)
await Bun.write(demoPath, demoHtml)
await Bun.write('./demo/dist/readme.html', shell('readme', 'Component reference', readmeHtml))
await Bun.write('./demo/dist/changelog.html', shell('changelog', 'Changelog', changelogHtml))
await Bun.write('./demo/dist/docs/index.html', docsHtml)
await Bun.write('./demo/dist/docs/specifications.html', specificationsHtml)
