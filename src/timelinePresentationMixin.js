/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelinePresentationMixin.js
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
import {resolveClipInterval} from './timelineEditing.js'
import {TIMELINE_EVENT_PREFIX} from './timelineConstants.js'
import {withLazySnapshot} from './timelineEventDetails.js'

/**
 * Add dynamic presentation and event emission methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelinePresentationMixin = Base => class extends Base {
    _withLazySnapshot = detail => withLazySnapshot(detail, () => this._publicSnapshot())

    _cacheDynamicElements = () => {
        this._dynamicElements = this._domCache.cacheDynamicElements()
        this._transportState = null
        return this._dynamicElements
    }

    _cacheClipPresentationElements = () => {
        this._clipPresentationElements = this._domCache.cacheClipPresentationElements()
        return this._clipPresentationElements
    }

    _resolveClipPresentationElements = () => {
        // The cache is invalidated and rebuilt by _render after structural DOM
        // changes. Avoid validating every clip on every pointermove.
        const presentation = this._clipPresentationElements ?? this._cacheClipPresentationElements()
        this._clipPresentationElements = presentation
        return presentation
    }

    _updateDynamicState = () => {
        const elements = this._dynamicElements ?? this._cacheDynamicElements()
        this._updatePlayheadPresentation(elements)
        this._updateZoomSlider(elements)
        this._updateTransportButtons(elements)
        this._updateLoopButton(elements)
        const {total, end, rangeStart, rangeEnd} = elements
        if (total) total.textContent = timelineUtils.formatTime(this._durationSeconds())
        const {majorSeconds} = this._resolveScale()
        const scaleWidth = this._scaleWidth()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        if (end) end.style.left = `${scaleOffset + ((this._durationSeconds() / majorSeconds) * scaleWidth)}px`
        const rangeStartX = scaleOffset + ((this._rangeStartMillis / 1000) / majorSeconds * scaleWidth)
        const rangeEndX = scaleOffset + ((this._rangeEndMillis / 1000) / majorSeconds * scaleWidth)
        if (elements.rangeSelection) {
            const selectionOverflow = this._numericToken('range-selection-overflow', 3)
            elements.rangeSelection.style.left = `${rangeStartX - selectionOverflow}px`
            elements.rangeSelection.style.width = `${Math.max(0, rangeEndX - rangeStartX) + (selectionOverflow * 2)}px`
        }
        if (rangeStart) {
            rangeStart.style.left = `${rangeStartX}px`
            rangeStart.setAttribute('aria-valuenow', `${this._rangeStartMillis}`)
        }
        if (rangeEnd) {
            rangeEnd.style.left = `${rangeEndX}px`
            rangeEnd.setAttribute('aria-valuenow', `${this._rangeEndMillis}`)
            rangeEnd.setAttribute('aria-valuemax', `${this._durationMillis()}`)
        }
    }

    _updatePlayheadPresentation = elements => {
        const {current, playhead} = elements
        if (current) current.textContent = timelineUtils.formatTime(this._currentTimeMillis / 1000)
        this._updatePlayheadPosition({playhead})
        this._updateTimeSlider(elements)
    }

    /**
     * Synchronize the optional time slider with the current timeline range.
     *
     * @param {{timeSlider: HTMLElement|null}} elements - Cached dynamic elements.
     */
    _updateTimeSlider = ({timeSlider}) => {
        if (!timeSlider) return
        timeSlider.min = 0
        timeSlider.max = this._durationMillis()
        timeSlider.step = this._frameIntervalMillis()
        if (Number(timeSlider.value) !== this._currentTimeMillis) timeSlider.value = this._currentTimeMillis
    }

    /**
     * Synchronize the optional zoom slider with the current horizontal zoom.
     *
     * @param {{zoomSlider: HTMLElement|null}} elements - Cached dynamic elements.
     */
    _updateZoomSlider = ({zoomSlider}) => {
        if (!zoomSlider) return
        zoomSlider.min = this._minimumHorizontalZoom()
        zoomSlider.max = timelineUtils.MAX_ZOOM
        if (Number(zoomSlider.value) !== this._zoom) zoomSlider.value = this._zoom
    }

    /**
     * Apply the cached playhead transform and accessibility range values.
     *
     * @param {{playhead: HTMLElement|null}} elements - Cached dynamic elements.
     * @returns {void}
     */
    _updatePlayheadPosition = ({playhead}) => {
        if (!playhead) return
        const position = this._currentTimeContentX()
        const duration = this._durationMillis()
        playhead.style.setProperty('--lgs-timeline-playhead-offset', `${position}px`)
        playhead.setAttribute('aria-valuemin', '0')
        playhead.setAttribute('aria-valuemax', `${duration}`)
        playhead.setAttribute('aria-valuenow', `${this._currentTimeMillis}`)
    }

    _updateTransportButtons = elements => {
        const {
            startButton,
            previousButton,
            nextButton,
            endButton,
        } = elements
        const atStart = this._isAtRangeStart()
        const atEnd = this._isAtRangeEnd()
        if (this._transportState?.atStart === atStart && this._transportState?.atEnd === atEnd) return
        this._transportState = {atStart, atEnd}
        const transportButtons = [
            [startButton, atStart],
            [previousButton, atStart],
            [nextButton, atEnd],
            [endButton, atEnd],
        ]
        transportButtons.forEach(([button, disabled]) => {
            if (!button) return
            button.toggleAttribute('disabled', disabled)
        })
    }

    /**
     * Update clip previews in the existing track surface.
     *
     * @remarks
     * Clip drag and resize previews must not rebuild either scroll view.
     */
    _updateClipInteractionPresentation = () => {
        this._reconcileClipSelection()
        this._updateClipSelectionPresentation()
        const {majorSeconds} = this._resolveScale()
        const scaleWidth = this._scaleWidth()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const dragState = this._dragState
        const activeSnapGuide = dragState?.type === 'clip'
            && dragState.snapTargetTime !== null
            && dragState.snapTargetTime !== undefined
            && Number.isFinite(Number(dragState.snapTargetTime))
            ? {
                time: dragState.snapTargetTime,
                clipId: dragState.snapTargetClipId,
                edge: dragState.snapTargetEdge,
                kind: dragState.snapTargetKind,
            }
            : null
        if (dragState?.type === 'clip' && !activeSnapGuide) this._clearClipSnapGuide()
        this._updateClipSnapGuidePresentation(activeSnapGuide)
        const presentation = this._resolveClipPresentationElements()
        presentation.dragElements.forEach(element => element.remove())
        presentation.dragElements.clear()
        if (dragState?.external !== true || !dragState.previewClip) {
            this._root.querySelectorAll('[data-clip-option-preview]').forEach(element => element.remove())
        }
        this.toggleAttribute('data-clip-drop-rejected', dragState?.type === 'clip' && dragState.dropRejected === true)
        const {
            clipEdgeIndicator,
            clipMoveEndpoints,
            clips,
            tracks,
            legends,
            trackBackgrounds,
            durationOverlays,
            overlay,
        } = presentation
        const resizingClip = dragState?.type === 'clip' && dragState.mode === 'resize'
            ? this._clipEditor.findClipEntry(this._rows, dragState.clipId)?.clip
            : null
        const placementClip = dragState?.type === 'clip' && dragState.mode === 'move'
            ? this._clipEditor.findClipEntry(this._rows, dragState.clipId)?.clip ?? dragState.previewClip
            : null
        const movingClip = dragState?.type === 'clip' && dragState.mode === 'move'
            ? dragState.previewClip ?? placementClip
            : null
        const markerClip = dragState?.type === 'clip'
            ? dragState.mode === 'move'
                ? movingClip
                : dragState.previewClip ?? resizingClip
            : null
        const markerSource = clips.get(String(dragState?.clipId))
        const markerPalette = (markerClip?.colorClasses ?? [])
            .find(value => typeof value === 'string' && value.startsWith('wa-neutral-'))
            ?.slice('wa-neutral-'.length)
        const markerTimelineColor = typeof markerClip?.timelineColor === 'string'
            ? markerClip.timelineColor.trim()
            : ''
        const markerUsesCustomColor = markerTimelineColor && markerTimelineColor !== markerPalette
        const markerColor = markerUsesCustomColor
            ? markerTimelineColor
            : markerPalette
            ? `var(--wa-color-${markerPalette}-60)`
            : markerSource?.style.borderColor ?? ''
        const markerElements = [clipEdgeIndicator, ...clipMoveEndpoints].filter(Boolean)
        markerElements.forEach(element => element.style.setProperty('--lgs-timeline-clip-edge-indicator-color', markerColor))
        if (clipEdgeIndicator) {
            clipEdgeIndicator.hidden = true
        }
        clipMoveEndpoints.forEach(endpoint => {
            const edge = endpoint.getAttribute('data-clip-move-endpoint')
            const endpointTime = markerClip && edge === 'start'
                ? resolveClipInterval(markerClip).start
                : markerClip && edge === 'end'
                    ? resolveClipInterval(markerClip).end
                    : null
            const hasEndpointTime = Number.isFinite(endpointTime)
            endpoint.hidden = !hasEndpointTime
            if (hasEndpointTime) {
                endpoint.style.left = `${scaleOffset + ((endpointTime / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
            }
        })
        const activeRowIds = dragState?.type === 'clip'
            ? new Set([
                dragState.sourceTrackId,
                dragState.targetTrackId,
                dragState.previousTargetTrackId,
            ].filter(value => value !== null && value !== undefined).map(value => String(value)))
            : null
        const rows = activeRowIds
            ? this._rows.filter(row => activeRowIds.has(String(row.id)))
            : this._rows
        rows.forEach(row => {
            const track = tracks.get(String(row.id))
            const legend = legends.get(String(row.id))
            const actions = row.actions ?? []
            actions.forEach(value => {
                const element = clips.get(String(value.id))
                if (!element) return
                if (dragState?.external === true && String(value.id) === String(dragState.clipId)) {
                    if (!element.matches('[data-clip-option-preview]')) element.remove()
                    return
                }
                const {start, end} = resolveClipInterval(value)
                element.style.left = `${scaleOffset + ((start / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                element.style.width = `${Math.max(this._numericToken('clip-min-width', 8), ((end - start) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                element.style.top = ''
                element.style.bottom = ''
                element.style.height = ''
                element.classList.toggle('lgs1920-wa-timeline__clip--hidden', value.visible === false)
                element.classList.toggle('lgs1920-wa-timeline__clip--track-hidden', row.visible === false)
                const isDragging = dragState?.type === 'clip' && dragState.pending !== true && dragState.clipId === value.id
                element.classList.toggle('lgs1920-wa-timeline__clip--dragging', isDragging)
                element.classList.toggle('lgs1920-wa-timeline__clip--resizing', isDragging && dragState.mode === 'resize')
                element.classList.remove(
                    'lgs1920-wa-timeline__clip--drag-ghost',
                    'lgs1920-wa-timeline__clip--drag-source',
                    'lgs1920-wa-timeline__clip--drag-source-rejected',
                )
                const durationOverlay = durationOverlays.get(String(value.id))
                const isResizing = isDragging && dragState.mode === 'resize'
                element.querySelectorAll('[data-clip-handle]').forEach(handle => {
                    handle.classList.toggle(
                        'lgs1920-wa-timeline__clip-handle--resizing',
                        isResizing && handle.getAttribute('data-clip-handle') === dragState.edge,
                    )
                })
                if (durationOverlay) {
                    durationOverlay.hidden = !isResizing
                    if (isResizing) {
                        durationOverlay.textContent = `${timelineUtils.formatTime(end - start)} / ${timelineUtils.formatTime(this._durationMillis() / 1000)}`
                    }
                }
                element.classList.toggle('lgs1920-wa-timeline__clip--drop-rejected', dragState?.type === 'clip'
                    && dragState.clipId === value.id
                    && dragState.dropRejected === true)
                element.classList.toggle('lgs1920-wa-timeline__clip--drag-source-rejected', isDragging
                    && dragState.dropRejected === true)
                if (track && element.parentElement !== track) track.append(element)
            })
            if (track) {
                const isClipDropRejected = dragState?.type === 'clip'
                    && dragState.targetTrackId === row.id
                    && dragState.dropRejected === true
                const isClipDropTarget = dragState?.type === 'clip'
                    && dragState.targetTrackId === row.id
                    && !isClipDropRejected
                const trackBackground = trackBackgrounds.get(String(row.id))
                track.classList.toggle('lgs1920-wa-timeline__track--clip-drop-target', isClipDropTarget)
                track.classList.toggle('lgs1920-wa-timeline__track--clip-drop-rejected', isClipDropRejected)
                trackBackground?.classList.toggle('lgs1920-wa-timeline__track-background--clip-drop-rejected', isClipDropRejected)
                legend?.classList.toggle('lgs1920-wa-timeline__legend-row--clip-drop-target', isClipDropTarget)
                legend?.classList.toggle('lgs1920-wa-timeline__legend-row--clip-drop-rejected', isClipDropRejected)
            }
        })
        if (dragState?.external === true && dragState.previewClip && overlay) {
            const targetRow = this._rows.find(row => row.id === dragState.targetTrackId)
            const preview = this._root.querySelector('[data-clip-option-preview]') ?? this._renderer.clip(
                Object.assign({}, dragState.previewClip, {trackId: targetRow?.id ?? ''}),
                majorSeconds,
                targetRow?.visible !== false,
                targetRow?.editable !== false,
                targetRow?.clipResizable === true,
            )
            const {start, end} = resolveClipInterval(dragState.previewClip)
            preview.style.left = `${scaleOffset + ((start / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
            preview.style.width = `${Math.max(this._numericToken('clip-min-width', 8), ((end - start) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
            preview.setAttribute('data-clip-track-id', String(targetRow?.id ?? ''))
            preview.setAttribute('data-clip-option-preview', '')
            preview.style.pointerEvents = 'none'
            preview.classList.toggle('lgs1920-wa-timeline__clip--drop-rejected', dragState.dropRejected === true)
            const surfaceRect = this._surface.getBoundingClientRect()
            const rowHeight = Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight)
            preview.style.top = `${Number(dragState.previewClientY) - surfaceRect.top - (rowHeight / 2)}px`
            preview.style.bottom = 'auto'
            preview.style.height = `${rowHeight}px`
            overlay.append(preview)
        }
        if (dragState?.external !== true && dragState?.type === 'clip' && dragState.mode === 'move' && movingClip) {
            const sourceElement = clips.get(String(dragState.clipId))
            if (sourceElement && overlay) {
                const accepted = dragState.lastResult !== null && dragState.lastResult !== undefined
                const ghostClip = movingClip
                if (ghostClip) {
                    const {start, end} = resolveClipInterval(ghostClip)
                    const positionGhost = element => {
                        const surfaceRect = this._surface?.getBoundingClientRect?.()
                        const pointerY = Number(dragState.previewClientY)
                        const rowHeight = Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight)
                        element.style.left = `${scaleOffset + ((start / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                        element.style.width = `${Math.max(this._numericToken('clip-min-width', 8), ((end - start) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                        if (!surfaceRect || !Number.isFinite(pointerY)) return
                        element.style.top = `${pointerY - surfaceRect.top - (rowHeight / 2)}px`
                        element.style.bottom = 'auto'
                        element.style.height = `${rowHeight}px`
                    }
                    const configureClone = (clone, kind, clipStart, clipEnd) => {
                        clone.removeAttribute('id')
                        clone.removeAttribute('data-clip-id')
                        clone.setAttribute(`data-clip-drag-${kind}`, '')
                        clone.setAttribute('aria-hidden', 'true')
                        clone.setAttribute('tabindex', '-1')
                        clone.classList.remove(
                            'lgs1920-wa-timeline__clip--dragging',
                            'lgs1920-wa-timeline__clip--resizing',
                            'lgs1920-wa-timeline__clip--drag-ghost',
                            'lgs1920-wa-timeline__clip--drop-rejected',
                        )
                        clone.classList.add(`lgs1920-wa-timeline__clip--drag-${kind}`)
                        if (!accepted) clone.classList.add('lgs1920-wa-timeline__clip--drop-rejected')
                        clone.style.left = `${scaleOffset + ((clipStart / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                        clone.style.width = `${Math.max(this._numericToken('clip-min-width', 8), ((clipEnd - clipStart) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
                    }

                    if (accepted) {
                        sourceElement.classList.remove('lgs1920-wa-timeline__clip--dragging')
                        sourceElement.classList.add('lgs1920-wa-timeline__clip--drag-ghost')
                        positionGhost(sourceElement)
                        overlay.append(sourceElement)
                        const sourceEntry = this._clipEditor.findClipEntry(dragState.baseRows, dragState.clipId)
                        const sourceTrack = tracks.get(String(sourceEntry?.row.id))
                        if (sourceEntry && sourceTrack) {
                            const sourceClone = sourceElement.cloneNode(true)
                            const original = resolveClipInterval(sourceEntry.clip)
                            configureClone(sourceClone, 'source', original.start, original.end)
                            sourceTrack.append(sourceClone)
                            presentation.dragElements.add(sourceClone)
                        }
                    } else {
                        const ghost = sourceElement.cloneNode(true)
                        configureClone(ghost, 'ghost', start, end)
                        positionGhost(ghost)
                        overlay.append(ghost)
                        presentation.dragElements.add(ghost)
                    }
                }
            }
        }
        this._updateDynamicState()
        this._updateClipCopyPresentation()
    }

    /**
     * Update the editing surface while playback is active without rebuilding it.
     */
    _updatePlaybackEditingPresentation = () => {
        const surface = this._surface ?? this._root.querySelector('[data-surface]')
        if (surface) {
            surface.classList.toggle('lgs1920-wa-timeline__surface--read-only', this._isReadonlyMode())
            surface.setAttribute('aria-readonly', String(this._isReadonlyMode()))
        }
        const playbackLock = this._playing && !this.readonly
        const actionButtons = [
            this._root.querySelector('[data-testid="lgs1920-wa-add-track"]'),
            this._root.querySelector('[data-testid="lgs1920-wa-add-clip"]'),
        ].filter(Boolean)
        actionButtons.forEach(element => {
            element.hidden = playbackLock
            element.setAttribute('aria-disabled', String(playbackLock))
        })
    }

    /**
     * Update the existing play/pause control without rebuilding the timeline.
     */
    _updatePlaybackButton = () => {
        const button = this._dynamicElements?.playbackButton
        if (!button) return
        const label = this._playing ? 'Pause timeline' : 'Play timeline'
        button.setAttribute('aria-label', label)
        button.setAttribute('title', label)
        button.replaceChildren(this._slotWithFallback(
            this._playing ? 'pause-icon' : 'play-icon',
            timelineUtils.createIcon(this._playing ? 'pause' : 'play', 'solid'),
        ))
    }

    /**
     * Update the loop-mode button without rebuilding the timeline.
     *
     * @param {Object} [elements] - Cached dynamic elements.
     */
    _updateLoopButton = (elements = this._dynamicElements) => {
        const button = elements?.loopButton
        if (!button) return
        const label = this._looping ? 'Disable loop mode' : 'Enable loop mode'
        const tooltip = button.parentElement?.querySelector(`wa-tooltip[for="${button.id}"]`)
        button.setAttribute('aria-label', label)
        button.setAttribute('title', label)
        button.setAttribute('variant', this._looping ? 'brand' : 'neutral')
        button.setAttribute('aria-pressed', String(this._looping))
        if (tooltip) tooltip.textContent = label
        button.replaceChildren(this._slotWithFallback('loop-icon', timelineUtils.createIcon('repeat', 'solid')))
    }

    /**
     * Emit the canonical component event.
     *
     * @param {string} name - Event suffix.
     * @param {Object} detail - Event detail payload.
     */
    _emit = (name, detail, options) => {
        const event = timelineUtils.createEvent(`lgs1920-timeline-${name}`, detail, options)
        this.dispatchEvent(event)
        return event
    }

    /**
     * Run cancelable pre-action handlers without publishing another DOM event.
     *
     * @param {string} name - Action name.
     * @param {Object} detail - Action detail.
     * @returns {CustomEvent} Lifecycle event passed to the handlers.
     */
    _emitBefore = (name, detail) => {
        const event = timelineUtils.createEvent(`${TIMELINE_EVENT_PREFIX}${name}`, detail, {cancelable: true})
        this._lifecycleHandlers.get(name)?.before.forEach(handler => handler(event))
        return event
    }

    /**
     * Run post-action handlers without publishing another DOM event.
     *
     * @param {string} name - Action name.
     * @param {Object} detail - Action detail.
     * @returns {CustomEvent} Lifecycle event passed to the handlers.
     */
    _emitAfter = (name, detail) => {
        const event = timelineUtils.createEvent(`${TIMELINE_EVENT_PREFIX}${name}`, detail)
        this._lifecycleHandlers.get(name)?.after.forEach(handler => handler(event))
        return event
    }

    /**
     * Emit a complete lifecycle for an action that has no internal state step.
     *
     * @param {string} name - Action name.
     * @param {Object} detail - Action detail.
     * @returns {boolean} Whether the action was accepted.
     */
    _emitAction = (name, detail) => {
        const before = this._emitBefore(name, detail)
        if (before.defaultPrevented) return false
        this._emit(name, detail)
        this._emitAfter(name, detail)
        return true
    }
}
