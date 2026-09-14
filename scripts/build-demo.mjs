/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: build-demo.mjs
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-14
 * Last modified: 2026-09-14
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {resolve} from 'node:path'

const projectRoot = resolve(import.meta.dir, '..')
const entrypoints = [
    ['app.js', 'app.bundle.js'],
    ['readme.js', 'readme.bundle.js'],
    ['docs.js', 'docs.bundle.js'],
]

for (const [entryName, outputName] of entrypoints) {
    const result = await Bun.build({
        entrypoints: [resolve(projectRoot, `demo/src/assets/${entryName}`)],
        outfile: resolve(projectRoot, `demo/src/assets/${outputName}`),
        target: 'browser',
        format: 'esm',
        minify: false,
        sourcemap: 'inline',
        write: false,
    })

    if (!result.success) {
        result.logs.forEach(log => console.error(log))
        throw new Error(`Unable to build ${entryName}`)
    }

    await Bun.write(resolve(projectRoot, `demo/src/assets/${outputName}`), result.outputs[0])
}

const stylesResult = await Bun.build({
    entrypoints: [resolve(projectRoot, 'demo/webawesome.css')],
    outfile: resolve(projectRoot, 'demo/src/assets/webawesome.css'),
    target: 'browser',
    minify: false,
    write: false,
})

if (!stylesResult.success) {
    stylesResult.logs.forEach(log => console.error(log))
    throw new Error('Unable to build the Web Awesome stylesheet')
}

await Bun.write(resolve(projectRoot, 'demo/src/assets/webawesome.css'), stylesResult.outputs[0])
