/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: check-package.mjs
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

import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const result = await Bun.build({
    entrypoints: [resolve(projectRoot, 'test/fixtures/package-consumer.jsx')],
    target: 'browser',
    format: 'esm',
    minify: false,
    write: false,
    // Bun does not self-resolve the package name from its own source tree.
    // Point the consumer fixture at the bundles that would be published.
    alias: {
        '@lgs1920/timeline': resolve(projectRoot, 'dist/index.js'),
        '@lgs1920/timeline/react': resolve(projectRoot, 'dist/react.js'),
    },
    define: {
        'process.env.NODE_ENV': '"production"',
    },
})

if (!result.success) {
    result.logs.forEach(log => console.error(log))
    throw new Error('The published package exports cannot be bundled by a consumer')
}
