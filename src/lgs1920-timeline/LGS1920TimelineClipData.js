/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920TimelineClipData.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-15
 * Last modified: 2026-09-15
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

/**
 * Clone the editable parts of timeline rows for a transient interaction.
 *
 * @param {Array} rows - Timeline rows.
 * @returns {Array} Cloned rows and clips.
 */
export const cloneRows = rows => rows.map(row => ({
    ...row,
    actions: (row.actions ?? []).map(clip => ({...clip})),
}))

/**
 * Resolve a clip interval with a positive duration.
 *
 * @param {Object} clip - Timeline clip.
 * @returns {{start: number, end: number, duration: number}} Clip interval.
 */
export const resolveClipInterval = clip => {
    const start = Math.max(0, Number(clip?.start) || 0)
    const end = Math.max(start, Number(clip?.end) || start)
    return {start, end, duration: Math.max(0, end - start)}
}

/**
 * Test whether two clip intervals overlap.
 *
 * @param {Object} left - First clip.
 * @param {Object} right - Second clip.
 * @returns {boolean} Whether the intervals overlap.
 */
export const clipsOverlap = (left, right) => {
    const first = resolveClipInterval(left)
    const second = resolveClipInterval(right)
    return first.start < second.end && second.start < first.end
}

/**
 * Check whether a track layout contains overlapping clips.
 *
 * The clips are sorted once, then compared with the furthest end already
 * seen. This avoids the previous nested slice/some traversal.
 *
 * @param {Array} clips - Clips on one track.
 * @returns {boolean} Whether at least two clips overlap.
 */
export const hasClipOverlaps = clips => {
    const ordered = (clips ?? [])
        .map(clip => resolveClipInterval(clip))
        .sort((left, right) => left.start - right.start)
    let furthestEnd = -Infinity
    for (const interval of ordered) {
        if (interval.start < furthestEnd) return true
        furthestEnd = Math.max(furthestEnd, interval.end)
    }
    return false
}

/**
 * Normalize one track layout by shifting overlapping clips to the right.
 *
 * @param {Array} clips - Clips on one track.
 * @returns {Array} Non-overlapping clips with preserved durations.
 */
export const normalizeClipLayout = clips => {
    const ordered = (Array.isArray(clips) ? clips : [])
        .map((clip, index) => ({clip, index, interval: resolveClipInterval(clip)}))
        .sort((left, right) => left.interval.start - right.interval.start || left.index - right.index)
    let previousEnd = 0
    const normalized = ordered.map(({clip, interval}) => {
        const start = Math.max(interval.start, previousEnd)
        const end = start + interval.duration
        previousEnd = Math.max(previousEnd, end)
        return start === interval.start && end === interval.end
            ? clip
            : {...clip, start, end}
    })
    return normalized.sort((left, right) => resolveClipInterval(left).start - resolveClipInterval(right).start)
}

/**
 * Remove one clip while preserving unaffected row and clip references.
 *
 * @param {Array} rows - Timeline rows.
 * @param {string|number} clipId - Clip identifier.
 * @returns {Array} Rows without the requested clip.
 */
export const removeClipFromRows = (rows, clipId) => rows.map(row => {
    const actions = row.actions ?? []
    if (!actions.some(value => value.id === clipId)) return row
    return {...row, actions: actions.filter(value => value.id !== clipId)}
})

/**
 * Find the maximum clip end in a row collection.
 *
 * @param {Array} rows - Timeline rows.
 * @returns {number} Maximum end in seconds.
 */
export const maximumClipEnd = rows => rows.reduce((maximum, row) => {
    return Math.max(maximum, ...(row.actions ?? []).map(clip => resolveClipInterval(clip).end))
}, 0)
