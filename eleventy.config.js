/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: eleventy.config.js
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

/**
 * Configure the static demonstration site.
 *
 * @param {Object} eleventyConfig - Eleventy configuration API.
 * @returns {Object} Eleventy directory configuration.
 */
export default eleventyConfig => {
    eleventyConfig.addPassthroughCopy({'demo/src/assets/styles.css': 'assets/styles.css'})
    eleventyConfig.addPassthroughCopy({'demo/src/assets/app.bundle.js': 'assets/app.bundle.js'})
    eleventyConfig.addPassthroughCopy({'demo/src/assets/readme.bundle.js': 'assets/readme.bundle.js'})
    eleventyConfig.addPassthroughCopy({'demo/src/assets/docs.bundle.js': 'assets/docs.bundle.js'})
    eleventyConfig.addPassthroughCopy({'demo/assets': 'assets'})
    eleventyConfig.addPassthroughCopy({'demo/src/assets/webawesome.css': 'assets/webawesome.css'})

    return {
        dir: {
            input: 'demo/src',
            output: 'demo/dist',
        },
        templateFormats: ['njk'],
    }
}
