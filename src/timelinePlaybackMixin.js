/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelinePlaybackMixin.js
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

import * as timelineInteraction from './timelineInteraction.js'
import * as timelineUtils from './timelineUtils.js'

/**
 * Add keyboard, wheel, playback, and zoom interactions to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelinePlaybackMixin = Base => class extends Base {
    _handleWheel = event => {
        if (this._isReadonlyMode()) return
        if (event.ctrlKey || !event.deltaY) return
        if (!event.metaKey && !event.shiftKey && !event.altKey) return
        event.preventDefault()
        const direction = event.deltaY < 0 ? 1 : -1
        if (event.metaKey) {
            this._zoomHorizontal(direction, event.clientX)
            return
        }
        this._stepVerticalZoom(direction)
    }

    /**
     * Toggle local playback from the canonical Space shortcut.
     *
     * @param {KeyboardEvent} event - Triggering keyboard event.
     * @returns {boolean} Whether the shortcut was handled.
     */
    _togglePlayback = event => {
        if (this._timelineConfig.interactive === false) return false
        event.preventDefault()
        event.stopPropagation()
        const playing = !this._playing
        const action = playing ? 'play' : 'pause'
        const timeMillis = playing ? this._rangeStartMillis : this._currentTimeMillis
        const detail = {
            source: playing ? 'timeline-keyboard-play' : 'timeline-keyboard-pause',
            timeMillis,
            event,
        }
        if (!this._emitAction(action, detail)) return true
        if (playing) this.setTime(timeMillis)
        this.playing = playing
        return true
    }

    /**
     * Move the local playhead to one of the selected range boundaries.
     *
     * @param {'start'|'end'} boundary - Boundary to select.
     * @param {KeyboardEvent} event - Triggering keyboard event.
     * @returns {boolean} Whether the shortcut was handled.
     */
    _seekToBoundary = (boundary, event) => {
        if (this._timelineConfig.interactive === false) return false
        event.preventDefault()
        event.stopPropagation()
        const timeMillis = boundary === 'start' ? this._rangeStartMillis : this._rangeEndMillis
        const detail = this._positionDetail({
            source: boundary === 'start' ? 'timeline-keyboard-home' : 'timeline-keyboard-end',
            timeMillis,
            event,
        })
        if (this._emitBefore('seek', detail).defaultPrevented) return true
        this._currentTimeMillis = detail.timeMillis
        this._emit('seek', detail)
        this._updateDynamicState()
        this._emitAfter('seek', detail)
        return true
    }

    /**
     * Handle keyboard zoom gestures from the timeline surface or window.
     *
     * @param {KeyboardEvent} event - Keyboard event.
     * @param {boolean} fromSurface - Whether the event came from the focused surface.
     */
    _handleKeyDown = (event, fromSurface = false) => {
        if (event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) return
        if (fromSurface && event.target !== event.currentTarget) return
        if (this._selectedClipKey !== null
            && !event.ctrlKey && !event.metaKey && !event.shiftKey
            && timelineInteraction.TIMELINE_HORIZONTAL_ARROW_KEYS.includes(event.key)) {
            this._clipEditor.moveByKeyboard(this.selectedClipId, event)
            return
        }
        if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            if (event.key === ' ' || event.key === 'Spacebar') {
                this._togglePlayback(event)
                return
            }
            if (event.key === 'Home' || event.key === 'End') {
                this._seekToBoundary(event.key === 'Home' ? 'start' : 'end', event)
                return
            }
        }
        if (!timelineInteraction.TIMELINE_ARROW_KEYS.includes(event.key)) return
        if (this._handleShiftNavigation(event)) return
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            this._stepVerticalZoom(event.key === 'ArrowUp' ? 1 : -1)
            return
        }
        this._zoomHorizontal(event.key === 'ArrowRight' ? 1 : -1)
    }

    /**
     * Handle arrow-key zoom when the selected timeline host owns the focus
     * outside its internal surface.
     *
     * @param {KeyboardEvent} event - Keyboard event.
     */
    _handleWindowKeyDown = event => {
        if (this._isReadonlyMode()) return
        if (event.key === 'Escape' && this._cutMode) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._cancelCutMode()
            return
        }
        if ((event.ctrlKey || event.metaKey)
            && !event.altKey
            && !event.shiftKey
            && String(event.key).toLowerCase() === 'k'
            && !event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._cutAtCurrentTime(event)
            return
        }
        if ((event.ctrlKey || event.metaKey)
            && !event.altKey
            && (String(event.key).toLowerCase() === 'y'
                || (String(event.key).toLowerCase() === 'z' && event.shiftKey))) {
            if (!event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) {
                event.preventDefault()
                event.stopImmediatePropagation()
                this._redo(event)
                return
            }
        }
        if ((event.ctrlKey || event.metaKey)
            && !event.altKey
            && !event.shiftKey
            && String(event.key).toLowerCase() === 'z'
            && !event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._undo(event)
            return
        }
        if (event.key === 'Escape' && this._clipCopyState) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._cancelClipCopy()
            return
        }
        if (event.key === 'Escape' && this._dragState) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._pointerUp({type: 'pointercancel', pointerId: this._dragState.pointerId})
            return
        }
        if (event.key === 'Escape' && this._menus.getClipContextMenuClipId() !== null) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._closeClipContextMenu()
            return
        }
        if (event.key === 'Escape' && this._menus.getTrackContextMenuTrackId() !== null) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._closeTrackContextMenu()
            return
        }
        if (event.key === 'Escape'
            && this._selectedClipKey !== null
            && !event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            this._clearClipSelection(event)
            return
        }
        if (event.composedPath?.().includes(this) && event.target !== this) return
        if (event.target?.closest?.(timelineInteraction.TIMELINE_KEYBOARD_EDITABLE_SELECTOR)) return
        if (this._selectedClipKey !== null
            && !event.ctrlKey && !event.metaKey && !event.shiftKey
            && timelineInteraction.TIMELINE_HORIZONTAL_ARROW_KEYS.includes(event.key)) {
            this._clipEditor.moveByKeyboard(this.selectedClipId, event)
            return
        }
        if (this._timelineConfig.keyboardZoomActive !== true) return
        if (this._handleShiftNavigation(event)) return
        this._handleKeyDown(event)
    }

    /**
     * Apply Shift-based navigation shortcuts while the timeline owns focus.
     *
     * @param {KeyboardEvent} event - Keyboard event.
     * @returns {boolean} Whether the event was handled.
     */
    _handleShiftNavigation = event => {
        if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false
        if (!timelineInteraction.TIMELINE_ARROW_KEYS.includes(event.key)) return false
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const timeMillis = event.key === 'ArrowLeft' ? this._rangeStartMillis : this._rangeEndMillis
            const detail = {
                timeMillis,
                progress: this._durationMillis() > 0 ? timeMillis / this._durationMillis() : 0,
                settled: true,
                event,
            }
            if (this._emitBefore('seek', detail).defaultPrevented) return true
            this._currentTimeMillis = timeMillis
            this._emit('seek', detail)
            this._updateDynamicState()
            this._emitAfter('seek', detail)
            return true
        }
        if (this._tracksViewport) {
            this._tracksViewport.scrollTop = event.key === 'ArrowUp'
                ? 0
                : Math.max(0, this._tracksViewport.scrollHeight - this._tracksViewport.clientHeight)
            this._updateLegendScroll()
        }
        return true
    }

    /**
     * Move the vertical zoom by one configured increment.
     *
     * @param {number} direction - Positive to enlarge rows, negative to reduce them.
     */
    _stepVerticalZoom = direction => {
        const minimumRowHeight = this._numericToken('row-height', timelineUtils.MIN_ROW_HEIGHT)
        const currentRowHeight = Number.isFinite(this._verticalZoomRowHeight)
            ? this._verticalZoomRowHeight
            : this._rowHeight
        this._verticalZoomRowHeight = timelineUtils.clamp(currentRowHeight + (direction * timelineUtils.ROW_ZOOM_STEP), minimumRowHeight, timelineUtils.MAX_ROW_HEIGHT)
        this._render()
    }

    /**
     * Change the horizontal zoom while preserving the time under an anchor.
     *
     * @param {number} direction - Positive to zoom in, negative to zoom out.
     * @param {number} [clientX] - Optional pointer anchor in viewport coordinates.
     */
    _zoomHorizontal = (direction, clientX = null) => {
        const surface = this._surface
        const rect = surface?.getBoundingClientRect?.()
        const hasPointerAnchor = rect && Number.isFinite(Number(clientX))
        const viewportX = hasPointerAnchor
            ? Number(clientX) - rect.left
            : (surface?.clientWidth ?? 0) / 2
        const anchorTimeSeconds = rect
            ? this._timeAtClientX(rect.left + viewportX)
            : null

        this._horizontalFitActive = false
        this._zoom = this._clampHorizontalZoom(this._zoom + (direction * timelineUtils.ZOOM_STEP))
        this._render()

        if (anchorTimeSeconds === null || !this._surface) return
        const {majorSeconds} = this._resolveScale()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const anchorX = scaleOffset + ((anchorTimeSeconds / majorSeconds) * this._scaleWidth())
        const maximumScrollLeft = Math.max(
            0,
            Math.max(this._surface.scrollWidth, this._contentWidth) - (this._surface.clientWidth || 0),
        )
        this._surface.scrollLeft = timelineUtils.clamp(anchorX - viewportX, 0, maximumScrollLeft)
        this._updateFixedRulerContent(this._surface)
        this._updateScrollbars()
    }

    /**
     * Update playback labels and controlled cursor geometry.
     */
}
