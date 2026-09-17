/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineRendering.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-14
 * Last modified: 2026-09-17
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import {installTimelineTrackEventDelegation} from './timelineTrackInteraction.js'

/**
 * Create the timeline visual renderer.
 *
 * @param {Object} options - Renderer dependencies.
 * @returns {Object} Rendering operations.
 */
export const createTimelineRenderer = ({
    createElement,
    createIcon,
    formatRulerTime,
    resolveColorClasses,
    applyTimelinePaletteStyles,
    resolveRowLabel,
    resolveClipLabel,
    resolveClipIcon,
    numericToken,
    getTimelineConfig,
    allowsHostInteraction,
    getRows,
    getDragState,
    getEditingRowId,
    getEditingLabelValue,
    setEditingLabelValue,
    getRangeStartMillis,
    getRangeEndMillis,
    getCurrentTimeMillis,
    getDurationMillis,
    getContentWidth,
    getZoom,
    isClipSelected,
    contextualSlot,
    hasContextualSlot,
    globalSlotContent,
    removeClip,
    duplicateClip,
    toggleClipEnabled,
    toggleClipVisibility,
    selectClip,
    openClipContextMenu,
    openTrackContextMenu,
    beginTrackLabelEdit,
    commitTrackLabelEdit,
    cancelTrackLabelEdit,
    startRowDrag,
    handleClipDragOver,
    handleClipDragLeave,
    handleClipDrop,
    startClipInteraction,
    moveClipByKeyboard,
    resizeClipByKeyboard,
    startRangeInteraction,
    setRangeBoundaryToLimit,
    moveRangeByKeyboard,
    startPlayheadInteraction,
    movePlayheadByKeyboard,
    seek,
    addPointerListeners,
    capturePointer,
    handleWheel,
    handleKeyDown,
    handleRulerPointerDown,
    handleRulerClick,
    emit,
    emitBefore = () => ({defaultPrevented: false}),
    emitAfter = () => {},
    setScrubPointerId,
    scaleWidth,
    scaleOffset,
}) => {
    /**
     * Check whether an event originated in the application-provided ruler slot.
     *
     * @param {Event} event - Native event to inspect.
     * @returns {boolean} Whether the event belongs to the ruler slot.
     */
    const isTimelineRulerSlotEvent = event => (typeof event.composedPath === 'function'
        ? event.composedPath()
        : []).some(target => ['timeline-ruler', 'time-slider'].includes(target?.getAttribute?.('slot')))

    /**
     * Check whether an event belongs to one of the timeline's own controls.
     *
     * @param {Event} event - Native event to inspect.
     * @returns {boolean} Whether the event belongs to a timeline control.
     */
    const isTimelineControlEvent = event => event.target?.closest?.(
        '[data-timeline-time-slider], [data-timeline-zoom-slider], [part="timeline-scrubber"]',
    )

    /**
     * Create one visual timeline clip.
     *
     * @param {Object} value - Timeline clip.
     * @param {number} majorSeconds - Seconds represented by one ruler unit.
     * @param {boolean} trackVisible - Whether the owning track is visible.
     * @returns {HTMLElement} Clip element.
     */
    const clip = (value, majorSeconds, trackVisible = true, trackEditable = true, trackClipResizable = false) => {
        const start = Math.max(0, Number(value.start) || 0)
        const end = Math.max(start, Number(value.end) || start)
        const dragState = getDragState()
        const isDragging = dragState?.type === 'clip' && dragState.pending !== true && dragState.clipId === value.id
        const isResizing = isDragging && dragState.mode === 'resize'
        const hostNoDragClass = String(getTimelineConfig().hostNoDragClass ?? '').trim()
        const hostNoDragClasses = hostNoDragClass ? ` ${hostNoDragClass}` : ''
        const selected = isClipSelected(value)
        const element = createElement('div', `lgs1920-wa-timeline__clip${hostNoDragClasses} ${resolveColorClasses(value.colorClasses)}${value.visible === false ? ' lgs1920-wa-timeline__clip--hidden' : ''}${value.enabled === false ? ' lgs1920-wa-timeline__clip--disabled' : ''}${trackVisible === false ? ' lgs1920-wa-timeline__clip--track-hidden' : ''}${selected ? ' lgs1920-wa-timeline__clip--selected' : ''}${isDragging ? ' lgs1920-wa-timeline__clip--dragging' : ''}${isResizing ? ' lgs1920-wa-timeline__clip--resizing' : ''}`, {
            part: 'clip',
            id: `lgs1920-timeline-clip-${String(value.id ?? '')}`,
            'data-clip-id': value.id,
            'data-clip-track-id': value.trackId,
            'data-clip-kind': value.kind,
            'aria-label': resolveClipLabel(value),
            'aria-disabled': value.enabled === false ? 'true' : null,
            'aria-selected': selected ? 'true' : 'false',
        })
        applyTimelinePaletteStyles(element, value.colorClasses, value.timelineColor)
        const timeline = getTimelineConfig()
        const readonly = timeline.readonly === true
        const interactive = timeline.interactive !== false && !readonly
        const selectable = interactive && value.selectable !== false
        const editable = !readonly && timeline.editable !== false && value.editable !== false
        const movable = selectable && editable && trackEditable !== false
        const resizable = selectable && editable && value.resizable !== false
            && (trackEditable !== false || trackClipResizable === true)
        if (movable) element.classList.add('lgs1920-wa-timeline__clip--movable')
        element.setAttribute('tabindex', selectable ? '0' : '-1')
        if (selectable) {
            element.setAttribute('role', 'button')
            if (movable) element.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Alt+ArrowLeft Alt+ArrowRight Delete Backspace Mod+C Mod+D M V')
        }
        element.style.left = `${scaleOffset() + ((start / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth())}px`
        element.style.width = `${Math.max(numericToken('clip-min-width', 8), ((end - start) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth())}px`
        const preview = createElement('span', 'lgs1920-wa-timeline__clip-preview', {part: 'clip-preview'})
        preview.append(
            contextualSlot('clip-icon', value.id, 'clip-icon', createIcon(resolveClipIcon(value), 'solid')),
            contextualSlot('clip-label', value.id, 'clip-label', document.createTextNode(resolveClipLabel(value))),
        )
        element.append(
            clipHandle(value, 'start', resizable, start, end),
            contextualSlot('clip-content', value.id, ['clip-content'], preview),
            clipHandle(value, 'end', resizable, start, end),
            createElement('span', 'lgs1920-wa-timeline__clip-duration-overlay', {
                part: 'clip-duration-overlay',
                'data-clip-duration-overlay': '',
                'aria-hidden': 'true',
                hidden: true,
            }),
        )
        return element
    }

    /**
     * Create one major ruler unit and its minor subdivisions.
     *
     * @param {number} index - Major ruler unit index.
     * @param {number} majorSeconds - Seconds represented by one major unit.
     * @param {number} scaleSplitCount - Minor ruler subdivision count.
     * @returns {DocumentFragment} Ruler unit elements.
     */
    const rulerUnit = (index, majorSeconds, scaleSplitCount) => {
        const fragment = document.createDocumentFragment()
        for (let split = 1; split < scaleSplitCount; split += 1) {
            const minor = createElement('span', 'lgs1920-wa-timeline__minor-tick', {
                part: 'minor-tick',
                'data-ruler-index': index,
            })
            minor.style.left = `${scaleOffset() + ((index + (split / scaleSplitCount)) * scaleWidth())}px`
            fragment.append(minor)
        }
        const tick = createElement('span', `lgs1920-wa-timeline__tick${index === 0 ? ' lgs1920-wa-timeline__tick--origin' : ''}`, {
            part: 'tick',
            'data-ruler-index': index,
        })
        tick.style.left = `${scaleOffset() + (index * scaleWidth())}px`
        tick.append(contextualSlot('scale-label', index, 'scale-label', document.createTextNode(formatRulerTime(index * majorSeconds, majorSeconds))))
        fragment.append(tick)
        return fragment
    }

    /**
     * Extend or trim ruler units without replacing the active timeline DOM.
     *
     * @param {HTMLElement} ruler - Timeline ruler element.
     * @param {number} scaleCount - Number of major ruler units.
     * @param {number} majorSeconds - Seconds represented by one major unit.
     * @param {number} scaleSplitCount - Minor ruler subdivision count.
     */
    const updateRulerDuration = (ruler, scaleCount, majorSeconds, scaleSplitCount) => {
        if (!ruler) return
        ruler.querySelectorAll('[part="tick"], [part="minor-tick"]').forEach(element => {
            if (Number(element.dataset.rulerIndex) > scaleCount) element.remove()
        })
        const indexes = [...ruler.querySelectorAll('[part="tick"]')]
            .map(element => Number(element.dataset.rulerIndex))
            .filter(Number.isFinite)
        const currentScaleCount = indexes.length > 0 ? Math.max(...indexes) : -1
        const insertionPoint = ruler.querySelector('[data-timeline-ruler-insertion-point]')
        if (!insertionPoint) return
        for (let index = currentScaleCount + 1; index <= scaleCount; index += 1) {
            insertionPoint.before(rulerUnit(index, majorSeconds, scaleSplitCount))
        }
    }

    /**
     * Create a clip edge handle with a contextual slot and keyboard support.
     *
     * @param {Object} value - Timeline clip.
     * @param {'start'|'end'} edge - Clip edge.
     * @param {boolean} enabled - Whether resizing is enabled.
     * @param {number} start - Normalized clip start in seconds.
     * @param {number} end - Normalized clip end in seconds.
     * @returns {HTMLElement} Clip handle.
     */
    const clipHandle = (value, edge, enabled, start, end) => {
        const startMillis = Math.max(0, start * 1000)
        const endMillis = Math.max(startMillis, end * 1000)
        const durationMillis = Math.max(endMillis, Number(getDurationMillis()) || 0)
        const isStart = edge === 'start'
        const handle = createElement('span', `lgs1920-wa-timeline__clip-handle lgs1920-wa-timeline__clip-handle--${edge}`, {
            part: `clip-${edge}-handle`,
            'data-clip-handle': edge,
            'aria-label': `${edge === 'start' ? 'Start' : 'End'} of ${resolveClipLabel(value)}`,
            role: 'slider',
            tabindex: enabled ? 0 : -1,
            'aria-hidden': enabled ? null : 'true',
            'aria-valuemin': isStart ? 0 : startMillis,
            'aria-valuemax': isStart ? endMillis : durationMillis,
            'aria-valuenow': isStart ? startMillis : endMillis,
            'aria-keyshortcuts': enabled ? 'ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight' : null,
        })
        if (getTimelineConfig().readonly !== true) {
            handle.append(contextualSlot(`clip-${edge}-handle`, value.id, `clip-${edge}-handle`, createIcon('grip-lines-vertical', 'solid')))
        }
        return handle
    }

    /**
     * Create a draggable video range boundary handle.
     *
     * @param {'start'|'end'} edge - Range boundary.
     * @returns {HTMLElement} Range handle.
     */
    const rangeHandle = edge => {
        const isStart = edge === 'start'
        const timeMillis = isStart ? getRangeStartMillis() : getRangeEndMillis()
        const timeline = getTimelineConfig()
        const interactive = timeline.interactive !== false && timeline.readonly !== true
        const enabled = interactive && timeline.editable !== false
        const handle = createElement('div', `lgs1920-wa-timeline__range-handle lgs1920-wa-timeline__range-handle--${edge}`, {
            part: `timeline-${edge}-handle`,
            'data-range-handle': edge,
            role: 'slider',
            tabindex: enabled ? 0 : -1,
            'aria-disabled': enabled ? null : 'true',
            'aria-label': `${isStart ? 'Video start' : 'Video end'} position`,
            'aria-valuemin': 0,
            'aria-valuemax': getDurationMillis(),
            'aria-valuenow': timeMillis,
        })
        const grip = createElement('span', 'lgs1920-wa-timeline__range-grip', {part: `timeline-${edge}-grip`})
        if (enabled) grip.append(...globalSlotContent(`timeline-${edge}-handle`, createIcon('grip-dots-vertical', 'solid')))
        handle.append(grip)
        if (enabled) {
            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) return
                startRangeInteraction(event, edge)
            })
            handle.addEventListener('keydown', event => moveRangeByKeyboard(edge, event))
            handle.addEventListener('dblclick', event => setRangeBoundaryToLimit(edge, event))
        }
        return handle
    }

    /**
     * Create one track legend row.
     *
     * @param {Object} row - Timeline row.
     * @returns {HTMLElement} Legend row.
     */
    const legendRow = row => {
        const timeline = getTimelineConfig()
        const readonly = timeline.readonly === true
        const interactive = timeline.interactive !== false && !readonly
        const editable = interactive && timeline.editable !== false && row.editable !== false
        const titleDisabled = row.visible === false || (!readonly && !editable)
        const titleEditable = editable && row.visible !== false
        const readOnly = !readonly && row.editable === false
        const label = resolveRowLabel(row)
        const dragState = getDragState()
        const isClipDropRejected = dragState?.type === 'clip'
            && dragState.targetTrackId === row.id
            && dragState.dropRejected === true
        const isClipDropTarget = dragState?.type === 'clip'
            && dragState.targetTrackId === row.id
            && !isClipDropRejected
        const isRejectedRow = dragState?.type === 'row'
            && dragState.rowId === row.id
            && dragState.dropRejected === true
        const hostNoDragClass = String(timeline.hostNoDragClass ?? '').trim()
        const hostNoDragClasses = hostNoDragClass ? ` ${hostNoDragClass}` : ''
        const element = createElement('div', `lgs1920-wa-timeline__legend-row ${resolveColorClasses(row.colorClasses)}${readOnly ? ' lgs1920-wa-timeline__legend-row--read-only' : hostNoDragClasses}${row.visible === false ? ' lgs1920-wa-timeline__legend-row--hidden' : ''}${titleDisabled ? ' lgs1920-wa-timeline__legend-row--title-disabled' : ''}${editable ? ' lgs1920-wa-timeline__legend-row--movable' : ''}${dragState?.rowId === row.id ? ' lgs1920-wa-timeline__legend-row--dragging' : ''}${isClipDropTarget ? ' lgs1920-wa-timeline__legend-row--clip-drop-target' : ''}${isClipDropRejected ? ' lgs1920-wa-timeline__legend-row--clip-drop-rejected' : ''}`, {
            part: 'legend-row',
            id: `lgs1920-timeline-track-${String(row.id ?? '')}`,
            'data-row-id': row.id,
            'aria-label': label,
        })
        if (isRejectedRow) element.classList.add('lgs1920-wa-timeline__legend-row--drop-rejected')
        element.style.height = 'var(--lgs-timeline-row-height)'
        const labelPrefix = hasContextualSlot('name', row.id) ? 'name' : 'track-label'
        const editing = getEditingRowId() === row.id && titleEditable
        const labelElement = editing
            ? createElement('wa-input', 'lgs1920-wa-timeline__label-editor', {
                size: 's',
                value: getEditingLabelValue(),
                'aria-label': `Edit ${label}`,
                'data-edit-row-id': row.id,
                name: 'label',
            })
            : contextualSlot(labelPrefix, row.id, ['name', 'track-label'], document.createTextNode(label))
        const trackContent = createElement(editing ? 'form' : 'span', `lgs1920-wa-timeline__track-content${titleDisabled ? ' lgs1920-wa-timeline__track-content--title-disabled' : ''}`, {
            part: 'legend-content',
            'aria-disabled': titleDisabled ? 'true' : null,
            'data-track-label-form': editing ? row.id : null,
            novalidate: editing,
        })
        if (editing) {
            const readEditorValue = source => {
                const editor = source?.getAttribute?.('data-edit-row-id') !== null ? source : labelElement
                return editor?.shadowRoot?.querySelector?.('input')?.value ?? editor?.value ?? ''
            }
            const updateEditorValue = event => setEditingLabelValue(String(readEditorValue(event?.currentTarget ?? event?.target)))
            const commitEditor = event => {
                event.preventDefault()
                event.stopPropagation()
                updateEditorValue(event)
                commitTrackLabelEdit(event)
            }
            const requestEditorSubmit = event => {
                event.preventDefault()
                event.stopPropagation()
                updateEditorValue(event)
                if (typeof trackContent.requestSubmit === 'function') trackContent.requestSubmit()
                else commitEditor(event)
            }
            const handleEditorKeyDown = event => {
                if (event.key === 'Enter') {
                    requestEditorSubmit(event)
                    return
                }
                if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    cancelTrackLabelEdit()
                }
            }
            trackContent.addEventListener('submit', commitEditor)
            labelElement.addEventListener('input', updateEditorValue)
            labelElement.addEventListener('change', commitEditor)
            labelElement.addEventListener('blur', commitEditor)
            labelElement.addEventListener('keydown', handleEditorKeyDown)
            labelElement.updateComplete?.then(() => {
                const nativeInput = labelElement.shadowRoot?.querySelector('input')
                if (!nativeInput) return
                nativeInput.addEventListener('input', updateEditorValue)
                nativeInput.addEventListener('keydown', handleEditorKeyDown)
                nativeInput.addEventListener('change', commitEditor)
                nativeInput.addEventListener('blur', commitEditor)
            })
        }
        trackContent.append(labelElement)
        if (titleEditable) {
            trackContent.addEventListener('dblclick', event => {
                // Once the editor is open, let the native input handle double-click
                // word selection instead of restarting the edit and preventing it.
                if (editing && (event.target?.closest?.('wa-input') || event.composedPath?.().includes(labelElement))) return
                event.preventDefault()
                event.stopPropagation()
                beginTrackLabelEdit(row)
            })
        }
        if (editable) {
            trackContent.addEventListener('pointerdown', event => {
                if (event.button !== 0 || event.target?.closest?.('wa-input')) return
                event.stopPropagation()
                startRowDrag(event, row.id)
            })
        }
        if (editable) {
            element.addEventListener('contextmenu', event => {
                if (event.target?.closest?.('wa-input')) return
                event.preventDefault()
                event.stopPropagation()
                openTrackContextMenu(row, event)
            })
        }
        // Track actions are exposed from the context menu. Keep the legend row
        // focused on its label.
        element.append(trackContent)
        return element
    }

    /**
     * Refresh only the legend rows and track rows while preserving the timeline shell.
     *
     * @param {Object} elements - Existing row containers.
     * @param {HTMLElement} elements.legendRows - Legend row container.
     * @param {HTMLElement} elements.tracks - Track row container.
     * @param {number} elements.majorSeconds - Seconds represented by one ruler unit.
     * @returns {boolean} Whether the row containers were refreshed.
     */
    const trackElement = (row, majorSeconds) => {
        const timeline = getTimelineConfig()
        const readonly = timeline.readonly === true
        const dragState = getDragState()
        const isClipDropRejected = dragState?.type === 'clip'
            && dragState.targetTrackId === row.id
            && dragState.dropRejected === true
        const isClipDropTarget = dragState?.type === 'clip'
            && dragState.targetTrackId === row.id
            && !isClipDropRejected
        const isRejectedRow = dragState?.type === 'row'
            && dragState.rowId === row.id
            && dragState.dropRejected === true
        const trackReadOnly = !readonly && row.editable === false
        const track = createElement('div', `lgs1920-wa-timeline__track${trackReadOnly ? ' lgs1920-wa-timeline__track--read-only' : ''}${row.visible === false ? ' lgs1920-wa-timeline__track--hidden' : ''}${dragState?.type === 'row' && dragState.rowId === row.id ? ' lgs1920-wa-timeline__track--dragging' : ''}${isRejectedRow ? ' lgs1920-wa-timeline__track--drop-rejected' : ''}${isClipDropTarget ? ' lgs1920-wa-timeline__track--clip-drop-target' : ''}${isClipDropRejected ? ' lgs1920-wa-timeline__track--clip-drop-rejected' : ''}`, {part: 'track', 'data-row-id': row.id})
        track.style.height = 'var(--lgs-timeline-row-height)'
        const trackBackground = createElement('div', `lgs1920-wa-timeline__track-background${trackReadOnly ? ' lgs1920-wa-timeline__track-background--read-only' : ''}${row.visible === false ? ' lgs1920-wa-timeline__track-background--hidden' : ''}${isClipDropRejected ? ' lgs1920-wa-timeline__track-background--clip-drop-rejected' : ''}`, {
            part: 'track-background',
            'data-row-id': row.id,
            'aria-hidden': 'true',
        })
        track.append(trackBackground)
        for (const value of row.actions ?? []) {
            track.append(clip(Object.assign({}, value, {trackId: row.id}), majorSeconds, row.visible !== false, row.editable !== false, row.clipResizable === true))
        }
        return track
    }

    const updateRows = ({legendRows, tracks, majorSeconds} = {}) => {
        if (!legendRows || !tracks) return false
        legendRows.replaceChildren(...getRows().map(row => legendRow(row)))
        tracks.replaceChildren(...getRows().map(row => trackElement(row, majorSeconds)))
        return true
    }

    /**
     * Create the ruler, tracks, playhead, and end marker surface.
     *
     * @param {number} scaleCount - Number of major ruler units.
     * @param {number} majorSeconds - Seconds represented by one major unit.
     * @param {number} scaleSplitCount - Minor ruler subdivision count.
     * @returns {HTMLElement} Timeline surface.
     */
    const surfaceElement = (scaleCount, majorSeconds, scaleSplitCount) => {
        const timeline = getTimelineConfig()
        const readonly = timeline.readonly === true
        const interactive = timeline.interactive !== false && !readonly
        const playheadInteractive = timeline.interactive !== false
        const hostNoDragClass = String(timeline.hostNoDragClass ?? '').trim()
        const hostNoDragClasses = hostNoDragClass ? ` ${hostNoDragClass}` : ''
        const surface = createElement('wa-card', `lgs1920-wa-timeline__surface${interactive ? '' : ' lgs1920-wa-timeline__surface--read-only'}${hostNoDragClasses}`, {
            part: 'surface',
            appearance: 'plain',
            'data-surface': '',
            tabindex: interactive ? 0 : -1,
            role: 'group',
            'aria-label': 'Timeline time scale and scrubbing',
            'data-zoom-percent': getZoom(),
        })
        const canvas = createElement('div', 'lgs1920-wa-timeline__canvas', {part: 'canvas'})
        canvas.style.width = `${getContentWidth()}px`
        const ruler = createElement('div', 'lgs1920-wa-timeline__ruler', {part: 'ruler'})
        ruler.style.width = `${getContentWidth()}px`
        ruler.append(createElement('div', 'lgs1920-wa-timeline__range-selection', {
            part: 'range-selection',
            'data-range-selection': '',
            'aria-hidden': 'true',
        }))
        for (let index = 0; index <= scaleCount; index += 1) ruler.append(rulerUnit(index, majorSeconds, scaleSplitCount))
        ruler.append(
            createElement('span', '', {
                'data-timeline-ruler-insertion-point': '',
                'aria-hidden': 'true',
            }),
            createElement('div', 'lgs1920-wa-timeline__clip-edge-indicator', {
                part: 'clip-edge-indicator',
                'data-clip-edge-indicator': '',
                'aria-hidden': 'true',
                hidden: true,
            }),
            createElement('div', 'lgs1920-wa-timeline__clip-move-endpoint lgs1920-wa-timeline__clip-move-endpoint--start', {
                part: 'clip-move-start-endpoint',
                'data-clip-move-endpoint': 'start',
                'aria-hidden': 'true',
                hidden: true,
            }),
            createElement('div', 'lgs1920-wa-timeline__clip-move-endpoint lgs1920-wa-timeline__clip-move-endpoint--end', {
                part: 'clip-move-end-endpoint',
                'data-clip-move-endpoint': 'end',
                'aria-hidden': 'true',
                hidden: true,
            }),
        )
        const tracks = createElement('div', 'lgs1920-wa-timeline__tracks', {part: 'tracks'})
        tracks.style.width = `${getContentWidth()}px`
        getRows().forEach(row => tracks.append(trackElement(row, majorSeconds)))
        installTimelineTrackEventDelegation({
            tracks,
            interactive,
            editable: timeline.editable !== false,
            getRows,
            getTimelineConfig,
            isClipSelected,
            removeClip,
            duplicateClip,
            toggleClipEnabled,
            toggleClipVisibility,
            selectClip,
            openClipContextMenu,
            openTrackContextMenu,
            handleClipDragOver,
            handleClipDragLeave,
            handleClipDrop,
            startClipInteraction,
            moveClipByKeyboard,
            resizeClipByKeyboard,
            emit,
            emitBefore,
            emitAfter,
        })
        const tracksViewport = createElement('div', 'lgs1920-wa-timeline__tracks-viewport', {
            part: 'tracks-viewport',
            'data-tracks-viewport': '',
            'data-scroll-view': 'tracks',
        })
        tracksViewport.style.width = `${getContentWidth()}px`
        const playhead = createElement('div', 'lgs1920-wa-timeline__playhead', {
            part: 'playhead',
            'data-playhead': '',
            role: 'slider',
            tabindex: playheadInteractive ? 0 : -1,
            'aria-disabled': playheadInteractive ? null : 'true',
            'aria-label': 'Current timeline position',
            'aria-valuemin': getRangeStartMillis(),
            'aria-valuemax': getRangeEndMillis(),
            'aria-valuenow': getCurrentTimeMillis(),
        })
        const playheadGrip = createElement('span', 'lgs1920-wa-timeline__playhead-grip', {part: 'playhead-grip'})
        if (playheadInteractive) playheadGrip.append(createIcon('grip-dots-vertical', 'solid'))
        playhead.append(playheadGrip)
        if (playheadInteractive) {
            playheadGrip.addEventListener('pointerdown', event => startPlayheadInteraction(event))
            playhead.addEventListener('keydown', event => movePlayheadByKeyboard(event))
        }
        const overlay = createElement('div', 'lgs1920-wa-timeline__overlay', {part: 'overlay', 'data-overlay': ''})
        overlay.append(
            createElement('div', 'lgs1920-wa-timeline__clip-snap-guide', {
                part: 'clip-snap-guide',
                'data-clip-snap-guide': '',
                'aria-hidden': 'true',
                hidden: true,
            }),
            rangeHandle('start'),
            rangeHandle('end'),
            playhead,
            createElement('div', 'lgs1920-wa-timeline__end-marker', {part: 'end-marker', 'data-end-marker': ''}),
        )
        tracksViewport.append(tracks)
        canvas.append(ruler, tracksViewport, overlay)
        surface.append(createElement('slot', '', {name: 'timeline-ruler'}), canvas)
        if (interactive) {
            ruler.addEventListener('pointerdown', event => handleRulerPointerDown(event))
            ruler.addEventListener('click', event => handleRulerClick(event))
            surface.addEventListener('pointerdown', event => {
                if (isTimelineRulerSlotEvent(event) || isTimelineControlEvent(event)) return
                if (event.button !== 0 || event.target.closest('.lgs1920-wa-timeline__clip')) return
                if (event.target.closest('[data-range-handle], [data-playhead]')) return
                const rangeHandle = [...overlay.querySelectorAll('[data-range-handle]')]
                    .map(handle => ({
                        handle,
                        distance: Math.abs(event.clientX - (handle.getBoundingClientRect().left + (handle.getBoundingClientRect().width / 2))),
                    }))
                    .sort((left, right) => left.distance - right.distance)[0]
                if (!rangeHandle || rangeHandle.distance > 8) return
                event.preventDefault()
                event.stopImmediatePropagation()
                startRangeInteraction(event, rangeHandle.handle.getAttribute('data-range-handle'))
            }, true)
            surface.addEventListener('click', event => {
                if (isTimelineRulerSlotEvent(event) || isTimelineControlEvent(event)) return
                if (event.target.closest('.lgs1920-wa-timeline__clip, [data-range-handle], [data-playhead]')) return
                seek(event.clientX, true)
            })
            surface.addEventListener('wheel', event => handleWheel(event))
            surface.addEventListener('keydown', event => handleKeyDown(event))
            surface.addEventListener('pointerdown', event => {
                if (isTimelineRulerSlotEvent(event) || isTimelineControlEvent(event)) return
                if (event.button !== 0 || event.target.closest('.lgs1920-wa-timeline__clip')) return
                if (allowsHostInteraction()) return
                setScrubPointerId(event.pointerId)
                capturePointer(event)
                addPointerListeners()
                seek(event.clientX, false)
            })
        }
        return {surface}
    }

    return {clip, clipHandle, legendRow, rangeHandle, surfaceElement, updateRulerDuration, updateRows}
}
