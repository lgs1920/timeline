/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: build.mjs
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-01
 * Last modified: 2026-09-01
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {rm} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const entryRoot = resolve(projectRoot, 'entries')
const outputRoot = resolve(projectRoot, 'dist')
const inlineCssPaths = new Map()

/**
 * Load Vite-style inline CSS imports as JavaScript strings for Bun bundling.
 */
const inlineCssPlugin = {
    name: 'inline-css',
    setup: build => {
        build.onResolve({filter: /\.css\?inline$/}, argumentsValue => {
            const filePath = resolve(argumentsValue.resolveDir, argumentsValue.path.replace('?inline', ''))
            inlineCssPaths.set('lgs1920-timeline.css', filePath)
            return {
                path: 'lgs1920-timeline.css',
                namespace: 'inline-css',
            }
        })
        build.onLoad({filter: /.*/, namespace: 'inline-css'}, async argumentsValue => ({
            contents: `export default ${JSON.stringify(await Bun.file(inlineCssPaths.get(argumentsValue.path)).text())}`,
            loader: 'js',
        }))
    },
}

/**
 * Build one public package entry with Bun.
 *
 * @param {string} entryPoint - Absolute source entry point.
 * @param {string} outputName - Output JavaScript file name.
 * @returns {Promise<void>} Resolves when the bundle is written.
 */
const buildEntry = async (entryPoint, outputName) => {
    const result = await Bun.build({
        entrypoints: [entryPoint],
        outdir: outputRoot,
        naming: outputName,
        target: 'browser',
        format: 'esm',
        minify: false,
        sourcemap: 'external',
        external: [
            '@awesome.me/webawesome/*',
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
        ],
        define: {
            'process.env.NODE_ENV': '"production"',
        },
        plugins: [inlineCssPlugin],
    })

    if (!result.success) {
        result.logs.forEach(log => console.error(log))
        throw new Error(`Unable to build ${outputName}`)
    }
}

await rm(outputRoot, {recursive: true, force: true})
await buildEntry(resolve(entryRoot, 'index.js'), 'index.js')
await buildEntry(resolve(entryRoot, 'react.jsx'), 'react.js')
await Bun.write(
    resolve(outputRoot, 'styles.css'),
    Bun.file(resolve(projectRoot, 'src/lgs1920-timeline/lgs1920-timeline.css')),
)
