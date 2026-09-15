/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920TimelineState.js
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
 * Create memoized signatures used to compare controlled timeline state.
 *
 * Keeping these comparisons outside the custom element makes the state
 * comparison policy explicit and keeps the component focused on DOM work.
 *
 * @returns {{rowSignature: Function, placementSignature: Function, rowPresentationSignature: Function}}
 */
export const createTimelineStateSignatures = () => {
    const rowSignatureCache = new WeakMap()
    const placementSignatureCache = new WeakMap()
    const rowPresentationSignatureCache = new WeakMap()

    const rowSignature = rows => {
        if (!Array.isArray(rows)) return '[]'
        const cached = rowSignatureCache.get(rows)
        if (cached !== undefined) return cached
        const signature = JSON.stringify(rows.map(row => {
            const {actions, clips, ...stable} = row ?? {}
            return {...stable, clips: actions ?? clips ?? []}
        }))
        rowSignatureCache.set(rows, signature)
        return signature
    }

    const placementSignature = rows => {
        if (!Array.isArray(rows)) return '[]'
        const cached = placementSignatureCache.get(rows)
        if (cached !== undefined) return cached
        const signature = JSON.stringify(rows.map(row => ({
            id: row?.id,
            clips: (row?.actions ?? row?.clips ?? []).map(clip => [clip.id, clip.start, clip.end]),
        })))
        placementSignatureCache.set(rows, signature)
        return signature
    }

    const rowPresentationSignature = rows => {
        if (!Array.isArray(rows)) return '[]'
        const cached = rowPresentationSignatureCache.get(rows)
        if (cached !== undefined) return cached
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
        const signature = JSON.stringify(rows.map(row => {
            const {actions, clips, ...stable} = row ?? {}
            return {
                stable,
                actions: (actions ?? clips ?? []).map(action => shape(action)),
            }
        }))
        rowPresentationSignatureCache.set(rows, signature)
        return signature
    }

    return {rowSignature, placementSignature, rowPresentationSignature}
}
