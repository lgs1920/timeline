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
 * Last modified: 2026-09-15
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
        expect(styleSource).toMatch(/& \.lgs1920-wa-timeline__playhead \{[\s\S]*?z-index: 22;/)
        const neutralHeaderControlRule = styleSource.match(/& slot\[name='custom-menu'\],[\s\S]*?& \.lgs1920-wa-timeline__header-start > slot\[name='header'\]/)?.[0] ?? ''
        expect(neutralHeaderControlRule).toContain('border: 0;')
        expect(styleSource).toContain('width: 1.5rem;')
        expect(styleSource).toContain('--lgs-timeline-range-handle-color: var(--wa-color-success-fill-loud')
        expect(styleSource).toContain('--lgs-timeline-range-end-color: var(--wa-color-danger-fill-loud')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__range-selection {')
        expect(styleSource).toContain('--lgs-timeline-range-selection-height: 0.5rem')
        expect(styleSource).toContain('--lgs-timeline-range-selection-overflow: 3px')
        expect(styleSource).toContain('border: 0;')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface--read-only')
        expect(styleSource).toContain('--lgs-timeline-clip-resize-grab-color:')
        expect(styleSource).toContain('.lgs1920-wa-timeline__clip--resizing .lgs1920-wa-timeline__clip-handle')
        expect(styleSource).toContain('& wa-slider[label-at-start] {')
        expect(styleSource).toContain('& wa-slider[label-at-start][width-auto] {')
        expect(styleSource).toContain('grid-template-columns: auto minmax(8rem, 10rem);')
        expect(styleSource).toContain('& wa-slider[label-at-start]::part(label) {')
        expect(styleSource).toContain('& wa-slider[label-at-start]::part(hint) {')
        expect(styleSource).toContain('grid-template-columns: auto minmax(0, 1fr);')
        expect(styleSource).toContain('max-width: none;')
        expect(styleSource).toContain('--thumb-width: 0.75rem;')
        expect(styleSource).toContain('--thumb-height: 0.75rem;')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__time-slider::part(thumb) {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__zoom-slider::part(thumb) {')
        expect(styleSource).toContain('border-radius: 50%;')
        expect(styleSource).toContain('user-select: none;')
        expect(styleSource).toContain('-webkit-user-select: none;')
    })
})
