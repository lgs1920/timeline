/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineSurfaceMixin.js
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

import * as timelineUtils from './timelineUtils.js'
import {cloneRows, resolveClipInterval} from './timelineEditing.js'

/**
 * Add surface, scrollbar shell, split-panel, and pointer-capture methods.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineSurfaceMixin = Base => class extends Base {
    _timeAtClientX = clientX => {
        const rect = this._surface?.getBoundingClientRect()
        if (!rect) return 0
        const {majorSeconds} = this._resolveScale()
        const scaleWidth = this._scaleWidth()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const x = Math.max(scaleOffset, clientX - rect.left + (this._surface?.scrollLeft ?? 0))
        return ((x - scaleOffset) / Math.max(Number.EPSILON, scaleWidth)) * majorSeconds
    }

    /**
     * Resolve the track below a surface client coordinate.
     *
     * @param {number} clientY - Pointer client coordinate.
     * @returns {Object|null} Track under the pointer.
     */
    _trackAtClientY = clientY => {
        const rect = this._surface?.getBoundingClientRect()
        if (!rect) return null
        const headerHeight = this._numericToken('header-height', timelineUtils.HEADER_HEIGHT)
        const relativeY = clientY - rect.top + (this._tracksViewport?.scrollTop ?? 0) - headerHeight
        if (relativeY < 0) return null
        const index = Math.floor(relativeY / Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight))
        return this._rows[index] ?? null
    }

    /**
     * Start a pointer interaction for moving or resizing a clip.
     *
     * @param {PointerEvent} event - Pointer event.
     * @param {string} clipId - Clip identifier.
     * @param {'move'|'resize'} mode - Interaction mode.
     * @param {'start'|'end'|null} edge - Resized edge.
     * @param {boolean} wasSelected - Whether the clip was selected before the pointer down.
     */
    _startClipInteraction = (event, clipId, mode, edge = null, wasSelected = false) => {
        if (event.button !== 0) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        const readOnlyResize = mode === 'resize' && entry?.row.clipResizable === true
        if (!entry || (!this._isTrackEditable(entry.row) && !readOnlyResize) || entry.clip.editable === false
            || entry.clip.selectable === false || (mode === 'resize' && entry.clip.resizable === false)) return
        const interval = resolveClipInterval(entry.clip)
        const resizeBaseline = mode === 'resize'
            ? this._clipEditor.getResizeBaseline({
                rows: this._rows,
                trackId: entry.row.id,
                clipId,
                edge,
            })
            : null
        const startTime = this._timeAtClientX(event.clientX)
        const initialDurationMillis = this._durationMillis()
        this._dragState = {
            type: 'clip',
            pending: mode === 'move',
            mode,
            edge,
            clipId,
            sourceTrackId: entry.row.id,
            targetTrackId: entry.row.id,
            startX: event.clientX,
            startY: event.clientY,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            sourceElement: event.currentTarget instanceof Element ? event.currentTarget : event.target,
            startTime,
            targetTime: startTime,
            originalStart: interval.start,
            originalEnd: interval.end,
            resizeOriginalClip: resizeBaseline?.clip ?? Object.assign({}, entry.clip),
            resizeMinimumStart: resizeBaseline?.start,
            resizeMaximumEnd: resizeBaseline?.end,
            initialDurationMillis,
            initialRangeEndMillis: this._rangeEndMillis,
            wasSelected: wasSelected === true,
            baseRows: cloneRows(this._rows),
            lastResult: null,
            snapTargetKind: null,
            lastUnsnappedInterval: {
                start: interval.start,
                end: interval.end,
            },
            dragStart: {
                clientX: Number(event.clientX) || 0,
                clientY: Number(event.clientY) || 0,
                time: startTime,
                timeMillis: startTime * 1000,
                trackId: entry.row.id,
            },
        }
        if (mode === 'move') {
            this._addPointerListeners()
            return
        }
        this._activateClipInteraction(event)
        if (this._dragState?.type !== 'clip' || this._dragState.pending === true) return
        this._addPointerListeners()
    }

    /**
     * Activate a pending clip gesture after the pointer moves far enough.
     *
     * @param {PointerEvent} event - Pointer movement that activates the drag.
     */
    _activateClipInteraction = event => {
        const state = this._dragState
        if (state?.type !== 'clip' || state.activated === true) return
        state.pending = false
        state.activated = true
        event.preventDefault()
        event.stopPropagation()
        this._capturePointer({
            currentTarget: state.sourceElement,
            target: state.sourceElement,
            pointerId: state.pointerId,
        })
        const changeDetail = this._clipEditor.changeDetail(this._dragState, {
            rows: this._dragState.baseRows,
            durationMillis: state.initialDurationMillis,
        }, event)
        const dragDetail = this._withLazySnapshot({
            context: this._dragContext(this._dragState),
            ...changeDetail,
            event,
        })
        const beforeClipChange = this._emitBefore('clip-change', changeDetail)
        if (beforeClipChange.defaultPrevented) {
            this._dragState = null
            this._interactionDurationMillis = state.initialDurationMillis
            this._releasePointerCapture()
            return
        }
        const beforeDrag = this._emitBefore('drag', dragDetail)
        if (beforeDrag.defaultPrevented) {
            this._dragState = null
            this._interactionDurationMillis = state.initialDurationMillis
            this._releasePointerCapture()
            return
        }
        this._emit('clip-change-start', changeDetail)
        this._handleEdgeAutoScroll(event)
        this._updateClipInteractionPresentation()
    }
    /**
     * Toggle a track visibility state and emit its controlled change event.
     *
     * @param {Object} row - Track row.
     * @param {Event} event - Triggering event.
     */
    _toggleTrackVisibility = (row, event) => {
        if (!this._isTrackEditable(row) || !row?.canHide) return
        event?.stopPropagation?.()
        const visible = row.visible === false
        const nextRows = this._rows.map(value => value.id === row.id ? {...value, visible} : value)
        const detail = {
            trackId: row.id,
            visible,
            track: this._publicTrack(Object.assign({}, row, {visible})),
            tracks: nextRows.map(value => this._publicTrack(value)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('track-visibility-change', detail).defaultPrevented) return
        if (this._editingRowId === row.id) {
            window.removeEventListener('pointerdown', this._handleTrackLabelOutsidePointerDown, true)
            this._editingRowId = null
            this._editingLabelValue = ''
        }
        this._rows = nextRows
        this._localRowsDirty = true
        this._emit('track-visibility-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('track-visibility-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }


    _legendRow = row => {
        return this._renderer.legendRow(row)
    }

    _surfaceElement = (scaleCount, majorSeconds, scaleSplitCount) => {
        const {surface} = this._renderer.surfaceElement(scaleCount, majorSeconds, scaleSplitCount)
        const tracksViewport = surface.querySelector('[data-tracks-viewport]')
        return this._scrollbarShell(surface, {role: 'surface', horizontal: true, vertical: true, verticalView: tracksViewport ?? surface})
    }

    /**
     * Wrap a timeline view with LGS-style custom scrollbars.
     *
     * Native scrollbars are kept functionally active on the view, while the
     * visual rails and thumbs are rendered in the component shadow tree.
     *
     * @param {HTMLElement} view - Scrollable timeline view.
     * @param {Object} options - Scrollbar axes and synchronization role.
     * @param {string} options.role - View role used for vertical syncing.
     * @param {boolean} options.horizontal - Whether to render a horizontal rail.
     * @param {boolean} options.vertical - Whether to render a vertical rail.
     * @returns {HTMLElement} Scrollbar shell containing the view.
     */
    _scrollbarShell = (view, {role, horizontal, vertical, verticalView = view}) => {
        view.classList.add('view')
        view.setAttribute('data-scroll-view', role)
        const shell = timelineUtils.createElement('div', `lgs-scrollbars lgs1920-wa-timeline__scroll-shell lgs1920-wa-timeline__scroll-shell--${role}${this._hostNoDragClasses()}`, {
            'data-scrollbar-shell': role,
        })
        shell.append(view)
        if (role === 'surface') {
            const edgeGutters = timelineUtils.createElement('div', 'lgs1920-wa-timeline__surface-edge-gutters', {
                part: 'surface-edge-gutters',
                'aria-hidden': 'true',
            })
            edgeGutters.append(
                timelineUtils.createElement('div', 'lgs1920-wa-timeline__surface-edge-gutter lgs1920-wa-timeline__surface-edge-gutter--start', {
                    part: 'surface-edge-gutter-start',
                }),
                timelineUtils.createElement('div', 'lgs1920-wa-timeline__surface-edge-gutter lgs1920-wa-timeline__surface-edge-gutter--end', {
                    part: 'surface-edge-gutter-end',
                }),
            )
            shell.append(edgeGutters)
        }
        if (horizontal) shell.append(this._scrollbarTrack(view, 'horizontal'))
        if (vertical) shell.append(this._scrollbarTrack(verticalView, 'vertical'))
        shell.addEventListener('pointerenter', this._showScrollbars)
        shell.addEventListener('pointerleave', this._scheduleScrollbarHide)
        shell.addEventListener('focusin', this._showScrollbars)
        shell.addEventListener('focusout', this._scheduleScrollbarHide)
        return shell
    }

    /**
     * Create one custom scrollbar rail and its draggable thumb.
     *
     * @param {HTMLElement} view - Scrollable timeline view.
     * @param {'horizontal'|'vertical'} axis - Scrollbar axis.
     * @returns {HTMLElement} Scrollbar rail.
     */
    _scrollbarTrack = (view, axis) => {
        const track = timelineUtils.createElement('div', `track-${axis} lgs1920-wa-timeline__scrollbar-track lgs1920-wa-timeline__scrollbar-track--${axis}`, {
            'data-scrollbar-track': axis,
            'data-scrollbar-view': view.getAttribute('data-scroll-view'),
            role: 'scrollbar',
            'aria-orientation': axis,
            'aria-valuemin': 0,
            'aria-valuemax': 0,
            'aria-valuenow': 0,
            tabindex: 0,
        })
        const thumb = timelineUtils.createElement('div', `thumb-${axis} lgs1920-wa-timeline__scrollbar-thumb lgs1920-wa-timeline__scrollbar-thumb--${axis}`, {
            'data-scrollbar-thumb': axis,
        })
        track.append(thumb)
        view.addEventListener('scroll', () => {
            this._showScrollbars()
            this._scheduleScrollbarHide()
            const viewRole = view.getAttribute('data-scroll-view')
            if (viewRole === 'surface') {
                this._updateFixedRulerContent(view)
                this._ensureCurrentTimeVisibleAtBoundary(view)
            }
            if (viewRole === 'tracks' || viewRole === 'legend') {
                const scrollTop = Math.max(0, Number(view.scrollTop) || 0)
                this._lastVerticalScrollTop = scrollTop
                this._emit('vertical-scroll', {
                    scrollTop,
                    view: viewRole,
                })
            }
            if (viewRole === 'legend') this._syncTracksScroll()
            if (viewRole === 'tracks') this._updateLegendScroll()
            else this._scheduleScrollbarsUpdate()
        })
        track.addEventListener('pointerdown', event => this._startScrollbarDrag(event, view, axis, track, thumb))
        track.addEventListener('keydown', event => this._handleScrollbarKeyDown(event, view, axis))
        return track
    }

    /**
     * Keep marked ruler slot content aligned with the visible surface edge.
     *
     * @param {HTMLElement|null} view - Horizontal timeline surface.
     */
    _updateFixedRulerContent = view => {
        if (!view || view.getAttribute('data-scroll-view') !== 'surface') return
        const offset = `${Number(view.scrollLeft) || 0}px`
        const elements = [
            ...this.querySelectorAll('[slot="timeline-ruler"][data-timeline-ruler-fixed]'),
            this._root.querySelector('[data-timeline-ruler-fixed]'),
        ].filter(Boolean)
        elements.forEach(element => {
            element.style.setProperty('--lgs-timeline-ruler-scroll-offset', offset)
        })
    }

    _cacheScrollbarElements = () => this._scrollbars.cache()
    _updateScrollbars = () => this._scrollbars.update()
    _scheduleScrollbarsUpdate = () => this._scrollbars.scheduleUpdate()
    _cancelScrollbarsUpdate = () => this._scrollbars.cancelUpdate()
    _startScrollbarDrag = (event, view, axis, track, thumb) => this._scrollbars.startDrag(event, view, axis, track, thumb)

    /**
     * Keep subsequent pointer events attached to the active gesture target.
     *
     * @param {PointerEvent} event - Pointer event that starts the gesture.
     */
    _capturePointer = event => {
        const target = event.currentTarget instanceof Element ? event.currentTarget : event.target
        if (!target?.setPointerCapture || !Number.isFinite(event.pointerId)) return
        target.setPointerCapture(event.pointerId)
        this._pointerCaptureTarget = target
        this._pointerCaptureId = event.pointerId
    }

    /**
     * Release the pointer captured by the active gesture, when supported.
     */
    _releasePointerCapture = () => {
        const target = this._pointerCaptureTarget
        const pointerId = this._pointerCaptureId
        this._pointerCaptureTarget = null
        this._pointerCaptureId = null
        if (!target?.releasePointerCapture || !Number.isFinite(pointerId)) return
        target.releasePointerCapture(pointerId)
    }

    _handleScrollbarKeyDown = (event, view, axis) => this._scrollbars.handleKeyDown(event, view, axis)
    _finishScrollbarDrag = () => this._scrollbars.finishDrag()

    /**
     * Remember a title-panel width chosen through the native split panel.
     *
     * Reposition events emitted while the construction overlay is active can
     * reflect Web Awesome's temporary minimum width before layout has settled.
     * Only a real pointer gesture may update the preferred width at that time.
     *
     * @param {Event} event - Native Web Awesome reposition event.
     */
    _handleSplitPanelReposition = event => {
        if (this._building && !this._nativeSplitPanelInteractionActive) return
        const width = Number(event.currentTarget?.positionInPixels)
        if (!Number.isFinite(width) || width <= 0) return
        const {minimum, maximum} = timelineUtils.resolveLegendBounds(this._timelineConfig)
        this._legendWidth = timelineUtils.clamp(width, minimum, maximum)
    }

    /**
     * Allow the native split-panel document listeners to receive a divider gesture.
     *
     * @param {MouseEvent|TouchEvent} event - Native divider press event.
     */
    _startNativeSplitPanelInteraction = event => {
        if (event.type !== 'touchstart' && event.button !== 0) return
        if (!this._isSplitPanelDividerEvent(event)) return
        this._finishNativeSplitPanelInteraction()
        this._nativeSplitPanelInteractionActive = true
        this._nativeSplitPanelElement = event.currentTarget
        this._nativeSplitPanelElement?.setAttribute('data-divider-active', '')
        window.addEventListener('pointerup', this._finishNativeSplitPanelInteraction)
        window.addEventListener('pointercancel', this._finishNativeSplitPanelInteraction)
    }

    /**
     * Close the event pass-through used by the native split-panel gesture.
     */
    _finishNativeSplitPanelInteraction = () => {
        this._nativeSplitPanelInteractionActive = false
        this._nativeSplitPanelElement?.removeAttribute('data-divider-active')
        this._nativeSplitPanelElement = null
        window.removeEventListener('pointerup', this._finishNativeSplitPanelInteraction)
        window.removeEventListener('pointercancel', this._finishNativeSplitPanelInteraction)
    }

    /**
     * Reuse the native split panel while replacing the timeline contents.
     *
     * @param {HTMLElement} structure - Next timeline structure.
     */
    _reuseSplitPanel = structure => {
        const currentStructure = this._root.querySelector('[data-testid="lgs1920-wa-timeline"]')
        const nextStructure = structure
        const currentSplitPanel = this._root.querySelector('[part="split-panel"]')
        const nextSplitPanel = nextStructure.querySelector('[part="split-panel"]')
        const currentLayout = currentStructure?.querySelector('[data-layout]')
        const nextLayout = nextStructure.querySelector('[data-layout]')
        if (!currentStructure || !currentSplitPanel || !nextSplitPanel || !currentLayout || !nextLayout) {
            return false
        }
        ['--min', '--max', '--divider-width', '--divider-hit-area'].forEach(property => {
            currentSplitPanel.style.setProperty(property, nextSplitPanel.style.getPropertyValue(property))
        })
        // Keep Web Awesome slider instances alive while the timeline is being
        // refreshed. Their internal DraggableElement listens on the shadow DOM
        // slider and must survive every zoom update in a pointer gesture.
        for (const selector of ['[data-timeline-time-slider]', '[data-timeline-zoom-slider]']) {
            const currentSlider = currentStructure.querySelector(selector)
            const nextSlider = nextStructure.querySelector(selector)
            if (!currentSlider || !nextSlider) continue
            const currentTooltip = currentSlider.parentElement?.querySelector(`wa-tooltip[for="${currentSlider.id}"]`)
            const nextTooltip = nextSlider.parentElement?.querySelector(`wa-tooltip[for="${nextSlider.id}"]`)
            nextSlider.replaceWith(currentSlider)
            if (currentTooltip && nextTooltip) nextTooltip.replaceWith(currentTooltip)
        }
        currentSplitPanel.replaceChildren(...nextSplitPanel.children)
        const copyAttributes = (target, source) => {
            Array.from(target.attributes).forEach(attribute => target.removeAttribute(attribute.name))
            Array.from(source.attributes).forEach(attribute => target.setAttribute(attribute.name, attribute.value))
        }
        copyAttributes(currentStructure, nextStructure)
        copyAttributes(currentLayout, nextLayout)

        const nextChildren = [...nextStructure.childNodes]
        const nextLayoutIndex = nextChildren.indexOf(nextLayout)
        const currentChildren = [...currentStructure.childNodes]
        currentChildren.forEach(child => {
            if (child !== currentLayout) child.remove()
        })
        nextChildren.slice(0, nextLayoutIndex).forEach(child => currentLayout.before(child))
        let afterReference = currentLayout
        nextChildren.slice(nextLayoutIndex + 1).forEach(child => {
            afterReference.after(child)
            afterReference = child
        })
        return true
    }

    /**
     * Refresh dimensions in place without rebuilding the timeline DOM.
     */
    _refreshLayoutMetrics = () => {
        this._refreshLayoutMetricsInternal()
    }

    _refreshLayoutMetricsInternal = () => {
        const surfaceWidth = this._surface?.clientWidth ?? 0
        if (Number.isFinite(surfaceWidth) && surfaceWidth > 0 && surfaceWidth !== this._surfaceWidth) {
            this._surfaceWidth = surfaceWidth
            this._render()
            return
        }
        const nextRowHeight = this._resolveRowHeight()
        if (nextRowHeight !== this._rowHeight) {
            this._rowHeight = nextRowHeight
            const layout = this._root.querySelector('[data-layout]')
            layout?.style.setProperty('--lgs-timeline-row-height', `${this._rowHeight}px`)
        }
        this._updateScrollbars()
    }

    _cancelLayoutRefresh = () => {
        if (this._layoutRefreshFrame === null) return
        if (this._layoutRefreshUsesAnimationFrame) {
            globalThis.cancelAnimationFrame?.(this._layoutRefreshFrame)
        } else {
            globalThis.clearTimeout(this._layoutRefreshFrame)
        }
        this._layoutRefreshFrame = null
        this._layoutRefreshUsesAnimationFrame = false
    }

    _scheduleLayoutRefresh = () => {
        if (this._layoutRefreshFrame !== null) return
        const refresh = () => {
            this._layoutRefreshFrame = null
            this._layoutRefreshUsesAnimationFrame = false
            this._refreshLayoutMetrics()
        }
        if (typeof globalThis.requestAnimationFrame === 'function') {
            this._layoutRefreshUsesAnimationFrame = true
            this._layoutRefreshFrame = globalThis.requestAnimationFrame(refresh)
        } else {
            this._layoutRefreshFrame = globalThis.setTimeout(refresh, 0)
        }
    }

    /**
     * Read the custom scrollbar auto-hide delay from the host CSS token.
     *
     * @returns {number} Auto-hide delay in milliseconds.
     */
    _scrollbarAutoHideDelay = () => {
        const value = globalThis.getComputedStyle?.(this)?.getPropertyValue('--lgs-timeline-scrollbar-auto-hide-delay')?.trim()
        const amount = Number.parseFloat(value)
        if (!Number.isFinite(amount) || amount < 0) return 3_000
        return value.endsWith('ms') ? amount : amount * 1_000
    }

    /**
     * Clear the pending custom scrollbar auto-hide timer.
     */
    _clearScrollbarHideTimer = () => {
        if (this._scrollbarHideTimer !== null) clearTimeout(this._scrollbarHideTimer)
        this._scrollbarHideTimer = null
    }

    /**
     * Show all custom rails and cancel their inactivity timer.
     */
    _showScrollbars = () => {
        this._clearScrollbarHideTimer()
        const shells = this._cacheScrollbarElements()
        shells.forEach(({shell}) => shell.classList.remove('lgs1920-wa-timeline__scroll-shell--idle'))
    }

    /**
     * Hide all custom rails after the configured inactivity delay.
     */
    _scheduleScrollbarHide = () => {
        this._clearScrollbarHideTimer()
        if (this._scrollbarsInteractionActive) return
        const shells = this._cacheScrollbarElements()
        if (shells.length === 0) return
        const delay = this._scrollbarAutoHideDelay()
        if (delay <= 0) return
        this._scrollbarHideTimer = setTimeout(() => {
            shells.forEach(({shell}) => shell.classList.add('lgs1920-wa-timeline__scroll-shell--idle'))
            this._scrollbarHideTimer = null
        }, delay)
    }

}
