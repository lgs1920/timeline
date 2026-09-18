/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineTrackInteraction.js
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

/**
 * Install delegated interaction handlers for all rendered track rows.
 *
 * @param {Object} options - Interaction dependencies.
 * @returns {void}
 */
export const installTimelineTrackEventDelegation = ({
    tracks,
    interactive,
    editable,
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
    isCutMode,
    previewCut,
    clearCutPreview,
    cancelCutMode,
    commitCut,
    emit,
    emitBefore,
    emitAfter,
}) => {
    const clipContext = element => {
        const clipId = element?.getAttribute?.('data-clip-id')
        const rowId = element?.getAttribute?.('data-clip-track-id')
        if (clipId === null || rowId === null) return null
        const row = getRows().find(value => String(value.id) === String(rowId))
        const sourceClip = row?.actions?.find(value => String(value.id) === String(clipId))
        if (!row || !sourceClip) return null
        const value = Object.assign({}, sourceClip, {trackId: row.id})
        const timeline = getTimelineConfig()
        const selectable = interactive && value.selectable !== false
        const clipEditable = timeline.readonly !== true && timeline.editable !== false && value.editable !== false
        return {
            element,
            row,
            value,
            selectable,
            movable: selectable && clipEditable && row.editable !== false,
            resizable: selectable && clipEditable && value.resizable !== false
                && (row.editable !== false || row.clipResizable === true),
            cuttable: selectable && clipEditable && row.editable !== false,
        }
    }

    const findTrack = target => target?.closest?.('[part="track"]')
    const findRow = target => {
        const track = findTrack(target)
        const row = track
            ? getRows().find(value => String(value.id) === String(track.getAttribute('data-row-id')))
            : null
        return row ? {row, track} : null
    }

    if (interactive) {
        tracks.addEventListener('dragover', event => {
            const context = findRow(event.target)
            if (context) handleClipDragOver(event, context.row.id, context.track)
        })
        tracks.addEventListener('dragleave', event => {
            const context = findRow(event.target)
            if (context) handleClipDragLeave(event, context.track)
        })
        tracks.addEventListener('drop', event => {
            const context = findRow(event.target)
            if (context) handleClipDrop(event, context.row.id, context.track)
        })
    }
    if (interactive && editable) {
        tracks.addEventListener('contextmenu', event => {
            const clip = clipContext(event.target?.closest?.('[data-clip-id]'))
            if (clip?.movable) {
                event.preventDefault()
                event.stopPropagation()
                selectClip(clip.value, event, clip.element)
                openClipContextMenu(clip.value, event)
                return
            }
            const context = findRow(event.target)
            if (!context || context.row.editable === false) return
            event.preventDefault()
            event.stopPropagation()
            openTrackContextMenu(context.row, event)
        })
    }
    tracks.addEventListener('pointerdown', event => {
        if (isCutMode()) {
            const context = clipContext(event.target?.closest?.('[data-clip-id]'))
            event.preventDefault()
            event.stopPropagation()
            if (context?.cuttable) commitCut(context.value.id, event)
            else if (!context) {
                clearCutPreview()
                cancelCutMode()
            } else clearCutPreview()
            return
        }
        const handle = event.target?.closest?.('[data-clip-handle]')
        const clip = clipContext(handle?.closest?.('[data-clip-id]'))
        if (handle && clip?.resizable) {
            if (event.button !== 0) return
            selectClip(clip.value, event, clip.element)
            startClipInteraction(event, clip.value.id, 'resize', handle.getAttribute('data-clip-handle'))
            return
        }
        const context = clipContext(event.target?.closest?.('[data-clip-id]'))
        if (!context?.selectable || event.button !== 0 || handle) return
        const wasSelected = isClipSelected(context.value)
        selectClip(context.value, event, context.element)
        if (context.movable) startClipInteraction(event, context.value.id, 'move', null, wasSelected)
    })
    tracks.addEventListener('click', event => {
        if (isCutMode()) {
            event.preventDefault()
            event.stopPropagation()
            return
        }
        if (event.target?.closest?.('[data-clip-id]')) event.stopPropagation()
    })
    tracks.addEventListener('pointermove', event => {
        if (!isCutMode()) return
        const context = clipContext(event.target?.closest?.('[data-clip-id]'))
        if (context?.cuttable) previewCut(context.value.id, event)
        else clearCutPreview()
    })
    tracks.addEventListener('pointerleave', () => {
        if (isCutMode()) clearCutPreview()
    })
    tracks.addEventListener('dblclick', event => {
        const context = clipContext(event.target?.closest?.('[data-clip-id]'))
        if (!context?.selectable) return
        const detail = {
            clip: context.value,
            context: {type: 'clip', trackId: context.value.trackId ?? null, clipId: context.value.id},
            event,
        }
        if (emitBefore('dblclick', detail).defaultPrevented) return
        emit('dblclick', detail)
        emitAfter('dblclick', detail)
    })
    tracks.addEventListener('keydown', event => {
        const handle = event.target?.closest?.('[data-clip-handle]')
        const handleClip = clipContext(handle?.closest?.('[data-clip-id]'))
        if (handle && handleClip?.resizable) {
            resizeClipByKeyboard(handleClip.value.id, handle.getAttribute('data-clip-handle'), event)
            return
        }
        const context = clipContext(event.target?.closest?.('[data-clip-id]'))
        if (!context?.selectable) return
        if (!context.movable) {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault()
                selectClip(context.value, event, context.element)
            }
            return
        }
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey
            && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            if (!isClipSelected(context.value)) selectClip(context.value, event, context.element)
            moveClipByKeyboard(context.value.id, event)
            return
        }
        if (['Backspace', 'Delete'].includes(event.key)) {
            removeClip(context.value.id, event)
            return
        }
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
            && ['c', 'd'].includes(event.key.toLowerCase())) {
            duplicateClip(context.value.id, event)
            return
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'm') {
            toggleClipVisibility(context.value.id, event)
            return
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v') {
            toggleClipEnabled(context.value.id, event)
        }
    })
}
