/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineScrollbars.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-17
 * Last modified: 2026-09-18
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {clamp} from './timelineUtils.js'

/**
 * Create the custom scrollbar controller used by the timeline views.
 *
 * @param {Object} options - Scrollbar state accessors and callbacks.
 * @returns {Object} Scrollbar controller.
 */
export const createTimelineScrollbars = options => {
    const {
        cacheElements,
        capturePointer,
        clearScrollbarHideTimer,
        getNumericToken,
        getWindow,
        releasePointerCapture,
        scheduleScrollbarHide,
        showScrollbars,
    } = options

    let elements = null
    let updateFrame = null
    let updateUsesAnimationFrame = false
    let drag = null
    let dragCleanup = null

    const cache = () => {
        elements = cacheElements()
        return elements
    }

    const updateGeometry = (view, axis, track, thumb) => {
        const scrollSize = axis === 'vertical' ? view.scrollHeight : view.scrollWidth
        const clientSize = axis === 'vertical' ? view.clientHeight : view.clientWidth
        const scrollOffset = axis === 'vertical' ? view.scrollTop : view.scrollLeft
        track.hidden = false
        const trackSize = axis === 'vertical' ? track.clientHeight : track.clientWidth
        const overflowing = scrollSize > clientSize && clientSize > 0 && trackSize > 0
        track.hidden = !overflowing
        thumb.hidden = !overflowing
        if (!overflowing) {
            thumb.style.transform = axis === 'vertical' ? 'translateY(0px)' : 'translateX(0px)'
            thumb.style[axis === 'vertical' ? 'height' : 'width'] = '0px'
            track.setAttribute('aria-valuemax', '0')
            track.setAttribute('aria-valuenow', '0')
            return
        }
        const minimumSize = getNumericToken('scrollbar-thumb-min-size', 30)
        const thumbSize = Math.min(trackSize, Math.max(minimumSize, Math.ceil((clientSize / scrollSize) * trackSize)))
        const maximumOffset = Math.max(0, trackSize - thumbSize)
        const maximumScroll = Math.max(1, scrollSize - clientSize)
        const thumbOffset = clamp((scrollOffset / maximumScroll) * maximumOffset, 0, maximumOffset)
        thumb.style[axis === 'vertical' ? 'height' : 'width'] = `${thumbSize}px`
        thumb.style.transform = axis === 'vertical' ? `translateY(${thumbOffset}px)` : `translateX(${thumbOffset}px)`
        track.setAttribute('aria-valuemax', `${scrollSize - clientSize}`)
        track.setAttribute('aria-valuenow', `${scrollOffset}`)
    }

    const update = () => {
        const shells = elements ?? cache()
        shells.forEach(shell => {
            shell.tracks.forEach(({view, axis, track, thumb}) => {
                if (view && thumb) updateGeometry(view, axis, track, thumb)
            })
        })
    }

    const scheduleUpdate = () => {
        if (updateFrame !== null) return
        const refresh = () => {
            updateFrame = null
            updateUsesAnimationFrame = false
            update()
        }
        if (typeof globalThis.requestAnimationFrame === 'function') {
            updateUsesAnimationFrame = true
            updateFrame = globalThis.requestAnimationFrame(refresh)
        } else {
            updateFrame = globalThis.setTimeout(refresh, 0)
        }
    }

    const cancelUpdate = () => {
        if (updateFrame === null) return
        if (updateUsesAnimationFrame) globalThis.cancelAnimationFrame?.(updateFrame)
        else globalThis.clearTimeout?.(updateFrame)
        updateFrame = null
        updateUsesAnimationFrame = false
    }

    const setOffset = (view, axis, pointerOffset, track) => {
        const scrollSize = axis === 'vertical' ? view.scrollHeight : view.scrollWidth
        const clientSize = axis === 'vertical' ? view.clientHeight : view.clientWidth
        const trackSize = axis === 'vertical' ? track.clientHeight : track.clientWidth
        const minimumSize = getNumericToken('scrollbar-thumb-min-size', 30)
        const thumbSize = Math.min(trackSize, Math.max(minimumSize, Math.ceil((clientSize / Math.max(scrollSize, 1)) * trackSize)))
        const maximumOffset = Math.max(0, trackSize - thumbSize)
        const ratio = maximumOffset > 0 ? clamp(pointerOffset / maximumOffset, 0, 1) : 0
        const value = ratio * Math.max(0, scrollSize - clientSize)
        if (axis === 'vertical') view.scrollTop = value
        else view.scrollLeft = value
    }

    const pointerMove = event => {
        if (!drag) return
        event.preventDefault()
        showScrollbars()
        const {view, axis, track, offset} = drag
        const trackRect = track.getBoundingClientRect()
        const coordinate = axis === 'vertical' ? event.clientY : event.clientX
        const trackStart = axis === 'vertical' ? trackRect.top : trackRect.left
        setOffset(view, axis, coordinate - trackStart - offset, track)
    }

    const pointerUp = () => {
        finishDrag()
        scheduleScrollbarHide()
    }

    const finishDrag = () => {
        dragCleanup?.()
        dragCleanup = null
        drag = null
        releasePointerCapture()
    }

    const startDrag = (event, view, axis, track, thumb) => {
        if (event.button !== 0 || track.hidden) return
        event.preventDefault()
        event.stopPropagation()
        showScrollbars()
        clearScrollbarHideTimer()
        const trackRect = track.getBoundingClientRect()
        const thumbRect = thumb.getBoundingClientRect()
        const coordinate = axis === 'vertical' ? event.clientY : event.clientX
        const trackStart = axis === 'vertical' ? trackRect.top : trackRect.left
        const thumbStart = axis === 'vertical' ? thumbRect.top : thumbRect.left
        const thumbSize = axis === 'vertical' ? thumbRect.height : thumbRect.width
        const offset = event.target === thumb || thumb.contains(event.target)
            ? coordinate - thumbStart
            : thumbSize / 2
        if (!(event.target === thumb || thumb.contains(event.target))) {
            setOffset(view, axis, coordinate - trackStart - offset, track)
        }
        finishDrag()
        capturePointer(event)
        drag = {view, axis, track, thumb, offset}
        dragCleanup = () => {
            getWindow()?.removeEventListener('pointermove', pointerMove, true)
            getWindow()?.removeEventListener('pointerup', pointerUp, true)
            getWindow()?.removeEventListener('pointercancel', pointerUp, true)
        }
        getWindow()?.addEventListener('pointermove', pointerMove, {passive: false, capture: true})
        getWindow()?.addEventListener('pointerup', pointerUp, true)
        getWindow()?.addEventListener('pointercancel', pointerUp, true)
    }

    const handleKeyDown = (event, view, axis) => {
        const positive = axis === 'vertical' ? ['ArrowDown', 'PageDown'] : ['ArrowRight', 'PageDown']
        const negative = axis === 'vertical' ? ['ArrowUp', 'PageUp'] : ['ArrowLeft', 'PageUp']
        if (![...positive, ...negative].includes(event.key)) return
        event.preventDefault()
        const page = axis === 'vertical' ? view.clientHeight : view.clientWidth
        const delta = positive.includes(event.key) ? page : -page
        if (axis === 'vertical') view.scrollTop += delta
        else view.scrollLeft += delta
    }

    return {
        cache,
        cancelUpdate,
        finishDrag,
        handleKeyDown,
        invalidate: () => {
            elements = null
        },
        startDrag,
        update,
        scheduleUpdate,
    }
}
