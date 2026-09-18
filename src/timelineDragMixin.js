/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineDragMixin.js
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
import * as timelineEditing from './timelineEditing.js'
import * as timelineConstants from './timelineConstants.js'

/**
 * Add row, clip, pointer, and edge-scroll interaction methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineDragMixin = Base => class extends Base {
    _startRowDrag = (event, rowId) => {
        const row = this._rows.find(value => value.id === rowId)
        if (event.button !== 0
            || event.target.closest('wa-button')
            || !row
            || !this._isTrackEditable(row)) return
        const sourceElement = event.currentTarget instanceof Element ? event.currentTarget : event.target
        if (sourceElement?.getAttribute?.('part') === 'legend-content') {
            this._dragState = {
                type: 'row-pending',
                rowId,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                sourceElement,
            }
            this._addPointerListeners()
            return
        }
        this._activateRowDrag(event, rowId, sourceElement)
    }

    /**
     * Activate a row drag after a pointer movement has exceeded the click threshold.
     *
     * @param {PointerEvent} event - Pointer event that activates the drag.
     * @param {string} rowId - Dragged row identifier.
     * @param {Element|null} sourceElement - Element that received the pointer down.
     */
    _activateRowDrag = (event, rowId, sourceElement = null) => {
        event.preventDefault()
        event.stopPropagation()
        this._capturePointer({
            currentTarget: sourceElement,
            target: sourceElement ?? event.target,
            pointerId: event.pointerId,
        })
        const layout = this._root.querySelector('[data-layout]')
        const layoutRect = layout?.getBoundingClientRect()
        const rowGhostGeometry = Object.fromEntries(
            [...this._root.querySelectorAll('[part="legend-row"], [part="track"]')]
                .filter(element => element.dataset.rowId === String(rowId))
                .map(element => {
                    const parent = element.parentElement
                    const rect = element.getBoundingClientRect()
                    const parentRect = parent?.getBoundingClientRect()
                    const part = element.getAttribute('part')
                    const fallbackLeft = parent && parentRect
                        ? rect.left - parentRect.left + (parent.scrollLeft ?? 0)
                        : 0
                    return [part, {
                        left: layoutRect
                            ? rect.left - layoutRect.left
                            : fallbackLeft,
                        width: rect.width,
                    }]
                }),
        )
        this._dragState = {
            type: 'row',
            rowId,
            pointerId: event.pointerId,
            pointerY: event.clientY,
            dropIndex: this._rows.findIndex(row => row.id === rowId),
            lastValidDropIndex: this._rows.findIndex(row => row.id === rowId),
            dropRejected: false,
            initialTimeMillis: this._currentTimeMillis,
            baseRows: timelineEditing.cloneRows(this._rows),
            rowGhostGeometry,
        }
        const detail = this._withLazySnapshot({
            context: this._dragContext(this._dragState),
            event,
        })
        if (this._emitBefore('drag', detail).defaultPrevented) {
            this._dragState = null
            this._releasePointerCapture()
            return
        }
        this._addPointerListeners()
        this._updateRowDragPresentation()
    }

    /**
     * Position synchronized row ghosts under the pointer and keep the
     * insertion marker at the proposed logical slot.
     *
     * @returns {void}
     */
    _positionRowDragGhost = () => {
        const state = this._dragState
        if (state?.type !== 'row') return
        this._removeRejectedRowSilhouettes()
        const rejected = state.dropRejected === true
        const rowHeight = Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight)
        const remainingRows = this._rows.filter(row => row.id !== state.rowId)
        const tracksRect = this._tracksViewport?.getBoundingClientRect()
        const tracksScrollTop = this._tracksViewport?.scrollTop ?? 0
        const pointerContentY = tracksRect
            ? state.pointerY - tracksRect.top + tracksScrollTop
            : state.pointerY
        const ghostTop = pointerContentY - (rowHeight / 2)
        const markerIndex = remainingRows
            .slice(1)
            .findIndex((_, index) => {
                const boundary = (index + 1) * rowHeight
                return ghostTop <= boundary && ghostTop + rowHeight >= boundary
            })
        const resolvedMarkerIndex = markerIndex < 0 ? null : markerIndex + 1
        const layout = this._root.querySelector('[data-layout]')
        const layoutRect = layout?.getBoundingClientRect()
        if (!layout || !layoutRect) return
        const ghostLayer = timelineUtils.createElement('div', 'lgs1920-wa-timeline__row-drag-ghost-layer', {
            'data-row-drag-ghost-layer': '',
            'aria-hidden': 'true',
        })
        const ghostTopInLayout = state.pointerY - layoutRect.top - (rowHeight / 2)
        const rowElements = [...this._root.querySelectorAll('[part="legend-row"], [part="track"]')]
            .filter(element => element.dataset.rowId === String(state.rowId))
        rowElements.forEach(element => {
            const geometry = state.rowGhostGeometry?.[element.getAttribute('part')]
            if (!geometry) return
            const height = rowHeight
            const silhouette = element.cloneNode(true)
            silhouette.removeAttribute('id')
            silhouette.setAttribute('data-row-drag-ghost', '')
            silhouette.setAttribute('aria-hidden', 'true')
            silhouette.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
            silhouette.classList.remove(
                'lgs1920-wa-timeline__legend-row--dragging',
                'lgs1920-wa-timeline__track--dragging',
                'lgs1920-wa-timeline__legend-row--drop-rejected',
                'lgs1920-wa-timeline__track--drop-rejected',
                'lgs1920-wa-timeline__legend-row--drag-placeholder',
                'lgs1920-wa-timeline__track--drag-placeholder',
            )
            silhouette.classList.add(
                'lgs1920-wa-timeline__row-drag-ghost',
                rejected
                    ? 'lgs1920-wa-timeline__row-drag-ghost--rejected'
                    : 'lgs1920-wa-timeline__row-drag-ghost--valid',
            )
            silhouette.style.top = `${ghostTopInLayout}px`
            silhouette.style.left = `${geometry.left}px`
            silhouette.style.width = geometry.width > 0 ? `${geometry.width}px` : '100%'
            silhouette.style.height = `${height}px`
            ghostLayer.append(silhouette)
        })
        layout.append(ghostLayer)
        this._root.querySelectorAll('[data-scroll-view="legend"], [data-scroll-view="tracks"]').forEach(view => {
            const container = view.querySelector('[part="legend-rows"], [part="tracks"]')
            if (!container || resolvedMarkerIndex === null) return
            const marker = document.createElement('div')
            const markerRejected = !this._isTrackInsertionAllowed(remainingRows, resolvedMarkerIndex)
            marker.className = `lgs1920-wa-timeline__row-drag-marker${markerRejected || rejected ? ' lgs1920-wa-timeline__row-drag-marker--rejected' : ''}`
            marker.setAttribute('data-row-drag-marker', '')
            marker.setAttribute('aria-hidden', 'true')
            marker.style.top = `${resolvedMarkerIndex * rowHeight - 1}px`
            container.append(marker)
        })
    }

    /**
     * Remove transient row drag silhouettes before updating the live rows.
     */
    _removeRejectedRowSilhouettes = () => {
        this._root.querySelectorAll('[data-row-drag-ghost-layer]').forEach(element => element.remove())
        this._root.querySelectorAll('[data-row-drag-ghost]').forEach(element => element.remove())
        this._root.querySelectorAll('[data-row-drag-marker]').forEach(element => element.remove())
    }

    /**
     * Update row drag feedback without rebuilding either scroll view.
     */
    _updateRowDragPresentation = () => {
        const state = this._dragState
        if (state?.type !== 'row') return
        this._removeRejectedRowSilhouettes()
        const rejected = state.dropRejected === true
        this._root.querySelectorAll('[part="legend-row"], [part="track"]').forEach(element => {
            const rowId = element.dataset.rowId
            const isDragged = rowId === String(state.rowId)
            const isLegendRow = element.getAttribute('part') === 'legend-row'
            element.classList.toggle(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--dragging'
                : 'lgs1920-wa-timeline__track--dragging', isDragged)
            element.classList.toggle(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--drop-rejected'
                : 'lgs1920-wa-timeline__track--drop-rejected', isDragged && rejected)
            element.classList.toggle(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--drag-placeholder'
                : 'lgs1920-wa-timeline__track--drag-placeholder', isDragged && rejected)
        })
        this._positionRowDragGhost()
    }

    /**
     * Clear row drag feedback after the interaction ends.
     */
    _clearRowDragPresentation = () => {
        this._removeRejectedRowSilhouettes()
        this._root.querySelectorAll('[part="legend-row"], [part="track"]').forEach(element => {
            const isLegendRow = element.getAttribute('part') === 'legend-row'
            element.classList.remove(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--dragging'
                : 'lgs1920-wa-timeline__track--dragging')
            element.classList.remove(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--drop-rejected'
                : 'lgs1920-wa-timeline__track--drop-rejected')
            element.classList.remove(isLegendRow
                ? 'lgs1920-wa-timeline__legend-row--drag-placeholder'
                : 'lgs1920-wa-timeline__track--drag-placeholder')
        })
    }

    /**
     * Reorder the existing legend and track rows in place.
     */
    _reorderRenderedRows = () => {
        const rowContainers = [
            this._root.querySelector('.lgs1920-wa-timeline__legend-rows'),
            this._root.querySelector('.lgs1920-wa-timeline__tracks'),
        ]
        rowContainers.forEach(container => {
            if (!container) return
            const rowsById = new Map([...container.children]
                .filter(element => element.dataset.rowId && !element.hasAttribute('data-row-drag-ghost'))
                .map(element => [String(element.dataset.rowId), element]))
            this._rows.forEach(row => {
                const element = rowsById.get(String(row.id))
                if (element) container.append(element)
            })
        })
    }

    /**
     * Resolve a row insertion position after removing the dragged row.
     *
     * @param {Array} rows - Current row order.
     * @param {string} rowId - Dragged row identifier.
     * @param {number} dropIndex - Raw insertion index in the current row order.
     * @returns {{allowed: boolean, targetIndex: number}|null} Drop resolution.
     */
    _resolveRowDrop = (rows, rowId, dropIndex) => {
        const currentIndex = rows.findIndex(row => row.id === rowId)
        if (currentIndex < 0) return null
        const remainingRows = rows.filter(row => row.id !== rowId)
        const targetIndex = timelineUtils.clamp(
            dropIndex > currentIndex ? dropIndex - 1 : dropIndex,
            0,
            remainingRows.length,
        )
        const bounds = this._trackInsertionBounds(remainingRows)
        if (!bounds || !this._isTrackInsertionAllowed(remainingRows, targetIndex)) return {allowed: false, targetIndex}
        return {allowed: true, targetIndex}
    }

    /**
     * Resolve the public context attached to a row or clip drag.
     *
     * @param {Object} state - Active drag state.
     * @returns {Object} Public drag context.
     */
    _dragContext = state => {
        if (state?.type === 'row') {
            return {
                type: 'track',
                trackId: state.rowId,
            }
        }
        const entry = state?.type === 'clip'
            ? this._clipEditor.findClipEntry(this._rows, state.clipId)
            : null
        const trackId = entry?.row.id ?? state?.targetTrackId ?? state?.sourceTrackId ?? null
        return {
            type: 'clip',
            trackId,
            clipId: state?.clipId ?? null,
        }
    }

    /**
     * Cancel the timer used to hide the last clip snap guide.
     */
    _clearClipSnapGuideTimer = () => {
        if (this._clipSnapGuideTimer !== null) clearTimeout(this._clipSnapGuideTimer)
        this._clipSnapGuideTimer = null
    }

    /**
     * Hide the clip snap guide and cancel its delayed cleanup.
     */
    _clearClipSnapGuide = () => {
        this._clearClipSnapGuideTimer()
        this._clipSnapGuide = null
    }

    /**
     * Keep a clip snap guide visible for a short period after a drag ends.
     *
     * @param {Object} guide - Snap guide metadata.
     */
    _showClipSnapGuide = guide => {
        this._clearClipSnapGuideTimer()
        this._clipSnapGuide = guide
        this._clipSnapGuideTimer = setTimeout(() => {
            this._clipSnapGuide = null
            this._clipSnapGuideTimer = null
            this._updateClipSnapGuidePresentation()
        }, 2000)
    }

    /**
     * Update the vertical clip alignment guide in the current timeline surface.
     *
     * @param {Object|null} [activeGuide=null] - Guide shown during an active drag.
     */
    _updateClipSnapGuidePresentation = (activeGuide = null) => {
        const element = this._root.querySelector('[data-clip-snap-guide]')
        if (!element) return
        const guide = activeGuide ?? this._clipSnapGuide
        const {majorSeconds} = this._resolveScale()
        const scaleWidth = this._scaleWidth()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const time = Number(guide?.time)
        const targetClipId = guide?.clipId
        const targetElement = targetClipId === null || targetClipId === undefined
            ? null
            : [...this._root.querySelectorAll('[data-clip-id]')]
                .find(value => String(value.getAttribute('data-clip-id')) === String(targetClipId))
        const overlayRect = element.parentElement?.getBoundingClientRect?.()
        const targetRect = targetElement?.getBoundingClientRect?.()
        const targetEdge = guide?.edge === 'end' ? targetRect?.right : targetRect?.left
        const hasTargetGeometry = Number.isFinite(Number(targetEdge))
            && Number.isFinite(Number(overlayRect?.left))
            && Number(targetRect?.width) > 0
            && Number(overlayRect?.width) > 0
        const visible = Number.isFinite(time)
            && time >= 0
            && (targetClipId === null || targetClipId === undefined || Boolean(targetElement))
        element.hidden = !visible
        element.style.display = visible ? 'block' : 'none'
        if (!visible) return
        const left = hasTargetGeometry
            ? Number(targetEdge) - Number(overlayRect.left)
            : scaleOffset + ((time / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)
        element.style.left = `${left}px`
        element.dataset.clipSnapTargetId = String(guide.clipId ?? '')
        element.dataset.clipSnapTargetEdge = String(guide.edge ?? '')
        element.setAttribute('aria-label', guide.clipId === null || guide.clipId === undefined
            ? 'Snap alignment'
            : `Snap alignment with clip ${String(guide.clipId)}`)
    }

    /**
     * Install global pointer listeners for scrubbing, resizing, or row drag.
     */
    _addPointerListeners = () => {
        const interactionWindow = this._interactionWindow()
        interactionWindow?.addEventListener('pointermove', this._pointerMove, {passive: false, capture: true})
        interactionWindow?.addEventListener('pointerup', this._pointerUp, true)
        interactionWindow?.addEventListener('pointercancel', this._pointerUp, true)
    }

    /**
     * Remove global pointer listeners and reset transient pointer state.
     */
    _removePointerListeners = () => {
        const interactionWindow = this._interactionWindow()
        this._clipScroll?.stop()
        this._clipWorkspaceWidth = 0
        interactionWindow?.removeEventListener('pointermove', this._pointerMove, true)
        interactionWindow?.removeEventListener('pointerup', this._pointerUp, true)
        interactionWindow?.removeEventListener('pointercancel', this._pointerUp, true)
        this.removeAttribute('data-row-drop-rejected')
        this._dragState = null
        this._scrubPointerId = null
        this._releasePointerCapture()
        this._stopAutoScroll()
    }

    /**
     * Handle global pointer movement for all timeline interactions.
     *
     * @param {PointerEvent} event - Pointer event.
     */
    _pointerMove = event => {
        if (this._scrubPointerId !== null) {
            if (event.pointerId !== this._scrubPointerId) return
            event.preventDefault()
            this._seek(event.clientX, false)
            return
        }
        if (this._dragState?.type === 'playhead') {
            if (event.pointerId !== this._dragState.pointerId) return
            event.preventDefault()
            this._seek(event.clientX - (this._dragState.pointerOffsetX ?? 0), false)
            this._handleEdgeAutoScroll(event)
            this._pinActiveTimeHandle(event)
            return
        }
        if (this._dragState?.type === 'clip') {
            if (event.pointerId !== this._dragState.pointerId) return
            if (this._dragState.pending === true) {
                const distance = Math.hypot(
                    event.clientX - this._dragState.startX,
                    event.clientY - this._dragState.startY,
                )
                const threshold = this._dragState.pointerType === 'touch'
                    ? timelineConstants.TOUCH_CLIP_DRAG_THRESHOLD
                    : timelineConstants.CLIP_DRAG_THRESHOLD
                if (distance < threshold) return
                this._activateClipInteraction(event)
                if (this._dragState?.type !== 'clip' || this._dragState.pending === true) return
            }
            event.preventDefault()
            this._handleEdgeAutoScroll(event)
            this._clipEditor.preview(this._dragState, event)
            const result = this._dragState.lastResult ?? {
                rows: this._rows,
                durationMillis: this._durationMillis(),
            }
            this._emit('drag', this._withLazySnapshot({
                context: this._dragContext(this._dragState),
                ...this._clipEditor.changeDetail(this._dragState, result, event),
                accepted: this._dragState.dropRejected !== true,
                event,
            }))
            return
        }
        if (this._dragState?.type === 'range') {
            if (event.pointerId !== this._dragState.pointerId) return
            event.preventDefault()
            this._previewRangeInteraction(event)
            this._handleEdgeAutoScroll(event)
            this._pinActiveTimeHandle(event)
            return
        }
        if (this._dragState?.type === 'row-pending') {
            if (event.pointerId !== this._dragState.pointerId) return
            const distance = Math.hypot(
                event.clientX - this._dragState.startX,
                event.clientY - this._dragState.startY,
            )
            if (distance < timelineConstants.ROW_DRAG_THRESHOLD) return
            this._activateRowDrag(event, this._dragState.rowId, this._dragState.sourceElement)
        }
        if (this._dragState?.type === 'row') {
            if (event.pointerId !== this._dragState.pointerId) return
            event.preventDefault()
            this._handleEdgeAutoScroll(event)
            this._currentTimeMillis = this._normalizeTime(this._dragState.initialTimeMillis)
            this._dragState.pointerY = event.clientY
            const viewport = this._root.querySelector('.lgs1920-wa-timeline__legend-viewport')
            const rect = viewport?.getBoundingClientRect()
            if (!rect) return
            const rowHeight = Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight)
            const currentIndex = this._rows.findIndex(row => row.id === this._dragState.rowId)
            const remainingRows = this._rows.filter(row => row.id !== this._dragState.rowId)
            const visibleDropIndex = timelineUtils.clamp(
                Math.floor((event.clientY - rect.top + (viewport.scrollTop ?? 0) + (rowHeight / 2)) / rowHeight),
                0,
                remainingRows.length,
            )
            const dropIndex = visibleDropIndex >= currentIndex
                ? visibleDropIndex + 1
                : visibleDropIndex
            const resolution = this._resolveRowDrop(this._rows, this._dragState.rowId, dropIndex)
            if (!resolution?.allowed) {
                this._dragState.dropIndex = dropIndex
                this._dragState.dropRejected = true
                this.setAttribute('data-row-drop-rejected', '')
                this._updateRowDragPresentation()
                return
            }
            this._dragState.dropIndex = dropIndex
            this._dragState.lastValidDropIndex = dropIndex
            this._dragState.dropRejected = false
            this.removeAttribute('data-row-drop-rejected')
            this._emit('drag', this._withLazySnapshot({
                context: this._dragContext(this._dragState),
                event,
            }))
            this._updateRowDragPresentation()
        }
    }

    /**
     * Complete the active pointer interaction and emit a reorder event when
     * a row was moved.
     *
     * @param {PointerEvent} event - Pointer event.
     */
    _pointerUp = event => {
        const activePointerId = this._dragState?.pointerId ?? this._scrubPointerId
        if (activePointerId !== null && activePointerId !== undefined && event.pointerId !== activePointerId) return
        if (this._scrubPointerId !== null && event.type === 'pointerup') this._seek(event.clientX, true)
        const state = this._dragState
        const wasSimpleClick = state?.type === 'clip'
            && state.mode === 'move'
            && state.wasSelected === true
            && event.type === 'pointerup'
            && event.clientX === state.startX
            && event.clientY === state.startY
        if (state?.type === 'row-pending') {
            this._removePointerListeners()
            return
        }
        if (state?.type === 'clip' && state.pending === true) {
            const distance = Math.hypot(
                event.clientX - state.startX,
                event.clientY - state.startY,
            )
            const threshold = state.pointerType === 'touch'
                ? timelineConstants.TOUCH_CLIP_DRAG_THRESHOLD
                : timelineConstants.CLIP_DRAG_THRESHOLD
            if (distance < threshold || event.type !== 'pointerup') {
                this._removePointerListeners()
                if (wasSimpleClick) this._clearClipSelection(event)
                return
            }
            this._activateClipInteraction(event)
            if (this._dragState?.type !== 'clip' || this._dragState.pending === true) return
        }
        if (state?.type === 'range' && event.type === 'pointercancel') {
            this._rangeStartMillis = state.initialStartMillis
            this._rangeEndMillis = state.initialEndMillis
            this._rangeEndFollowsDuration = state.initialRangeEndFollowsDuration
            this._suppressRangeClick = false
        }
        if (state?.type === 'range' && event.type === 'pointerup') {
            const detail = this._rangeChangeDetail(event)
            this._emit('range-change', detail)
            this._updateDynamicState()
            this._emitAfter('range-change', detail)
        } else if (state?.type === 'range' && event.type === 'pointercancel') {
            this._emitAfter('range-change', this._rangeChangeDetail(event))
        }
        if (state?.type === 'playhead' && event.type === 'pointercancel') {
            this._currentTimeMillis = this._normalizeTime(state.initialTimeMillis, false)
            this._updateDynamicState()
        }
        if (state?.type === 'playhead' && event.type === 'pointerup') {
            this._seek(event.clientX - (state.pointerOffsetX ?? 0), true)
        }
        if (state?.type === 'clip' && event.type === 'pointerup') {
            // Resolve the actual release coordinates, including a final move omitted by the browser.
            const sameAsLastPreview = state.previewClientX === event.clientX
                && state.previewClientY === event.clientY
                && state.previewShiftKey === event.shiftKey
                && state.previewAltKey === event.altKey
            if (!sameAsLastPreview
                && (state.lastResult || state.dropRejected || event.clientX !== state.startX || event.clientY !== state.startY)) {
                this._clipEditor.preview(state, event)
            }
            const result = state.dropRejected ? null : state.lastResult
            if (result && state.mode === 'resize') {
                this._clipEditor.recordResizeResult({
                    baseRows: state.baseRows,
                    result,
                    clipId: state.clipId,
                    edge: state.edge,
                })
            }
            this._rows = result?.rows ?? state.baseRows
            if (result) this._localRowsDirty = true
            if (result) this._localDurationDirty = true
            this._interactionDurationMillis = result?.durationMillis ?? state.initialDurationMillis
            this._rangeEndMillis = result?.rangeEndMillis ?? state.initialRangeEndMillis
            const detail = this._clipEditor.changeDetail(state, result ?? {
                rows: this._rows,
                durationMillis: this._durationMillis(),
            }, event)
            if (result) this._emit('clip-change', detail)
            this._emitAfter('clip-change', {...detail, committed: Boolean(result)})
        } else if (state?.type === 'clip') {
            this._rows = state.baseRows
            this._interactionDurationMillis = state.initialDurationMillis
            this._rangeEndMillis = state.initialRangeEndMillis
            this._emitAfter('clip-change', {
                ...this._clipEditor.changeDetail(state, {
                    rows: this._rows,
                    durationMillis: this._durationMillis(),
                }, event),
                committed: false,
            })
        }
        if (state?.type === 'row' && event.type === 'pointercancel') this._rows = state.baseRows
        if (state?.type === 'row' && event.type === 'pointerup' && state.dropRejected !== true) {
            const resolution = this._resolveRowDrop(this._rows, state.rowId, state.lastValidDropIndex)
            const currentIndex = this._rows.findIndex(row => row.id === state.rowId)
            if (resolution?.allowed && currentIndex >= 0 && currentIndex !== resolution.targetIndex) {
                const rows = [...this._rows]
                const [row] = rows.splice(currentIndex, 1)
                rows.splice(resolution.targetIndex, 0, row)
                const detail = {
                    trackIds: rows.map(row => row.id),
                    tracks: rows.map(row => this._publicTrack(row)),
                    previousTracks: this.tracks,
                    dropIndex: state.lastValidDropIndex,
                    event,
                    data: this._publicSnapshot(),
                }
                if (this._emitBefore('reorder', detail).defaultPrevented) {
                    state.reorderCanceled = true
                } else {
                    this._rows = rows
                    this._localRowsDirty = true
                    this._emit('reorder', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
                    state.reorderDetail = detail
                }
            }
        }
        if (state?.type === 'row') {
            this._currentTimeMillis = this._normalizeTime(state.initialTimeMillis)
            this._updateDynamicState()
        }
        const rowOrderChanged = state?.type === 'row'
            && this._rows.some((row, index) => row.id !== state.baseRows[index]?.id)
        if (state?.type === 'row') {
            this._reorderRenderedRows()
            this._clearRowDragPresentation()
        }
        if (state?.type === 'row' && event.type === 'pointerup') {
            if (rowOrderChanged || state.reorderDetail || state.reorderCanceled) {
                this._emitAfter('reorder', {
                    ...(state.reorderDetail ?? {
                        trackIds: this._rows.map(row => row.id),
                        tracks: this._rows.map(row => this._publicTrack(row)),
                        previousTracks: state.baseRows.map(row => this._publicTrack(row)),
                        dropIndex: state.lastValidDropIndex,
                        event,
                        data: this._publicSnapshot(),
                    }),
                    tracks: this.tracks,
                    data: this._publicSnapshot(),
                    committed: rowOrderChanged && state.reorderCanceled !== true,
                })
            }
        }
        if (state?.type === 'row' || state?.type === 'clip') {
            const clipDetail = state.type === 'clip'
                ? this._clipEditor.changeDetail(state, {
                    rows: this._rows,
                    durationMillis: this._durationMillis(),
                }, event)
                : {}
            this._emitAfter('drag', this._withLazySnapshot({
                context: this._dragContext(state),
                ...clipDetail,
                committed: event.type === 'pointerup' && (state.type === 'clip' ? Boolean(state.lastResult) : rowOrderChanged),
                event,
            }))
            if (wasSimpleClick) this._clearClipSelection(event)
        }
        if (state?.type === 'clip' && event.type === 'pointerup') {
            if (state.snapTargetTime !== null
                && state.snapTargetTime !== undefined
                && Number.isFinite(Number(state.snapTargetTime))) {
                this._showClipSnapGuide({
                    time: state.snapTargetTime,
                    clipId: state.snapTargetClipId,
                    edge: state.snapTargetEdge,
                    kind: state.snapTargetKind,
                })
            } else {
                this._clearClipSnapGuide()
            }
        }
        const pendingControlledState = this._pendingControlledState
        this._pendingControlledState = null
        this._removePointerListeners()
        if (state?.type === 'clip') {
            this._refreshDurationGeometry()
            this._updateClipInteractionPresentation()
            if (event.type === 'pointerup') this._focusSelectedClip()
        }
        if (state?.type === 'range') this._updateDynamicState()
        if (pendingControlledState) this._applyState(pendingControlledState)
    }

    /**
     * Resolve and start horizontal edge auto-scroll for an active drag.
     *
     * The dragged time handle remains under the pointer while the surface
     * scrolls. Once the drag reaches its logical limit, the animation stops
     * even if more content remains outside the viewport.
     *
     * @param {PointerEvent} event - Latest pointer event.
     */
    _handleEdgeAutoScroll = event => {
        if (['clip', 'row'].includes(this._dragState?.type)) {
            this._clipScroll.update(event)
            return
        }
        const rect = this._surface?.getBoundingClientRect()
        if (!rect) return
        this._edgePointerEvent = event
        const rightEdge = rect.right - timelineUtils.EDGE_TRIGGER_SIZE
        const leftEdge = rect.left + timelineUtils.EDGE_TRIGGER_SIZE
        const direction = event.clientX >= rightEdge ? 1 : event.clientX <= leftEdge ? -1 : null
        if (direction === null) {
            this._stopAutoScroll()
            return
        }
        if (this._edgeDirection !== direction || this._edgeStartedAt === null) {
            const now = Date.now()
            this._edgeDirection = direction
            this._edgeStartedAt = now
            this._edgeLastStepAt = now
        }
        if (this._isEdgeDragLimitReached(direction)) {
            this._stopAutoScroll()
            return
        }
        if (this._autoScrollFrame !== null) return
        const loop = () => {
            const state = this._dragState
            const pointerEvent = this._edgePointerEvent
            if (!this._surface || !pointerEvent || !['clip', 'playhead', 'range', 'row'].includes(state?.type)) {
                this._stopAutoScroll()
                return
            }
            if (this._isEdgeDragLimitReached(this._edgeDirection)) {
                this._stopAutoScroll()
                return
            }
            const now = Date.now()
            const heldMillis = Math.max(0, now - (this._edgeStartedAt ?? now))
            const previousScrollLeft = this._surface.scrollLeft
            if (state.type === 'row') {
                const speedIndex = Math.min(timelineUtils.EDGE_SCROLL_SPEEDS.length - 1, Math.floor(heldMillis / ACCELERATION_INTERVAL))
                this._surface.scrollLeft += this._edgeDirection * timelineUtils.EDGE_SCROLL_SPEEDS[speedIndex]
            } else {
                if (this._edgeLastStepAt === null) this._edgeLastStepAt = now
                const elapsedSinceStep = Math.max(0, now - this._edgeLastStepAt)
                if (elapsedSinceStep < timelineUtils.EDGE_TIME_ACCELERATION_INTERVAL) {
                    this._autoScrollFrame = requestAnimationFrame(loop)
                    return
                }
                const {majorSeconds} = this._resolveScale()
                const scaleWidth = this._scaleWidth()
                const stepCount = Math.max(1, Math.floor(elapsedSinceStep / timelineUtils.EDGE_TIME_ACCELERATION_INTERVAL))
                const firstStepAt = this._edgeLastStepAt
                const totalStepMillis = Array.from({length: stepCount}, (_, index) => {
                    const stepHeldMillis = Math.max(0, firstStepAt + ((index + 1) * timelineUtils.EDGE_TIME_ACCELERATION_INTERVAL) - (this._edgeStartedAt ?? firstStepAt))
                    const speedIndex = Math.min(timelineUtils.EDGE_SCROLL_TIME_STEPS.length - 1, Math.floor(stepHeldMillis / timelineUtils.EDGE_TIME_ACCELERATION_INTERVAL))
                    return timelineUtils.EDGE_SCROLL_TIME_STEPS[speedIndex]
                }).reduce((total, stepMillis) => total + stepMillis, 0)
                const pixelStep = (totalStepMillis / 1000 / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth
                this._surface.scrollLeft += this._edgeDirection * pixelStep
                this._edgeLastStepAt += stepCount * timelineUtils.EDGE_TIME_ACCELERATION_INTERVAL
            }
            if (this._surface.scrollLeft === previousScrollLeft) {
                this._stopAutoScroll()
                return
            }
            if (state.type === 'range') this._previewRangeInteraction(pointerEvent)
            else if (state.type === 'playhead') this._seek(pointerEvent.clientX - (state.pointerOffsetX ?? 0), false)
            else if (state.type === 'clip') {
                this._clipEditor.preview(state, pointerEvent)
                const result = state.lastResult ?? {
                    rows: this._rows,
                    durationMillis: this._durationMillis(),
                }
                this._emit('drag', this._withLazySnapshot({
                    context: this._dragContext(state),
                    ...this._clipEditor.changeDetail(state, result, pointerEvent),
                    accepted: state.dropRejected !== true,
                    event: pointerEvent,
                }))
            }
            this._pinActiveTimeHandle(pointerEvent)
            if (this._isEdgeDragLimitReached(this._edgeDirection)) {
                this._stopAutoScroll()
                return
            }
            this._autoScrollFrame = requestAnimationFrame(loop)
        }
        this._autoScrollFrame = requestAnimationFrame(loop)
    }

    /**
     * Check whether a time drag has reached the boundary in its scroll direction.
     *
     * @param {number} direction - Horizontal direction, either -1 or 1.
     * @returns {boolean} Whether the active time handle is at its limit.
     */
    _isEdgeDragLimitReached = direction => {
        const state = this._dragState
        if (state?.type === 'range') {
            if (state.edge === 'start') return direction < 0 ? this._rangeStartMillis <= 0 : this._rangeStartMillis >= this._rangeEndMillis
            return direction < 0 ? this._rangeEndMillis <= this._rangeStartMillis : this._rangeEndMillis >= this._durationMillis()
        }
        if (state?.type === 'playhead') {
            return direction < 0 ? this._currentTimeMillis <= 0 : this._currentTimeMillis >= this._durationMillis()
        }
        return false
    }

    /**
     * Stop the edge auto-scroll animation and reset acceleration.
     */
    _stopAutoScroll = () => {
        this._clipScroll?.stop()
        if (this._autoScrollFrame !== null) cancelAnimationFrame(this._autoScrollFrame)
        this._autoScrollFrame = null
        this._edgeDirection = null
        this._edgeStartedAt = null
        this._edgeLastStepAt = null
        this._edgePointerEvent = null
    }

    /**
     * Keep the active time handle visually attached to the pointer.
     *
     * The handle is pinned only while it can still move in the current edge
     * direction. At a logical boundary, the rendered boundary position wins.
     *
     * @param {PointerEvent} event - Latest pointer event.
     */
    _pinActiveTimeHandle = event => {
        const state = this._dragState
        if (!['playhead', 'range'].includes(state?.type)) return
        const rect = this._surface?.getBoundingClientRect()
        if (!rect) return
        const handle = state.type === 'playhead'
            ? this._root.querySelector('[data-playhead]')
            : this._root.querySelector(`[data-range-handle="${state.edge}"]`)
        if (!handle) return
        if (this._edgeDirection && this._isEdgeDragLimitReached(this._edgeDirection)) return
        const duration = this._durationMillis()
        const minimumTime = state.type === 'playhead'
            ? 0
            : state.edge === 'start'
                ? 0
                : timelineUtils.clamp(this._rangeStartMillis, 0, duration)
        const maximumTime = state.type === 'playhead'
            ? duration
            : state.edge === 'start'
                ? timelineUtils.clamp(this._rangeEndMillis, minimumTime, duration)
                : duration
        const minimumPosition = this._timeContentX(minimumTime)
        const maximumPosition = this._timeContentX(maximumTime)
        const logicalPosition = this._timeContentX(timelineUtils.clamp(
            state.type === 'playhead'
                ? this._currentTimeMillis
                : state.edge === 'start'
                    ? this._rangeStartMillis
                    : this._rangeEndMillis,
            minimumTime,
            maximumTime,
        ))
        const viewportMargin = this._surfaceViewportMargin()
        const scrollLeft = this._surface.scrollLeft ?? 0
        const viewportWidth = Number(rect.width) || Math.max(0, Number(rect.right) - Number(rect.left))
        const viewportMinimumPosition = scrollLeft + viewportMargin
        const viewportMaximumPosition = scrollLeft + Math.max(viewportMargin, viewportWidth - viewportMargin)
        const atLeftEdge = this._edgeDirection === -1 || event.clientX <= rect.left + timelineUtils.EDGE_TRIGGER_SIZE
        const atRightEdge = this._edgeDirection === 1 || event.clientX >= rect.right - timelineUtils.EDGE_TRIGGER_SIZE
        const pinnedClientX = this._edgeDirection === 1
            ? rect.right - viewportMargin
            : this._edgeDirection === -1
                ? rect.left + viewportMargin
                : event.clientX
        const pointerPosition = timelineUtils.clamp(
            atLeftEdge
                ? viewportMinimumPosition
                : atRightEdge
                    ? viewportMaximumPosition
                    : pinnedClientX - rect.left + scrollLeft,
            Math.min(minimumPosition, maximumPosition),
            Math.max(minimumPosition, maximumPosition),
        )
        const playheadPosition = timelineUtils.clamp(
            logicalPosition,
            atLeftEdge ? viewportMinimumPosition : minimumPosition,
            atRightEdge ? viewportMaximumPosition : maximumPosition,
        )
        const pinnedPosition = `${state.type === 'playhead' ? playheadPosition : pointerPosition}px`
        if (state.type === 'playhead') {
            handle.style.setProperty('--lgs-timeline-playhead-offset', pinnedPosition)
        } else {
            handle.style.left = pinnedPosition
        }
    }

    /**
     * Install the host resize observer without coupling it to split-panel movement.
     *
     * The split panel changes the surface width while its divider is dragged.
     * Observing that surface would rebuild the component during the native
     * gesture and invalidate the scroll views. The host size changes only when
     * the timeline container itself is resized.
     */
    _installResizeObserver = () => {
        if (this._resizeObserver) return
        if (typeof ResizeObserver === 'undefined') return
        this._resizeObserver = new ResizeObserver(this._scheduleLayoutRefresh)
        this._resizeObserver.observe(this)
    }

    /**
     * Keep the title and track views aligned on their shared vertical axis.
     */
    _updateLegendScroll = () => {
        const legend = this._root.querySelector('[data-scroll-view="legend"]')
        if (legend && this._tracksViewport && legend.scrollTop !== this._tracksViewport.scrollTop) {
            legend.scrollTop = this._tracksViewport.scrollTop
        }
        this._updateScrollbars()
    }

    /**
     * Push a title-column scroll position into the track surface.
     */
    _syncTracksScroll = () => {
        const legend = this._root.querySelector('[data-scroll-view="legend"]')
        if (legend && this._tracksViewport && this._tracksViewport.scrollTop !== legend.scrollTop) {
            this._tracksViewport.scrollTop = legend.scrollTop
        }
    }

    /**
     * Handle modifier-based zoom gestures from the timeline surface.
     *
     * @param {WheelEvent} event - Wheel event.
     */
}
