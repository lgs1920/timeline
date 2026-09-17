/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineGeometryMixin.js
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

import * as timelineUtils from './timelineUtils.js'

/**
 * Add timeline geometry, viewport, and public time methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineGeometryMixin = Base => class extends Base {
    _currentTimeViewportState = (padding = 12) => {
        const surface = this._surface
        const viewportWidth = Number(surface?.clientWidth)
        if (!surface || !Number.isFinite(viewportWidth) || viewportWidth <= 0) return null

        const safePadding = Math.max(0, Number(padding) || 0)
        const playheadX = this._currentTimeContentX()
        const viewportLeft = Number(surface.scrollLeft) || 0
        const viewportRight = viewportLeft + viewportWidth
        const maximumScrollLeft = Math.max(
            0,
            Math.max(Number(surface.scrollWidth) || 0, this._contentWidth) - viewportWidth,
        )
        return {maximumScrollLeft, playheadX, safePadding, surface, viewportLeft, viewportRight, viewportWidth}
    }

    /**
     * Check whether the current playhead is close to the visible viewport edge.
     *
     * @param {number} [padding=12] - Minimum space to keep around the playhead.
     * @returns {boolean} Whether following the playhead may scroll the surface.
     */
    isCurrentTimeNearViewportEdge(padding = 12) {
        const viewport = this._currentTimeViewportState(padding)
        if (!viewport) return false
        return viewport.playheadX < viewport.viewportLeft + viewport.safePadding
            || viewport.playheadX > viewport.viewportRight - viewport.safePadding
    }

    /**
     * Scroll the horizontal surface just enough to keep the current playhead visible.
     *
     * @param {number} [padding=12] - Minimum space to keep around the playhead.
     */
    ensureCurrentTimeVisible(padding = 12) {
        const viewport = this._currentTimeViewportState(padding)
        if (!viewport) return

        let nextScrollLeft = viewport.viewportLeft
        if (viewport.playheadX < viewport.viewportLeft + viewport.safePadding) {
            nextScrollLeft = viewport.playheadX - viewport.safePadding
        } else if (viewport.playheadX > viewport.viewportRight - viewport.safePadding) {
            nextScrollLeft = viewport.playheadX - viewport.viewportWidth + viewport.safePadding
        }
        nextScrollLeft = timelineUtils.clamp(nextScrollLeft, 0, viewport.maximumScrollLeft)
        if (nextScrollLeft === viewport.viewportLeft) return

        viewport.surface.scrollLeft = nextScrollLeft
        this._updateFixedRulerContent(viewport.surface)
        this._updateScrollbars()
    }

    /**
     * Keep the playhead visible when manual scrolling reaches either horizontal edge.
     *
     * @param {HTMLElement|null} view - Horizontal timeline surface.
     */
    _ensureCurrentTimeVisibleAtBoundary = view => {
        if (view !== this._surface || this._dragState?.type === 'playhead') return
        const maximumScrollLeft = Math.max(
            0,
            Math.max(Number(view.scrollWidth) || 0, this._contentWidth) - (Number(view.clientWidth) || 0),
        )
        const scrollLeft = Number(view.scrollLeft) || 0
        const atBoundary = scrollLeft <= 0.5 || scrollLeft >= maximumScrollLeft - 0.5
        if (!atBoundary || !this.isCurrentTimeNearViewportEdge()) return
        this.ensureCurrentTimeVisible()
    }

    /**
     * Place the initial range start handle inside the first visible viewport.
     *
     * @returns {void}
     */
    _positionInitialRangeStart = () => {
        if (this._initialRangeStartPositioned
            || this._timelineConfig.initialRangeStartVisible === false
            || !this._surface) return
        const viewportWidth = Number(this._surface.clientWidth)
        if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return

        const startX = this._timeContentX(this._rangeStartMillis)
        const maximumScrollLeft = Math.max(
            0,
            Math.max(Number(this._surface.scrollWidth) || 0, this._contentWidth) - viewportWidth,
        )
        const nextScrollLeft = timelineUtils.clamp(startX - (viewportWidth * 0.05), 0, maximumScrollLeft)
        this._surface.scrollLeft = nextScrollLeft
        this._initialRangeStartPositioned = true
    }

    /**
     * Follow the playhead during playback while reserving room for the active range boundary.
     *
     * Forward playback holds the playhead at 75% of the viewport while the range end
     * remains outside the viewport. Reverse playback uses the mirrored 25% position
     * while the range start remains outside the viewport. The first visibility checks
     * keep the playhead inside the viewport after a large controlled time jump.
     *
     * @param {number} previousTimeMillis - Time before the playback update.
     */
    _followPlaybackViewport = (previousTimeMillis = this._currentTimeMillis, force = false) => {
        if (!this._surface) return
        if (this._dragState?.type === 'playhead') return
        if (!this._playing && !force) {
            this.ensureCurrentTimeVisible()
            return
        }
        const nextTimeMillis = this._currentTimeMillis
        const direction = Math.sign(nextTimeMillis - previousTimeMillis)

        const viewport = this._currentTimeViewportState()
        if (!viewport) return
        const startX = this._timeContentX(this._rangeStartMillis)
        const endX = this._timeContentX(this._rangeEndMillis)
        const forwardAnchor = viewport.viewportLeft + (viewport.viewportWidth * 0.75)
        const reverseAnchor = viewport.viewportLeft + (viewport.viewportWidth * 0.25)
        const playheadX = viewport.playheadX
        let nextScrollLeft = viewport.viewportLeft

        if (direction > 0 && playheadX >= forwardAnchor
            && endX > viewport.viewportRight - viewport.safePadding) {
            nextScrollLeft = playheadX - (viewport.viewportWidth * 0.75)
        }
        else if (direction < 0 && playheadX <= reverseAnchor
            && startX < viewport.viewportLeft + viewport.safePadding) {
            nextScrollLeft = playheadX - (viewport.viewportWidth * 0.25)
        }
        else if (playheadX < viewport.viewportLeft + viewport.safePadding) {
            nextScrollLeft = playheadX - viewport.safePadding
        }
        else if (playheadX > viewport.viewportRight - viewport.safePadding) {
            nextScrollLeft = playheadX - viewport.viewportWidth + viewport.safePadding
        }

        nextScrollLeft = timelineUtils.clamp(nextScrollLeft, 0, viewport.maximumScrollLeft)
        if (nextScrollLeft === viewport.viewportLeft) return
        viewport.surface.scrollLeft = nextScrollLeft
        this._updateFixedRulerContent(viewport.surface)
        this._updateScrollbars()
    }

    /**
     * Set the visible zoom percentage and rerender the ruler.
     *
     * @param {number} zoomPercent - Requested zoom percentage.
     */
    setZoom(zoomPercent) {
        this._horizontalFitActive = false
        this._zoom = this._clampHorizontalZoom(zoomPercent)
        this._render()
    }

    /**
     * Keep the custom scrollbar rails visible for an external pointer gesture.
     *
     * @param {boolean} active - Whether the external gesture is active.
     */
    setScrollbarsInteractionActive(active) {
        this._scrollbarsInteractionActive = active === true
        if (this._scrollbarsInteractionActive) {
            this._showScrollbars()
            return
        }
        this._scheduleScrollbarHide()
    }

    /**
     * Preserve an external drag or resize when its pointer crosses the host.
     *
     * Starting events remain local to the timeline. Only movement, completion,
     * and cancellation events cross the host while this state is active.
     *
     * @param {boolean} active - Whether an external gesture is active.
     */
    setExternalInteractionActive(active) {
        this._externalInteractionActive = active === true
        this.setScrollbarsInteractionActive(this._externalInteractionActive)
    }

    /**
     * Recompute dimensions after the host container changes size.
     */
    handleResize() {
        this._refreshLayoutMetrics()
    }

    /**
     * Convert an internal row to the public track shape.
     *
     * @param {Object} row - Internal timeline row.
     * @returns {Object} Public track definition.
     */
    _publicTrack = row => {
        const track = Object.assign({}, row)
        const actions = track.actions ?? []
        delete track.actions
        delete track.locked
        delete track.movable
        delete track.fixed
        const clips = actions.map(clip => {
            const publicClip = Object.assign({}, clip)
            delete publicClip.movable
            delete publicClip.fixed
            return publicClip
        })
        return Object.assign({}, track, {clips})
    }

    /**
     * Resolve whether a track can be edited by the current timeline.
     *
     * @param {Object|null} row - Track row.
     * @returns {boolean} Whether track editing is enabled.
     */
    _isTrackEditable = row => !this._isReadonlyMode()
        && this._timelineConfig.interactive !== false
        && this._timelineConfig.editable !== false
        && row?.editable !== false

    /**
     * Resolve the allowed insertion interval between read-only track bounds.
     *
     * Rows are rendered from top to bottom. A single read-only row acts as a
     * boundary on the side where it is placed; two or more read-only rows
     * delimit the editable interval between the highest and lowest bounds.
     *
     * @param {Array} rows - Rows in rendered order.
     * @returns {{minimum: number, maximum: number}|null} Allowed insertion interval.
     */
    _trackInsertionBounds = rows => {
        const lockedIndexes = rows
            .map((row, index) => row.editable === false ? index : null)
            .filter(index => index !== null)
        if (lockedIndexes.length === 0) return {minimum: 0, maximum: rows.length}
        if (lockedIndexes.length === 1) {
            const boundary = lockedIndexes[0]
            return boundary === rows.length - 1
                ? {minimum: 0, maximum: boundary}
                : {minimum: boundary + 1, maximum: rows.length}
        }
        const highestLock = Math.min(...lockedIndexes)
        const lowestLock = Math.max(...lockedIndexes)
        if (lowestLock - highestLock <= 1) return null
        return {minimum: highestLock + 1, maximum: lowestLock}
    }

    /**
     * Resolve whether an insertion index is not directly between two read-only rows.
     *
     * @param {Array} rows - Rows in rendered order.
     * @param {number} index - Candidate insertion index.
     * @returns {boolean} Whether the insertion index is allowed.
     */
    _isTrackInsertionAllowed = (rows, index) => {
        const bounds = this._trackInsertionBounds(rows)
        if (!bounds || index < bounds.minimum || index > bounds.maximum) return false
        return !(rows[index - 1]?.editable === false && rows[index]?.editable === false)
    }

    /**
     * Resolve the highest available insertion position for a new track.
     *
     * @param {Array} rows - Rows in rendered order.
     * @returns {number|null} Insertion index or null when no position exists.
     */
    _trackInsertionIndex = rows => {
        const bounds = this._trackInsertionBounds(rows)
        if (!bounds) return null
        for (let index = bounds.minimum; index <= bounds.maximum; index += 1) {
            if (this._isTrackInsertionAllowed(rows, index)) return index
        }
        return null
    }

    /**
     * Build a public snapshot for controlled track changes.
     *
     * @returns {Object} Current timeline and track state.
     */
    _publicSnapshot = () => ({
        timeline: {
            ...this._timelineConfig,
            durationMillis: this._durationMillis(),
            currentTimeMillis: this._currentTimeMillis,
            playing: this._playing,
            visible: this._visible,
            zoomPercent: this._zoom,
            rangeStartMillis: this._rangeStartMillis,
            rangeEndMillis: this._rangeEndMillis,
        },
        tracks: this._rows.map(row => this._publicTrack(row)),
    })

    /**
     * Cancel an active track-label edit when the pointer is outside its input.
     *
     * @param {PointerEvent} event - Pointer event to inspect.
     */
    _handleTrackLabelOutsidePointerDown = event => {
        if (this._editingRowId === null) return
        const editingRowId = String(this._editingRowId)
        const path = event.composedPath?.() ?? []
        if (path.some(target => String(target?.getAttribute?.('data-edit-row-id') ?? '') === editingRowId)) return
        this._cancelTrackLabelEdit()
    }

    /**
     * Handle label-editor keyboard actions at the timeline shadow boundary.
     *
     * @param {KeyboardEvent} event - Keyboard event from the editor.
     */
    _handleTrackLabelKeyDown = event => {
        if (this._editingRowId === null || !['Enter', 'Escape'].includes(event.key)) return
        const path = event.composedPath?.() ?? []
        const input = path
            .find(target => typeof target?.getAttribute === 'function'
                && target.getAttribute('data-edit-row-id') !== null)
        if (!input || String(input.getAttribute('data-edit-row-id')) !== String(this._editingRowId)) return
        const form = path.find(target => typeof target?.getAttribute === 'function'
            && target.getAttribute('data-track-label-form') !== null)
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Escape') {
            this._cancelTrackLabelEdit()
            return
        }
        this._editingLabelValue = String(input.shadowRoot?.querySelector?.('input')?.value ?? input.value ?? '')
        if (form && typeof form.requestSubmit === 'function') form.requestSubmit()
        else this._commitTrackLabelEdit(event)
    }

    /**
     * Start editing one track label.
     *
     * @param {Object} row - Track row to edit.
     */
    _beginTrackLabelEdit = row => {
        if (!this._isTrackEditable(row)) return
        this._editingRowId = row.id
        this._editingLabelValue = timelineUtils.resolveRowLabel(row)
        this._render()
        window.addEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
        const input = [...this._root.querySelectorAll('[data-edit-row-id]')]
            .find(element => element.getAttribute('data-edit-row-id') === String(row.id))
        const focusEditor = () => {
            if (this._editingRowId !== row.id) return
            const editor = [...this._root.querySelectorAll('[data-edit-row-id]')]
                .find(element => element.getAttribute('data-edit-row-id') === String(row.id)) ?? input
            const nativeInput = editor?.shadowRoot?.querySelector?.('input')
            if (!nativeInput) return false
            nativeInput.focus({preventScroll: true})
            nativeInput.select()
            return true
        }
        const scheduleFocus = () => {
            let attempts = 0
            const tryFocus = () => {
                if (focusEditor() || attempts++ >= 12) return
                if (typeof globalThis.requestAnimationFrame === 'function') {
                    globalThis.requestAnimationFrame(tryFocus)
                    return
                }
                globalThis.setTimeout?.(tryFocus, 0)
            }
            tryFocus()
        }
        scheduleFocus()
        input?.updateComplete?.then(scheduleFocus)
    }

    /**
     * Commit the active track label edit and emit a serializable change event.
     *
     * @param {Event} event - Triggering input event.
     */
    _commitTrackLabelEdit = event => {
        if (this._editingRowId === null) return
        if (this._timelineConfig.editable === false) return this._cancelTrackLabelEdit()
        const row = this._rows.find(value => value.id === this._editingRowId)
        if (!row) return this._cancelTrackLabelEdit()
        const previousLabel = timelineUtils.resolveRowLabel(row)
        const eventValue = event?.currentTarget?.value ?? event?.target?.value
        const draftLabel = typeof eventValue === 'string' ? eventValue : this._editingLabelValue
        const label = String(draftLabel ?? '').trim() || previousLabel
        const rowId = this._editingRowId
        const nextRows = this._rows.map(value => value.id === rowId ? {...value, label} : value)
        const detail = {
            trackId: rowId,
            label,
            previousLabel,
            tracks: nextRows.map(value => this._publicTrack(value)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        const request = this._emitBefore('track-label-change', detail)
        if (request.defaultPrevented) return
        this._rows = nextRows
        this._localRowsDirty = true
        window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
        this._editingRowId = null
        this._editingLabelValue = ''
        this._emit('track-label-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('track-label-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Cancel the active track label edit.
     */
    _cancelTrackLabelEdit = () => {
        window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
        this._editingRowId = null
        this._editingLabelValue = ''
        this._render()
    }

    /**
     * Read a numeric component token with a JavaScript fallback.
     *
     * @param {string} name - Token suffix without the component prefix.
     * @param {number} fallback - Value used when the token is not numeric.
     * @returns {number} Numeric token value.
     */
    _numericToken = (name, fallback) => {
        const value = Number.parseFloat(globalThis.getComputedStyle?.(this)?.getPropertyValue(`--lgs-timeline-${name}`))
        return Number.isFinite(value) ? value : fallback
    }

    /**
     * Resolve the fixed horizontal protection around the scroll viewport.
     *
     * @returns {number} Horizontal viewport margin in pixels.
     */
    _surfaceViewportMargin = () => {
        const styles = globalThis.getComputedStyle?.(this._surface)
        const rawValue = styles?.getPropertyValue('--lgs-timeline-viewport-margin')?.trim() ?? ''
        const value = Number.parseFloat(rawValue)
        if (!Number.isFinite(value)) return 16
        if (rawValue.endsWith('rem')) {
            const rootFontSize = Number.parseFloat(globalThis.getComputedStyle?.(document.documentElement)?.fontSize)
            return Math.max(0, value * (Number.isFinite(rootFontSize) ? rootFontSize : 16))
        }
        if (rawValue.endsWith('em')) {
            const fontSize = Number.parseFloat(styles?.fontSize)
            return Math.max(0, value * (Number.isFinite(fontSize) ? fontSize : 16))
        }
        return Math.max(0, value)
    }

    /**
     * Return the current projection duration in milliseconds.
     *
     * @returns {number} Duration in milliseconds.
     */
    _durationMillis = () => {
        if (Number.isFinite(this._interactionDurationMillis)) return this._interactionDurationMillis
        const duration = this._projection?.durationMillis ?? (Number(this._projection?.durationSeconds) * 1000)
        return Math.max(0, Number(duration) || 0)
    }

    /**
     * Return the current projection duration in seconds.
     *
     * @returns {number} Duration in seconds.
     */
    _durationSeconds = () => this._durationMillis() / 1000

    /**
     * Resolve the lowest zoom that fits the complete timeline in the surface.
     *
     * @returns {number} Container-dependent minimum zoom percentage.
     */
    _minimumHorizontalZoom = () => {
        const durationSeconds = this._durationSeconds()
        const surfaceWidth = this._surface?.clientWidth || this._surfaceWidth
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const endPadding = this._numericToken('end-padding', timelineUtils.END_PADDING)
        const baseScaleWidth = this._numericToken('scale-width', timelineUtils.SCALE_WIDTH)
        const availableWidth = Number(surfaceWidth) - scaleOffset - endPadding
        if (durationSeconds <= 0 || !Number.isFinite(availableWidth) || availableWidth <= 0) return timelineUtils.MIN_ZOOM
        const minimumFactor = availableWidth / (durationSeconds * baseScaleWidth)
        const minimumZoom = Number(((minimumFactor - 1) * 100).toFixed(6))
        return Math.max(timelineUtils.MIN_ZOOM, Math.min(0, minimumZoom))
    }

    /**
     * Clamp a horizontal zoom against the current container-dependent bound.
     *
     * @param {number} zoomPercent - Requested horizontal zoom percentage.
     * @returns {number} Clamped horizontal zoom percentage.
     */
    _clampHorizontalZoom = zoomPercent => timelineUtils.clamp(Number(zoomPercent) || 0, this._minimumHorizontalZoom(), timelineUtils.MAX_ZOOM)

    /**
     * Resolve the current ruler scale while keeping large timelines performant.
     *
     * @returns {{majorSeconds: number, scaleSplitCount: number}} Ruler configuration.
     */
    _resolveScale = () => timelineUtils.resolveScale(this._zoom, this._surface?.clientWidth || this._surfaceWidth)

    /**
     * Resolve the pixel width of one major ruler interval at the current zoom.
     *
     * @returns {number} Pixel width of one major ruler interval.
     */
    _scaleWidth = () => {
        const {majorSeconds} = this._resolveScale()
        const baseScaleWidth = this._numericToken('scale-width', timelineUtils.SCALE_WIDTH)
        const zoomFactor = (100 + this._zoom) / 100
        return baseScaleWidth * zoomFactor * majorSeconds
    }

    /**
     * Cache the scale used by the hot playhead update path.
     *
     * @param {number} majorSeconds - Seconds represented by one major interval.
     * @param {number} scaleWidth - Pixel width of one major interval.
     * @returns {void}
     */
    _cachePlayheadGeometry = (majorSeconds, scaleWidth) => {
        this._playheadGeometry = {
            majorSeconds: Math.max(Number(majorSeconds) || 0, Number.EPSILON),
            scaleOffset: this._numericToken('scale-offset', timelineUtils.START_LEFT),
            scaleWidth: Number.isFinite(Number(scaleWidth)) ? Number(scaleWidth) : 0,
        }
    }

    /**
     * Resolve the current playhead position in the horizontal content.
     *
     * @returns {number} Playhead position in content pixels.
     */
    _timeContentX = timeMillis => {
        if (!this._playheadGeometry) {
            const {majorSeconds} = this._resolveScale()
            this._cachePlayheadGeometry(majorSeconds, this._scaleWidth())
        }
        const {majorSeconds, scaleOffset, scaleWidth} = this._playheadGeometry
        const currentTimeSeconds = Math.max(0, Number(timeMillis) || 0) / 1000
        return scaleOffset + ((currentTimeSeconds / majorSeconds) * scaleWidth)
    }

    _currentTimeContentX = () => this._timeContentX(this._currentTimeMillis)

    /**
     * Resolve the number of major ruler intervals required by the current duration.
     *
     * @param {number} durationSeconds - Duration represented by the timeline.
     * @param {number} majorSeconds - Seconds represented by one major interval.
     * @param {number} scaleWidth - Pixel width of one major interval.
     * @returns {number} Number of major ruler intervals.
     */
    _scaleCountForDuration = (durationSeconds, majorSeconds, scaleWidth) => Math.max(
        1,
        Math.ceil(Math.max(durationSeconds, this._numericToken('min-visible-duration', timelineUtils.MIN_VISIBLE_DURATION_SECONDS)) / majorSeconds),
        Math.ceil(Math.max(0, this._surfaceWidth) / scaleWidth),
    )

    /**
     * Resolve the rendered width required by the current duration.
     *
     * @param {number} durationSeconds - Duration represented by the timeline.
     * @param {number} majorSeconds - Seconds represented by one major interval.
     * @param {number} scaleWidth - Pixel width of one major interval.
     * @returns {number} Required timeline content width in pixels.
     */
    _contentWidthForDuration = (durationSeconds, majorSeconds, scaleWidth) => {
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const endPadding = this._numericToken('end-padding', timelineUtils.END_PADDING)
        const minimumDuration = this._numericToken('min-visible-duration', timelineUtils.MIN_VISIBLE_DURATION_SECONDS)
        return Math.max(
            this._surfaceWidth,
            scaleOffset + ((Math.max(durationSeconds, minimumDuration) / majorSeconds) * scaleWidth) + endPadding,
        )
    }

    /**
     * Keep the track grid on the same geometry as the ruler ticks.
     *
     * @param {HTMLElement|null} element - Rendered timeline surface.
     * @param {number} scaleWidth - Pixels represented by one major ruler unit.
     * @param {number} scaleSplitCount - Number of minor ruler subdivisions.
     * @returns {void}
     */
    _updateTrackGridGeometry = (element, scaleWidth, scaleSplitCount) => {
        if (!element) return
        const majorWidth = Math.max(Number.EPSILON, Number(scaleWidth) || 0)
        const splitCount = Math.max(1, Number(scaleSplitCount) || 1)
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        element.style.setProperty('--lgs-timeline-grid-major-width', `${majorWidth}px`)
        element.style.setProperty('--lgs-timeline-grid-minor-width', `${majorWidth / splitCount}px`)
        element.style.setProperty('--lgs-timeline-grid-offset', `${scaleOffset}px`)
    }

    /**
     * Update duration-dependent geometry without rebuilding stable timeline DOM.
     *
     * The ruler units are added or removed in place while the scroll surfaces
     * and tracks receive their new width immediately. An extending clip
     * therefore remains fully visible during a resize or move preview.
     */
    _refreshDurationGeometry = () => {
        if (!this._projection || !this._surface) return
        const {majorSeconds, scaleSplitCount} = this._resolveScale()
        const durationSeconds = this._durationSeconds()
        const scaleWidth = this._scaleWidth()
        this._cachePlayheadGeometry(majorSeconds, scaleWidth)
        const nextScaleCount = this._scaleCountForDuration(durationSeconds, majorSeconds, scaleWidth)
        this._contentWidth = Math.max(this._clipWorkspaceWidth, this._contentWidthForDuration(durationSeconds, majorSeconds, scaleWidth))
        this._updateTrackGridGeometry(this._root.querySelector('[part="timeline"]'), scaleWidth, scaleSplitCount)
        const widthSelectors = ['[part="canvas"]', '[part="ruler"]', '[part="tracks-viewport"]', '[part="tracks"]']
        widthSelectors.forEach(selector => {
            const element = this._root.querySelector(selector)
            if (element) element.style.width = `${this._contentWidth}px`
        })
        this._renderer.updateRulerDuration(
            this._root.querySelector('[part="ruler"]'),
            nextScaleCount,
            majorSeconds,
            scaleSplitCount,
        )
        this._updateDynamicState()
        this._updateScrollbars()
    }

    /**
     * Normalize a time to the controlled projection duration.
     *
     * @param {number} timeMillis - Requested time in milliseconds.
     * @returns {number} Clamped time in milliseconds.
     */
    _normalizeTime = (timeMillis, constrainToRange = true) => {
        const duration = this._durationMillis()
        const minimum = constrainToRange ? timelineUtils.clamp(this._rangeStartMillis, 0, duration) : 0
        const maximum = timelineUtils.clamp(
            constrainToRange && Number.isFinite(this._rangeEndMillis) ? this._rangeEndMillis : duration,
            minimum,
            duration,
        )
        return timelineUtils.clamp(Number(timeMillis) || 0, minimum, maximum)
    }

    /**
     * Keep the main playhead inside the selected range without moving it when
     * a range boundary changes around its current position.
     */
    _clampCurrentTimeToRange = () => {
        const minimum = this._rangeStartMillis
        const maximum = Math.max(minimum, this._rangeEndMillis)
        if (this._currentTimeMillis < minimum) this._currentTimeMillis = minimum
        if (this._currentTimeMillis > maximum) this._currentTimeMillis = maximum
    }

}
