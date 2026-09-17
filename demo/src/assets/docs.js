/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: docs.js
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

import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/markdown/markdown.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/page/page.js'

const slugify = value => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const addHeadingIds = () => {
    const headings = document.querySelectorAll('.docs-content h2, .docs-content h3')
    const usedIds = new Set()

    headings.forEach(heading => {
        const baseId = heading.id || slugify(heading.textContent ?? '') || 'section'
        let id = baseId
        let suffix = 2

        while (usedIds.has(id)) {
            id = `${baseId}-${suffix}`
            suffix += 1
        }

        usedIds.add(id)
        heading.id = id
    })
}

const docsContent = document.querySelector('.docs-content')
if (docsContent) {
    new MutationObserver(addHeadingIds).observe(docsContent, {childList: true, subtree: true})
    addHeadingIds()
}
