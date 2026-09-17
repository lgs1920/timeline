/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineSelection.js
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

/**
 * Create clip-selection state operations.
 *
 * Selection is kept separate from rendering and editing so a controlled
 * rerender can reconcile it without mixing selection policy with DOM layout.
 *
 * @param {Object} options - Selection dependencies.
 * @returns {Object} Selection operations.
 */
export const createTimelineSelection = ({
    getRoot,
    getRows,
    getSelectedKey,
    setSelectedKey,
    findClipEntry,
    getClipContextMenuClipId,
    getTrackContextMenuTrackId,
    closeClipContextMenu,
    closeTrackContextMenu,
    emit,
    publicSnapshot,
}) => {
    const key = (trackId, clipId) => `${String(trackId ?? '')}\u0000${String(clipId ?? '')}`

    const updatePresentation = () => {
        const selectedKey = getSelectedKey()
        getRoot().querySelectorAll('[data-clip-id]').forEach(element => {
            const selected = selectedKey === key(
                element.getAttribute('data-clip-track-id'),
                element.getAttribute('data-clip-id'),
            )
            element.classList.toggle('lgs1920-wa-timeline__clip--selected', selected)
            element.setAttribute('aria-selected', selected ? 'true' : 'false')
        })
    }

    const focusSelected = () => {
        const selectedKey = getSelectedKey()
        if (selectedKey === null) return
        const element = [...getRoot().querySelectorAll('[data-clip-id]')]
            .find(value => selectedKey === key(
                value.getAttribute('data-clip-track-id'),
                value.getAttribute('data-clip-id'),
            ))
        element?.focus?.({preventScroll: true})
    }

    const select = (clip, event, element = null) => {
        if (clip?.selectable === false) return
        const rows = getRows()
        const trackId = clip?.trackId ?? rows.find(row => (row.actions ?? []).some(value => value.id === clip?.id))?.id
        if (trackId === undefined || clip?.id === undefined || clip?.id === null) return
        const previousSelectionKey = getSelectedKey()
        const nextSelectionKey = key(trackId, clip.id)
        setSelectedKey(nextSelectionKey)
        event?.stopPropagation?.()
        element?.focus?.({preventScroll: true})
        updatePresentation()
        if (previousSelectionKey === nextSelectionKey) return
        emit('clip-select', {
            selected: true,
            clipId: clip.id,
            trackId,
            clip: Object.assign({}, clip, {trackId}),
            event,
            data: publicSnapshot(),
        })
    }

    const clear = event => {
        const selectedKey = getSelectedKey()
        if (selectedKey === null) return false
        const entry = getRows()
            .flatMap(row => (row.actions ?? []).map(clip => ({row, clip})))
            .find(({row, clip}) => selectedKey === key(row.id, clip.id))
        setSelectedKey(null)
        updatePresentation()
        if (entry) {
            emit('clip-select', {
                selected: false,
                clipId: entry.clip.id,
                trackId: entry.row.id,
                clip: Object.assign({}, entry.clip, {trackId: entry.row.id}),
                event,
                data: publicSnapshot(),
            })
        }
        return true
    }

    const handlePointerDown = event => {
        if (getSelectedKey() === null) return
        const path = event.composedPath?.() ?? []
        if (path.some(target => target?.closest?.('[data-clip-id]'))) return
        const menu = getRoot().querySelector('[data-testid="lgs1920-timeline-clip-context-menu"]')
        if (menu && path.includes(menu)) return
        clear(event)
    }

    const reconcile = () => {
        const selectedKey = getSelectedKey()
        const rows = getRows()
        const selectedClipExists = selectedKey === null
            || [...getRoot().querySelectorAll('[data-clip-id]')].some(element => (
                selectedKey === key(
                    element.getAttribute('data-clip-track-id'),
                    element.getAttribute('data-clip-id'),
                )
            ))
            || rows.some(row => (row.actions ?? []).some(clip => selectedKey === key(row.id, clip.id)))
        if (!selectedClipExists && selectedKey !== null) {
            const separatorIndex = selectedKey.indexOf('\u0000')
            const selectedClipId = separatorIndex < 0 ? null : selectedKey.slice(separatorIndex + 1)
            const movedClip = rows
                .flatMap(row => (row.actions ?? []).map(clip => ({row, clip})))
                .find(({clip}) => String(clip.id) === String(selectedClipId))
            setSelectedKey(movedClip ? key(movedClip.row.id, movedClip.clip.id) : null)
        }
        const menuClipId = getClipContextMenuClipId()
        if (menuClipId !== null && !findClipEntry(rows, menuClipId)) closeClipContextMenu()
        const menuTrackId = getTrackContextMenuTrackId()
        if (menuTrackId !== undefined && menuTrackId !== null
            && !rows.some(row => String(row.id) === String(menuTrackId))) closeTrackContextMenu()
    }

    return {key, updatePresentation, focusSelected, select, clear, handlePointerDown, reconcile}
}
