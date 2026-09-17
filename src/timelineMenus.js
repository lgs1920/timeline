/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineMenus.js
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

import {
    createElement,
    createIcon,
    normalizeTimelineColorSwatches,
    resolveTimelineColorValue,
} from './timelineUtils.js'

const pointerRect = event => ({
    x: Number(event?.clientX) || 0,
    y: Number(event?.clientY) || 0,
    width: 0,
    height: 0,
    top: Number(event?.clientY) || 0,
    right: Number(event?.clientX) || 0,
    bottom: Number(event?.clientY) || 0,
    left: Number(event?.clientX) || 0,
})

/**
 * Create the timeline insertion and contextual menus.
 *
 * @param {Object} options - Timeline callbacks and state accessors.
 * @returns {Object} Menu builders and interaction handlers.
 */
export const createTimelineMenus = options => {
    const {
        button,
        changeClipColor,
        closeClipContextMenu,
        closeTrackContextMenu,
        contextualSlot,
        duplicateClip,
        endClipOptionDrag,
        getClipEditor,
        getClipOptions,
        getConfig,
        getDragState,
        getHostNoDragClasses,
        getRoot,
        getRows,
        getTracks,
        globalSlotContent,
        isReadonlyMode,
        isTrackEditable,
        insertClip,
        beginTrackLabelEdit,
        removeClip,
        removeTrack,
        publicSnapshot,
        emit,
        emitAfter,
        emitBefore,
        selectClip,
        startClipOptionDrag,
        toggleClipEnabled,
        toggleClipVisibility,
        toggleTrackVisibility,
    } = options

    let clipContextMenuClipId = null
    let clipContextMenuAnchor = null
    let trackContextMenuTrackId = null
    let trackContextMenuAnchor = null

    const root = () => getRoot()
    const timelineHost = () => root()?.querySelector('[data-testid="lgs1920-wa-timeline"]')
    const clipMenuSelector = '[data-testid="lgs1920-timeline-clip-context-menu"]'
    const trackMenuSelector = '[data-testid="lgs1920-timeline-track-context-menu"]'

    const resolvedClipOptions = () => getClipOptions() ?? [{
        key: 'clip',
        label: 'Clip',
        icon: 'film',
    }]

    const resolvedClipActions = () => {
        const config = getConfig()
        const configured = config.clipActions ?? config.clipContextMenuActions
        return (Array.isArray(configured) ? configured : [])
            .filter(action => action && typeof action === 'object'
                && String(action.key ?? '').trim()
                && String(action.label ?? '').trim())
            .map(action => ({
                ...action,
                key: String(action.key).trim(),
                label: String(action.label).trim(),
            }))
    }

    const clipActionKey = key => String(key).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')

    const menuIcon = iconName => {
        const icon = createElement('span', 'lgs1920-wa-timeline__menu-icon', {
            slot: 'start',
            'aria-hidden': 'true',
        })
        icon.append(createIcon(iconName, 'solid'))
        return icon
    }

    const runClipAction = (clipId, action, event) => {
        if (action?.disabled === true || isReadonlyMode() || getConfig().editable === false) return
        const entry = getClipEditor().findClipEntry(getRows(), clipId)
        if (!entry || !isTrackEditable(entry.row) || entry.clip.editable === false) return
        event?.preventDefault?.()
        event?.stopPropagation?.()
        const detail = {
            action,
            key: action.key,
            clipId,
            trackId: entry.row.id,
            clip: Object.assign({}, entry.clip, {trackId: entry.row.id}),
            tracks: getTracks(),
            previousTracks: getTracks(),
            event,
            data: publicSnapshot(),
        }
        if (emitBefore('clip-action', detail).defaultPrevented) return
        emit('clip-action', detail)
        emitAfter('clip-action', detail)
    }

    const menu = anchor => {
        const popup = createElement('wa-popup', `lgs1920-wa-timeline__popup${getHostNoDragClasses()}`, {
            placement: 'right-start',
            distance: 4,
            active: true,
            part: 'popup',
        })
        popup.anchor = anchor
        const menuElement = createElement('div', 'lgs1920-wa-timeline__menu', {role: 'menu', part: 'menu'})
        resolvedClipOptions().forEach(option => {
            const item = createElement('wa-button', 'lgs1920-wa-timeline__menu-item', {
                appearance: 'plain',
                variant: 'brand',
                size: 's',
                role: 'menuitem',
                draggable: 'true',
            })
            item.append(...globalSlotContent('clip-option-icon', createIcon(option.icon ?? 'film')))
            item.append(...globalSlotContent('clip-option-label', document.createTextNode(option.label ?? option.key ?? 'Clip')))
            item.addEventListener('dragstart', event => startClipOptionDrag(option, event))
            item.addEventListener('dragend', event => endClipOptionDrag(event))
            item.addEventListener('click', event => insertClip(option, event))
            menuElement.append(item)
        })
        if (resolvedClipOptions().length === 0) menuElement.append(createElement('slot', '', {name: 'empty-state'}))
        popup.append(menuElement)
        return popup
    }

    const clipContextMenu = () => {
        const clipId = clipContextMenuClipId
        if (clipId === null || clipId === undefined) return null
        const entry = getClipEditor().findClipEntry(getRows(), clipId)
        if (!entry || entry.clip.editable === false || !isTrackEditable(entry.row)) return null
        const popup = createElement('wa-popup', `lgs1920-wa-timeline__popup lgs1920-wa-timeline__clip-context-menu${getHostNoDragClasses()}`, {
            placement: 'bottom-start',
            distance: 6,
            active: true,
            boundary: 'viewport',
            'data-testid': 'lgs1920-timeline-clip-context-menu',
            flip: true,
            shift: true,
            'flip-fallback-placements': 'top-start right-start left-start',
            'shift-padding': 8,
            part: 'clip-context-menu',
        })
        if (clipContextMenuAnchor) popup.anchor = clipContextMenuAnchor
        const menuElement = createElement('div', 'lgs1920-wa-timeline__menu', {
            role: 'menu',
            part: 'clip-menu',
        })
        const addAction = ({key, testId = key, iconName, label, variant = 'neutral', disabled = false, action}) => {
            const item = button({
                iconName,
                label,
                testId: `clip-menu-${testId}`,
                iconSlotElement: menuIcon(iconName),
                variant,
                appearance: 'plain',
                disabled,
            })
            item.classList.add('lgs1920-wa-timeline__menu-item')
            const labelElement = createElement('span', 'lgs1920-wa-timeline__menu-label')
            labelElement.append(document.createTextNode(label))
            item.append(labelElement)
            item.setAttribute('role', 'menuitem')
            item.setAttribute('data-clip-action', key)
            item.addEventListener('click', event => {
                if (disabled) return
                event.stopPropagation()
                closeClipContextMenu()
                action(event)
            })
            menuElement.append(item)
        }

        addAction({key: 'remove', iconName: 'trash-can', label: 'Delete', variant: 'danger', action: event => removeClip(clipId, event)})
        addAction({key: 'copy', testId: 'duplicate', iconName: 'clone', label: 'Copy', action: event => duplicateClip(clipId, event)})
        addAction({
            key: 'enabled',
            iconName: entry.clip.enabled === false ? 'toggle-off' : 'toggle-on',
            label: entry.clip.enabled === false ? 'Enable' : 'Disable',
            action: event => toggleClipEnabled(clipId, event),
        })
        addAction({
            key: 'visibility',
            iconName: entry.clip.visible === false ? 'eye' : 'eye-slash',
            label: entry.clip.visible === false ? 'Show' : 'Mask',
            action: event => toggleClipVisibility(clipId, event),
        })
        if (entry.clip.resizable !== false) {
            addAction({key: 'extend', iconName: 'arrows-left-right', label: 'Extend max', action: event => options.extendClip(clipId, event)})
        }
        resolvedClipActions().forEach(action => addAction({
            key: action.key,
            testId: `clip-custom-${clipActionKey(action.key)}`,
            iconName: action.icon ?? 'bolt',
            label: action.label,
            variant: action.variant ?? 'neutral',
            disabled: action.disabled === true,
            action: event => runClipAction(clipId, action, event),
        }))

        const swatches = normalizeTimelineColorSwatches(getConfig().swatches)
        if (swatches.length === 0) {
            popup.append(menuElement)
            return popup
        }
        const colorValue = resolveTimelineColorValue(entry.clip.colorClasses, swatches, entry.clip.timelineColor) ?? swatches[0].color
        const colorPicker = createElement('wa-color-picker', 'lgs1920-wa-timeline__clip-color-picker lgs1920-wa-timeline__clip-color-picker--menu-trigger', {
            size: 's',
            label: 'Color',
            'without-format-toggle': '',
            value: colorValue,
            'data-testid': 'lgs1920-timeline-clip-menu-color',
        })
        colorPicker.swatches = swatches
        colorPicker.value = colorValue
        const colorItem = button({
            iconName: 'palette',
            label: 'Color',
            testId: 'clip-menu-color',
            iconSlotElement: menuIcon('palette'),
            appearance: 'plain',
        })
        colorItem.classList.add('lgs1920-wa-timeline__menu-item')
        const colorLabel = createElement('span', 'lgs1920-wa-timeline__menu-label')
        colorLabel.append(document.createTextNode('Color'))
        colorItem.append(colorLabel)
        colorItem.setAttribute('role', 'menuitem')
        colorItem.setAttribute('aria-haspopup', 'dialog')
        colorItem.setAttribute('aria-expanded', 'false')
        colorItem.addEventListener('click', event => {
            event.stopPropagation()
            colorPicker.open = true
            colorPicker.show?.()
        })
        let colorCommitted = false
        const commitColor = event => {
            if (colorCommitted) return
            const value = event.detail?.color
                ?? event.detail?.value
                ?? event.currentTarget?.value
                ?? event.target?.value
                ?? colorPicker.value
            if (!changeClipColor(clipId, value, event)) return
            colorCommitted = true
            event.stopPropagation()
            closeClipContextMenu({render: false})
        }
        colorPicker.addEventListener('input', commitColor)
        colorPicker.addEventListener('change', commitColor)
        menuElement.append(colorItem, colorPicker)
        popup.append(menuElement)
        return popup
    }

    const trackContextMenu = () => {
        const trackId = trackContextMenuTrackId
        if (trackId === null || trackId === undefined) return null
        const row = getRows().find(value => String(value.id) === String(trackId))
        if (!isTrackEditable(row)) return null
        const hasClips = (row.actions ?? row.clips ?? []).length > 0
        const popup = createElement('wa-popup', `lgs1920-wa-timeline__popup lgs1920-wa-timeline__track-context-menu${getHostNoDragClasses()}`, {
            placement: 'bottom-start',
            distance: 6,
            active: true,
            boundary: 'viewport',
            'data-testid': 'lgs1920-timeline-track-context-menu',
            flip: true,
            shift: true,
            'flip-fallback-placements': 'top-start right-start left-start',
            'shift-padding': 8,
            part: 'track-context-menu',
        })
        if (trackContextMenuAnchor) popup.anchor = trackContextMenuAnchor
        const menuElement = createElement('div', 'lgs1920-wa-timeline__menu', {role: 'menu', part: 'track-menu'})
        const trackMenuIcon = (iconName, slotName = null, fallback = iconName) => {
            const icon = createElement('span', 'lgs1920-wa-timeline__menu-icon', {
                slot: 'start',
                'aria-hidden': 'true',
            })
            icon.append(slotName
                ? contextualSlot(slotName, row.id, slotName, createIcon(fallback, 'solid'))
                : createIcon(iconName, 'solid'))
            return icon
        }
        const addAction = ({key, iconName, label, variant = 'neutral', iconSlotName = null, action}) => {
            const item = button({
                iconName,
                label,
                testId: `track-menu-${key}`,
                iconSlotElement: trackMenuIcon(iconName, iconSlotName),
                variant,
                appearance: 'plain',
            })
            item.classList.add('lgs1920-wa-timeline__menu-item')
            const labelElement = createElement('span', 'lgs1920-wa-timeline__menu-label')
            labelElement.append(document.createTextNode(label))
            item.append(labelElement)
            item.setAttribute('role', 'menuitem')
            item.setAttribute('data-track-action', key)
            item.addEventListener('click', event => {
                event.stopPropagation()
                closeTrackContextMenu()
                action(event)
            })
            menuElement.append(item)
        }
        if (row.visible !== false) addAction({key: 'edit', iconName: 'pen', label: 'Edit', action: event => beginTrackLabelEdit(row, event)})
        if (row.canHide) {
            addAction({
                key: 'visibility',
                iconName: row.visible === false ? 'eye' : 'eye-slash',
                iconSlotName: 'visibility',
                label: row.visible === false ? 'Show' : 'Hide',
                action: event => toggleTrackVisibility(row, event),
            })
        }
        if (!hasClips) addAction({
            key: 'remove',
            iconName: 'trash-can',
            iconSlotName: 'remove',
            label: 'Remove',
            variant: 'danger',
            action: event => removeTrack(row, event),
        })
        menuElement.append(contextualSlot('actions', row.id, 'actions', null))
        popup.append(menuElement)
        return popup
    }

    const openClipContextMenu = (clip, event) => {
        const config = getConfig()
        if (isReadonlyMode() || config.editable === false || clip?.editable === false) return
        if (config.interactive === false) return
        closeTrackContextMenu()
        if (getDragState()?.type === 'clip') {
            const state = getDragState()
            options.cancelClipInteraction({
                type: 'pointercancel',
                pointerId: state.pointerId,
                clientX: state.startX,
                clientY: state.startY,
            })
        }
        selectClip(clip, event, event?.currentTarget)
        clipContextMenuClipId = clip.id
        clipContextMenuAnchor = {getBoundingClientRect: () => pointerRect(event)}
        window.addEventListener('pointerdown', handleClipContextMenuOutsidePointerDown, true)
        root()?.querySelector(clipMenuSelector)?.remove()
        const menuElement = clipContextMenu()
        if (menuElement) timelineHost()?.append(menuElement)
    }

    const openTrackContextMenu = (row, event) => {
        const current = getRows().find(value => String(value.id) === String(row?.id))
        if (!isTrackEditable(current)) return
        closeClipContextMenu()
        closeTrackContextMenu()
        trackContextMenuTrackId = current.id
        trackContextMenuAnchor = {getBoundingClientRect: () => pointerRect(event)}
        window.addEventListener('pointerdown', handleTrackContextMenuOutsidePointerDown, true)
        root()?.querySelector(trackMenuSelector)?.remove()
        const menuElement = trackContextMenu()
        if (menuElement) timelineHost()?.append(menuElement)
    }

    const handleClipContextMenuOutsidePointerDown = event => {
        const path = event.composedPath?.() ?? []
        const menuElement = root()?.querySelector(clipMenuSelector)
        if (menuElement && path.includes(menuElement)) return
        closeClipContextMenu()
    }

    const handleTrackContextMenuOutsidePointerDown = event => {
        const path = event.composedPath?.() ?? []
        const menuElement = root()?.querySelector(trackMenuSelector)
        if (menuElement && path.includes(menuElement)) return
        closeTrackContextMenu()
    }

    return {
        clipActionKey,
        clipContextMenu,
        closeClipContextMenu: () => {
            clipContextMenuClipId = null
            clipContextMenuAnchor = null
            window.removeEventListener('pointerdown', handleClipContextMenuOutsidePointerDown, true)
            root()?.querySelector(clipMenuSelector)?.remove()
        },
        getClipContextMenuClipId: () => clipContextMenuClipId,
        getTrackContextMenuTrackId: () => trackContextMenuTrackId,
        menu,
        openClipContextMenu,
        openTrackContextMenu,
        trackContextMenu,
        closeTrackContextMenu: () => {
            trackContextMenuTrackId = null
            trackContextMenuAnchor = null
            window.removeEventListener('pointerdown', handleTrackContextMenuOutsidePointerDown, true)
            root()?.querySelector(trackMenuSelector)?.remove()
        },
    }
}
