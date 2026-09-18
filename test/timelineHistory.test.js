/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineHistory.test.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-18
 * Last modified: 2026-09-18
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {describe, expect, it} from 'vitest'
import {createTimelineHistory} from '../src/timelineHistory.js'

describe('timeline history', () => {
    it('keeps at most 200 committed entries and clears redo after a branch', () => {
        const history = createTimelineHistory()
        for (let index = 0; index < 201; index += 1) {
            history.record({before: [{value: index}], after: [{value: index + 1}], type: 'edit'})
        }

        expect(history.canUndo()).toBe(true)
        let entry = history.undo()
        expect(entry.before).toEqual([{value: 200}])
        expect(history.canRedo()).toBe(true)

        history.record({before: [{value: 200}], after: [{value: 999}], type: 'branch'})
        expect(history.canRedo()).toBe(false)
        entry = history.undo()
        expect(entry.after).toEqual([{value: 999}])
    })

    it('ignores unchanged snapshots and supports empty stacks', () => {
        const history = createTimelineHistory({limit: 1})
        const snapshot = [{id: 'track'}]
        expect(history.record({before: snapshot, after: snapshot, type: 'noop'})).toBe(false)
        expect(history.undo()).toBe(null)
        expect(history.redo()).toBe(null)
        expect(history.canUndo()).toBe(false)
        expect(history.canRedo()).toBe(false)
    })
})
