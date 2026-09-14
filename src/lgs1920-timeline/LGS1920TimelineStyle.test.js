/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920TimelineStyle.test.js
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

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const styleSource = readFileSync(resolve('src/lgs1920-timeline/lgs1920-timeline.css'), 'utf8')

describe('lgs1920-timeline styles', () => {
    it('keeps the color picker trigger visually hidden while preserving swatch interaction', () => {
        const pickerRule = styleSource.match(/& \.lgs1920-wa-timeline__clip-color-picker--menu-trigger \{([^}]*)}/)?.[1]
        const popupRule = styleSource.match(/& \.lgs1920-wa-timeline__clip-color-picker--menu-trigger::part\(color-picker\) \{([^}]*)}/)?.[1]
        const triggerRule = styleSource.match(/& \.lgs1920-wa-timeline__clip-color-picker--menu-trigger::part\(trigger\) \{([^}]*)}/)?.[1]

        expect(pickerRule).not.toMatch(/opacity:\s*0/)
        expect(popupRule).toContain('pointer-events: auto;')
        expect(triggerRule).toContain('opacity: 0;')
    })

    it('uses balanced nested CSS selectors and generic integration boundaries', () => {
        expect((styleSource.match(/{/g) ?? []).length).toBe((styleSource.match(/}/g) ?? []).length)
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface-controls {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__clip {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__playhead {')
        expect(styleSource).not.toMatch(/widget|replay|capture-exclude/i)
    })
})
