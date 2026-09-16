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
 * Last modified: 2026-09-16
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
        expect(styleSource).toContain('container-name: lgs1920-timeline-legend-ruler;')
        expect(styleSource).toContain('@container lgs1920-timeline-legend-ruler (max-width: 14rem) {')
        expect(styleSource).toContain("wa-button[data-testid='lgs1920-wa-add-track'] > slot[name='add-track-label'] {")
        expect(styleSource).toContain("wa-button[data-testid='lgs1920-wa-add-track']::part(base) {")
        expect(styleSource).toContain('display: none;')
        expect(styleSource).toContain('form.lgs1920-wa-timeline__track-content {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__scroll-shell--surface {')
        expect(styleSource).toContain('border-inline: 1px solid var(--lgs-timeline-border-color);')
        expect(styleSource).toContain('--lgs-timeline-viewport-margin: 0.5rem;')
        expect(styleSource).not.toContain('padding-inline: var(--lgs-timeline-viewport-margin);')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface-edge-gutters {')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface-edge-gutter {')
        expect(styleSource).toContain('border: 0;')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface-edge-gutter--start {')
        expect(styleSource).toContain('border-inline-end: 1px solid var(--lgs-timeline-quiet-border-color);')
        expect(styleSource).toContain('& .lgs1920-wa-timeline__surface-edge-gutter--end {')
        expect(styleSource).toContain('border-inline-start: 1px solid var(--lgs-timeline-quiet-border-color);')
        expect(styleSource).toContain('border: 1px solid var(--lgs-timeline-border-color);')
        expect(styleSource).toContain("& .lgs1920-wa-timeline__split-panel::part(divider):focus {")
        expect(styleSource).toContain("& .lgs1920-wa-timeline__split-panel[data-divider-active]::part(divider),")
        expect(styleSource).not.toContain('& .lgs1920-wa-timeline__split-panel:focus-within::part(divider) {')
        expect(styleSource).toContain('background-color: var(--wa-color-brand-fill-loud, var(--wa-color-brand));')
        expect(styleSource).not.toContain('border-inline-end: 1px solid var(--lgs-timeline-border-color);')
        expect(styleSource).toContain('padding-inline-start: 4px;')
        expect(styleSource).toContain("& .lgs1920-wa-timeline__split-panel > wa-icon[slot='divider'] {")
        expect(styleSource).toContain('font-size: 0.75rem;')
        expect(styleSource).toContain('margin: 2px;')
        expect(styleSource).toContain('--lgs-timeline-label-editor-padding-block: 0.25rem;')
        expect(styleSource).toContain('user-select: text;')
        expect(styleSource).toContain('top: var(--lgs-timeline-header-height);')
        expect(styleSource).toContain('bottom: var(--lgs-timeline-controls-height);')
        expect(styleSource).toContain('border: 1px solid var(--lgs-timeline-quiet-border-color);')
        expect(styleSource).toContain('z-index: 3;')
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
        expect(styleSource).toContain("& .lgs1920-wa-timeline__range-handle[aria-disabled='true']")
        expect(styleSource).toContain("& .lgs1920-wa-timeline__range-handle[aria-disabled='true'] > .lgs1920-wa-timeline__range-grip > :is(slot, wa-icon)")
        expect(styleSource).toContain("& .lgs1920-wa-timeline__clip-handle[aria-hidden='true']")
        expect(styleSource).not.toContain('& .lgs1920-wa-timeline__clip-handle:hover')
        expect(styleSource).toContain('--lgs-timeline-clip-resize-grab-color:')
        expect(styleSource).toContain('.lgs1920-wa-timeline__clip--resizing .lgs1920-wa-timeline__clip-handle--resizing')
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
