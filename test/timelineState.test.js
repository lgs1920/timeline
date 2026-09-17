/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineState.test.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-17
 * Last modified: 2026-09-17
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {describe, expect, it, vi} from 'vitest'
import {withLazySnapshot} from '../src/timelineEventDetails'
import {createTimelineStateSignatures} from '../src/timelineState'

describe('timeline state comparisons', () => {
    const comparisons = createTimelineStateSignatures()

    it('compares row data without depending on object key order', () => {
        expect(comparisons.rowsEqual(
            [{id: 'video', label: 'Video', actions: [{id: 'clip', start: 0, end: 1}]}],
            [{label: 'Video', actions: [{end: 1, start: 0, id: 'clip'}], id: 'video'}],
        )).toBe(true)
    })

    it('distinguishes placement from non positional presentation changes', () => {
        const base = [{id: 'video', actions: [{id: 'clip', start: 0, end: 1, label: 'Intro'}]}]
        const relabeled = [{id: 'video', actions: [{id: 'clip', start: 0, end: 1, label: 'Opening'}]}]
        const moved = [{id: 'video', actions: [{id: 'clip', start: 2, end: 3, label: 'Intro'}]}]
        expect(comparisons.placementEqual(base, relabeled)).toBe(true)
        expect(comparisons.rowPresentationEqual(base, moved)).toBe(true)
        expect(comparisons.rowsEqual(base, relabeled)).toBe(false)
        expect(comparisons.placementEqual(base, moved)).toBe(false)
    })

    it('defers and memoizes a public event snapshot', () => {
        const getSnapshot = vi.fn(() => ({tracks: []}))
        const detail = withLazySnapshot({type: 'drag'}, getSnapshot)
        expect(getSnapshot).not.toHaveBeenCalled()
        expect(detail.data).toEqual({tracks: []})
        expect(detail.data).toEqual({tracks: []})
        expect(getSnapshot).toHaveBeenCalledOnce()
    })
})
