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
 * Last modified: 2026-09-25
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
        getMarkers,
        getTracks,
        globalSlotContent,
        isReadonlyMode,
        isTrackEditable,
        insertClip,
        beginTrackLabelEdit,
        removeClip,
        removeTrack,
        requestAddMarkerAt,
        requestEditMarker,
        startMarkerMove,
        requestMarkerDisplayChange,
        requestRemoveMarker,
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
    let markerContextMenuId = null
    let markerContextMenuAnchor = null
    let markerContextMenuTimeMillis = null

    const root = () => getRoot()
    const timelineHost = () => root()?.querySelector('[data-testid="lgs1920-wa-timeline"]')
    const clipMenuSelector = '[data-testid="lgs1920-timeline-clip-context-menu"]'
    const trackMenuSelector = '[data-testid="lgs1920-timeline-track-context-menu"]'
    const markerMenuSelector = '[data-testid="lgs1920-timeline-marker-context-menu"]'
    const markerEditSelector = '[data-testid="lgs1920-timeline-marker-edit-popup"]'

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

    const markerEditPopup = (marker, anchor) => {
        const popup = createElement('wa-popup', `lgs1920-wa-timeline__popup lgs1920-wa-timeline__marker-edit-popup${getHostNoDragClasses()}`, {
            placement: 'right-start',
            distance: 6,
            active: true,
            boundary: 'viewport',
            'aria-label': 'Edit marker',
            'data-testid': 'lgs1920-timeline-marker-edit-popup',
            flip: true,
            'flip-fallback-placements': 'left-start',
            shift: true,
            'shift-padding': 8,
            part: 'marker-edit-popup',
        })
        popup.anchor = anchor
        const form = createElement('form', 'lgs1920-wa-timeline__marker-edit-form', {novalidate: ''})
        const header = createElement('div', 'lgs1920-wa-timeline__marker-edit-header')
        const title = createElement('span', 'lgs1920-wa-timeline__marker-edit-title')
        title.textContent = 'Edit marker'
        const headerActions = createElement('div', 'lgs1920-wa-timeline__marker-edit-header-actions')
        const labelInput = createElement('wa-input', '', {
            label: 'Label',
            size: 'small',
            value: marker.label ?? '',
            'data-marker-edit-label': '',
        })
        let labelValue = String(marker.label ?? '')
        let labelEdited = false
        labelInput.value = labelValue
        labelInput.addEventListener('input', event => {
            labelEdited = true
            labelValue = String(event.currentTarget?.value ?? event.target?.value ?? '').trim()
        })
        const swatches = normalizeTimelineColorSwatches(getConfig().swatches)
        const markerColor = String(marker.color ?? '').trim()
        const markerElement = [...(root()?.querySelectorAll?.('[data-marker-id]') ?? [])]
            .find(element => String(element.dataset.markerId) === String(marker.id))
        const renderedColor = !markerColor && markerElement
            ? String(globalThis.getComputedStyle?.(markerElement)?.backgroundColor ?? '').trim()
            : ''
        const renderedColorMatch = renderedColor.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i)
        const renderedColorHex = renderedColorMatch
            ? `#${[1, 2, 3].map(index => Number(renderedColorMatch[index]).toString(16).padStart(2, '0')).join('')}`
            : renderedColor.match(/^#[\da-f]{3,8}$/i)?.[0]?.toLowerCase() ?? ''
        const paletteSwatch = swatches.find(swatch => markerColor === swatch.palette
            || markerColor.includes(`-${swatch.palette}-`))
        const colorValue = paletteSwatch?.color
            || resolveTimelineColorValue(marker.colorClasses, swatches, marker.timelineColor)
            || markerColor
            || renderedColorHex
            || swatches.find(swatch => swatch.palette === 'blue')?.color
            || swatches[0]?.color
            || '#3b82f6'
        const colorPicker = createElement('wa-color-picker', '', {
            size: 'small',
            label: 'Color',
            'without-format-toggle': '',
            value: colorValue,
            'data-marker-edit-color': '',
        })
        colorPicker.swatches = swatches
        colorPicker.value = colorValue
        let selectedColor = colorValue
        let colorEdited = false
        colorPicker.addEventListener('input', event => {
            colorEdited = true
            selectedColor = String(event.detail?.color
                ?? event.detail?.value
                ?? event.currentTarget?.value
                ?? event.target?.value
                ?? colorPicker.value
                ?? colorValue).trim()
            event.stopPropagation()
        })
        colorPicker.addEventListener('change', event => {
            colorPicker.open = false
            colorPicker.hide?.()
            event.stopPropagation()
        })
        colorPicker.addEventListener('click', event => {
            const panelInteraction = (event.composedPath?.() ?? []).some(element => {
                const parts = String(element?.getAttribute?.('part') ?? '').split(/\s+/)
                return ['grid', 'hue-slider', 'opacity-slider', 'swatch'].some(part => parts.includes(part))
            })
            if (!panelInteraction) return
            colorPicker.open = false
            colorPicker.hide?.()
        })
        const colorRow = createElement('div', 'lgs1920-wa-timeline__marker-edit-color-row')
        const createPopupButton = (label, iconName, options = {}) => {
            const item = button({
                iconName,
                label,
                iconSlotElement: menuIcon(iconName),
                appearance: options.appearance ?? 'plain',
                variant: options.variant ?? 'neutral',
            })
            item.classList.add('lgs1920-wa-timeline__marker-edit-button')
            if (options.showLabel !== false) {
                const labelElement = createElement('span', 'lgs1920-wa-timeline__menu-label')
                labelElement.textContent = label
                item.append(labelElement)
            }
            return item
        }
        const closeButton = createPopupButton('Close', 'xmark', {showLabel: false})
        const save = createPopupButton('Save', 'check', {variant: 'brand', appearance: 'filled'})
        const close = () => {
            popup.remove()
            closeMarkerContextMenu()
        }
        closeButton.addEventListener('click', event => {
            event.preventDefault()
            close()
        })
        save.addEventListener('click', event => {
            event.preventDefault()
            const label = labelEdited
                ? labelValue
                : String(labelInput.value ?? labelInput.getAttribute('value') ?? marker.label ?? '').trim()
            const changes = {label}
            if (colorEdited) {
                changes.color = selectedColor || String(colorPicker.value ?? '').trim() || String(marker.color ?? '').trim()
            }
            requestEditMarker(marker, changes, event)
            close()
        })
        form.addEventListener('submit', event => save.click(event))
        headerActions.append(closeButton)
        header.append(title, headerActions)
        colorRow.append(colorPicker, save)
        form.append(header, labelInput, colorRow)
        popup.append(form)
        return popup
    }

    /**
     * Create the marker and marker-rail context menu.
     *
     * @returns {HTMLElement|null} Marker context menu.
     */
    const markerContextMenu = () => {
        const config = getConfig()
        if (isReadonlyMode() || config.interactive === false || config.editable === false) return null
        if (markerContextMenuTimeMillis === null) return null
        const marker = getMarkers().find(value => String(value?.id) === String(markerContextMenuId))
        if (marker && marker.editable === false && marker.movable === false && marker.removable === false) return null
        const popup = createElement('wa-popup', `lgs1920-wa-timeline__popup lgs1920-wa-timeline__marker-context-menu${getHostNoDragClasses()}`, {
            placement: 'bottom-start',
            distance: 6,
            active: true,
            boundary: 'viewport',
            'data-testid': 'lgs1920-timeline-marker-context-menu',
            flip: true,
            shift: true,
            part: 'marker-context-menu',
        })
        if (markerContextMenuAnchor) popup.anchor = markerContextMenuAnchor
        const menuElement = createElement('div', 'lgs1920-wa-timeline__menu', {role: 'menu', part: 'marker-menu'})
        const addAction = (key, label, iconName, action, variant = 'neutral', close = true) => {
            const item = button({
                iconName,
                label,
                testId: `marker-menu-${key}`,
                iconSlotElement: menuIcon(iconName),
                variant,
                appearance: 'plain',
            })
            item.classList.add('lgs1920-wa-timeline__menu-item')
            item.setAttribute('role', 'menuitem')
            const labelElement = createElement('span', 'lgs1920-wa-timeline__menu-label')
            labelElement.textContent = label
            item.append(labelElement)
            item.addEventListener('click', event => {
                if (close) closeMarkerContextMenu()
                action(event)
            })
            menuElement.append(item)
        }
        if (!marker) {
            addAction('add', 'Add', 'diamond', event => requestAddMarkerAt(markerContextMenuTimeMillis, event), 'brand')
        }
        else {
            addAction(
                'display',
                marker.expanded === false ? 'Expand' : 'Shrink',
                marker.expanded === false ? 'expand' : 'compress',
                event => requestMarkerDisplayChange(marker, marker.expanded === false, event),
            )
            if (marker.editable !== false) addAction('edit', 'Edit', 'pen', event => {
                const anchor = event.currentTarget
                root()?.querySelector(markerEditSelector)?.remove()
                const popup = markerEditPopup(marker, anchor)
                const host = root()
                host?.append(popup)
            }, 'neutral', false)
            if (marker.editable !== false && marker.movable !== false) {
                addAction('move', 'Move', 'arrows-left-right', event => startMarkerMove(marker, event))
            }
            if (marker.removable !== false) addAction('remove', 'Remove', 'trash-can', event => requestRemoveMarker(marker, event), 'danger')
        }
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

    const openMarkerContextMenu = (marker, event, timeMillis = marker?.timeMillis) => {
        if (isReadonlyMode() || getConfig().interactive === false || getConfig().editable === false) return
        closeClipContextMenu()
        closeTrackContextMenu()
        closeMarkerContextMenu()
        markerContextMenuId = marker?.id ?? null
        markerContextMenuTimeMillis = Number(timeMillis) || 0
        markerContextMenuAnchor = event?.currentTarget?.getBoundingClientRect
            ? event.currentTarget
            : {getBoundingClientRect: () => pointerRect(event)}
        window.addEventListener('pointerdown', handleMarkerContextMenuOutsidePointerDown, true)
        const menuElement = markerContextMenu()
        if (menuElement) timelineHost()?.append(menuElement)
    }

    const openMarkerRailContextMenu = (event, timeMillis) => openMarkerContextMenu(null, event, timeMillis)

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

    const handleMarkerContextMenuOutsidePointerDown = event => {
        const path = event.composedPath?.() ?? []
        const menuElement = root()?.querySelector(markerMenuSelector)
        if (menuElement && path.includes(menuElement)) return
        const editPopup = root()?.querySelector(markerEditSelector)
        if (editPopup && path.includes(editPopup)) return
        closeMarkerContextMenu()
    }

    const closeMarkerContextMenu = () => {
        markerContextMenuId = null
        markerContextMenuAnchor = null
        markerContextMenuTimeMillis = null
        window.removeEventListener('pointerdown', handleMarkerContextMenuOutsidePointerDown, true)
        root()?.querySelector(markerEditSelector)?.remove()
        root()?.querySelector(markerMenuSelector)?.remove()
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
        openMarkerContextMenu,
        openMarkerRailContextMenu,
        markerContextMenu,
        trackContextMenu,
        closeTrackContextMenu: () => {
            trackContextMenuTrackId = null
            trackContextMenuAnchor = null
            window.removeEventListener('pointerdown', handleTrackContextMenuOutsidePointerDown, true)
            root()?.querySelector(trackMenuSelector)?.remove()
        },
        closeMarkerContextMenu,
    }
}
