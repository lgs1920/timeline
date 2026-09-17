/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineState.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-15
 * Last modified: 2026-09-17
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

/**
 * Compare JSON-compatible values without serializing the whole value graph.
 *
 * @param {*} left - First value.
 * @param {*} right - Second value.
 * @returns {boolean} Whether both values have the same structure and values.
 */
const sameValue = (left, right) => {
    if (Object.is(left, right)) return true
    if (typeof left !== typeof right || left === null || right === null) return false
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
        return left.every((value, index) => sameValue(value, right[index]))
    }
    if (typeof left !== 'object') return false
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    return leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key)
        && sameValue(left[key], right[key]))
}

export const sameTimelineValue = sameValue

/**
 * Create structural comparators used to compare controlled timeline state.
 *
 * Keeping these comparisons outside the custom element makes the state
 * comparison policy explicit and keeps the component focused on DOM work.
 *
 * @returns {{rowsEqual: Function, placementEqual: Function, rowPresentationEqual: Function, sameRows: Function, valuesEqual: Function}}
 */
export const createTimelineStateSignatures = () => {
    const sameRows = (left, right) => {
        if (left === right) return true
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
        return left.every((row, index) => row === right[index])
    }

    const rowsEqual = (left, right) => {
        if (sameRows(left, right)) return true
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
        return left.every((row, index) => {
            const {actions, clips, ...stable} = row ?? {}
            const {actions: rightActions, clips: rightClips, ...rightStable} = right[index] ?? {}
            return sameValue(stable, rightStable)
                && sameValue(actions ?? clips ?? [], rightActions ?? rightClips ?? [])
        })
    }

    const placementEqual = (left, right) => {
        if (sameRows(left, right)) return true
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
        return left.every((row, index) => {
            const rightRow = right[index]
            const clips = row?.actions ?? row?.clips ?? []
            const rightClips = rightRow?.actions ?? rightRow?.clips ?? []
            return row?.id === rightRow?.id
                && Array.isArray(clips)
                && Array.isArray(rightClips)
                && clips.length === rightClips.length
                && clips.every((clip, clipIndex) => {
                    const rightClip = rightClips[clipIndex]
                    return clip?.id === rightClip?.id
                        && clip?.start === rightClip?.start
                        && clip?.end === rightClip?.end
                })
        })
    }

    const rowPresentationEqual = (left, right) => {
        if (sameRows(left, right)) return true
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
        const shape = value => {
            const stable = Object.assign({}, value)
            delete stable.start
            delete stable.end
            delete stable.duration
            delete stable.startMillis
            delete stable.endMillis
            delete stable.durationMillis
            return stable
        }
        return left.every((row, index) => {
            const {actions, clips, ...stable} = row ?? {}
            const {actions: rightActions, clips: rightClips, ...rightStable} = right[index] ?? {}
            return sameValue(stable, rightStable)
                && sameValue(
                    (actions ?? clips ?? []).map(action => shape(action)),
                    (rightActions ?? rightClips ?? []).map(action => shape(action)),
                )
        })
    }

    return {
        rowsEqual,
        placementEqual,
        rowPresentationEqual,
        sameRows,
        valuesEqual: sameValue,
    }
}
