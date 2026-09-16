/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920TimelineDomCache.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-15
 * Last modified: 2026-09-16
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

/**
 * Create DOM indexes for the timeline's dynamic and interactive elements.
 *
 * The cache owns DOM queries and invalidation. Rendering behavior remains in
 * the custom element, which keeps the public component API unchanged.
 *
 * @param {ShadowRoot} root - Timeline shadow root.
 * @returns {Object} DOM cache operations.
 */
export const createTimelineDomCache = root => {
    let dynamicElements = null
    let clipPresentationElements = null
    let scrollbarElements = null

    const cacheDynamicElements = () => {
        dynamicElements = {
            current: root.querySelector('[data-current-time]'),
            total: root.querySelector('[data-total-time]'),
            timeSlider: root.querySelector('[data-timeline-time-slider]'),
            zoomSlider: root.querySelector('[data-timeline-zoom-slider]'),
            playhead: root.querySelector('[data-playhead]'),
            end: root.querySelector('[data-end-marker]'),
            rangeSelection: root.querySelector('[data-range-selection]'),
            rangeStart: root.querySelector('[data-range-handle="start"]'),
            rangeEnd: root.querySelector('[data-range-handle="end"]'),
            startButton: root.querySelector('[data-testid="lgs1920-wa-timeline-restart"]'),
            previousButton: root.querySelector('[data-testid="lgs1920-wa-timeline-previous-frame"]'),
            nextButton: root.querySelector('[data-testid="lgs1920-wa-timeline-next-frame"]'),
            endButton: root.querySelector('[data-testid="lgs1920-wa-timeline-end"]'),
            playbackButton: root.querySelector('[data-testid="lgs1920-wa-timeline-play"]'),
            loopButton: root.querySelector('[data-testid="lgs1920-wa-timeline-loop"]'),
        }
        return dynamicElements
    }

    const cacheClipPresentationElements = () => {
        const clips = new Map([...root.querySelectorAll('[data-clip-id]')]
            .map(element => [String(element.getAttribute('data-clip-id')), element]))
        const tracks = new Map([...root.querySelectorAll('[part="track"]')]
            .map(element => [String(element.dataset.rowId), element]))
        const legends = new Map([...root.querySelectorAll('[part="legend-row"]')]
            .map(element => [String(element.dataset.rowId), element]))
        const trackBackgrounds = new Map([...tracks].map(([rowId, track]) => [
            rowId,
            track.querySelector('[part="track-background"]'),
        ]))
        const durationOverlays = new Map([...clips].map(([clipId, clip]) => [
            clipId,
            clip.querySelector('[data-clip-duration-overlay]'),
        ]))
        clipPresentationElements = {
            clipEdgeIndicator: root.querySelector('[data-clip-edge-indicator]'),
            clipMoveEndpoints: [...root.querySelectorAll('[data-clip-move-endpoint]')],
            clips,
            tracks,
            legends,
            trackBackgrounds,
            durationOverlays,
            overlay: root.querySelector('[data-overlay]'),
            dragElements: new Set(),
        }
        return clipPresentationElements
    }

    const resolveClipPresentationElements = rows => {
        const presentation = clipPresentationElements ?? cacheClipPresentationElements()
        const isAttached = element => element && root.contains(element)
        const indexIsComplete = rows.every(row => (
            isAttached(presentation.tracks.get(String(row.id)))
            && isAttached(presentation.legends.get(String(row.id)))
            && (row.actions ?? []).every(clip => isAttached(presentation.clips.get(String(clip.id))))
        ))
        return indexIsComplete ? presentation : cacheClipPresentationElements()
    }

    const cacheScrollbarElements = () => {
        scrollbarElements = [...root.querySelectorAll('[data-scrollbar-shell]')].map(shell => ({
            shell,
            tracks: [...shell.querySelectorAll('[data-scrollbar-track]')].map(track => {
                const axis = track.getAttribute('data-scrollbar-track')
                const viewRole = track.getAttribute('data-scrollbar-view')
                return {
                    axis,
                    track,
                    thumb: track.querySelector('[data-scrollbar-thumb]'),
                    view: shell.querySelector(`[data-scroll-view="${viewRole}"]`),
                }
            }),
        }))
        return scrollbarElements
    }

    const invalidate = () => {
        dynamicElements = null
        clipPresentationElements = null
        scrollbarElements = null
    }

    return {
        cacheDynamicElements,
        getDynamicElements: () => dynamicElements,
        cacheClipPresentationElements,
        resolveClipPresentationElements,
        getClipPresentationElements: () => clipPresentationElements,
        cacheScrollbarElements,
        getScrollbarElements: () => scrollbarElements,
        invalidate,
    }
}
