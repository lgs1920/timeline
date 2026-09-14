/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: vitest.config.cjs
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

const {defineConfig} = require('vitest/config')

/**
 * Create the Vitest configuration with React's automatic JSX transform.
 *
 * @returns {Promise<import('vitest/config').UserConfig>} Vitest configuration.
 */
const createConfig = async () => {
    const {default: react} = await import('@vitejs/plugin-react')
    return {
        plugins: [react()],
        test: {
            environment: 'jsdom',
            include: [
                'src/**/*.test.{js,jsx}',
                'tests/**/*.test.js',
            ],
            exclude: ['node_modules', 'dist', '.git'],
        },
    }
}

module.exports = defineConfig(createConfig)
