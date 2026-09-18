/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineHistory.js
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

const cloneSerializable = value => {
    if (value === undefined) return undefined
    if (typeof structuredClone === 'function') return structuredClone(value)
    return JSON.parse(JSON.stringify(value))
}

const sameSerializableValue = (left, right) => {
    try {
        return JSON.stringify(left) === JSON.stringify(right)
    }
    catch {
        return false
    }
}

/**
 * Create bounded undo and redo stacks for one timeline instance.
 *
 * @param {Object} [options] - History options.
 * @param {number} [options.limit=200] - Maximum number of committed entries.
 * @returns {Object} History operations and state accessors.
 */
export const createTimelineHistory = ({limit = 200} = {}) => {
    const maximum = Math.max(1, Math.floor(Number(limit) || 200))
    const past = []
    const future = []

    const record = ({before, after, type, detail} = {}) => {
        if (!Array.isArray(before) || !Array.isArray(after) || sameSerializableValue(before, after)) return false
        past.push({
            after: cloneSerializable(after),
            before: cloneSerializable(before),
            detail: cloneSerializable(detail),
            type: String(type ?? 'edit'),
        })
        if (past.length > maximum) past.splice(0, past.length - maximum)
        future.splice(0)
        return true
    }

    const peekUndo = () => past.at(-1) ?? null
    const peekRedo = () => future.at(-1) ?? null
    const undo = () => {
        const entry = past.pop()
        if (!entry) return null
        future.push(entry)
        return entry
    }
    const redo = () => {
        const entry = future.pop()
        if (!entry) return null
        past.push(entry)
        return entry
    }
    const clear = () => {
        past.splice(0)
        future.splice(0)
    }

    return {
        canRedo: () => future.length > 0,
        canUndo: () => past.length > 0,
        clear,
        peekRedo,
        peekUndo,
        record,
        redo,
        undo,
    }
}
