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
const result = await Bun.build({
    entrypoints: [resolve(projectRoot, 'demo/src/assets/app.js')],
    outfile: resolve(projectRoot, 'demo/src/assets/app.bundle.js'),
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'inline',
    write: false,
})

if (!result.success) {
    result.logs.forEach(log => console.error(log))
    throw new Error('Unable to build the demonstration application')
}

await Bun.write(resolve(projectRoot, 'demo/src/assets/app.bundle.js'), result.outputs[0])
