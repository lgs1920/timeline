/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineClipEditingMixin.js
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
import * as timelineEditing from './timelineEditing.js'
import * as timelineConstants from './timelineConstants.js'

/**
 * Add clip insertion, copy, drag, and track mutation methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineClipEditingMixin = Base => class extends Base {
    _insertTrack = event => {
        if (!this._isTrackEditable({editable: true})) return
        const insertionIndex = this._trackInsertionIndex(this._rows)
        if (insertionIndex === null) return
        const numberedTracks = this._rows.filter(row => row.autoNumbered === true
            && /^Track \d+$/.test(String(row.label ?? '')))
        let nextTrackNumber = this._trackNumber
        if (numberedTracks.length === 0) {
            nextTrackNumber = 1
        } else {
            const largestNumber = numberedTracks.reduce((largest, row) => {
                const number = Number.parseInt(String(row.label).slice('Track '.length), 10)
                return Number.isNaN(number) ? largest : Math.max(largest, number)
            }, 0)
            nextTrackNumber = Math.max(this._trackNumber, largestNumber) + 1
        }
        const baseId = `track-${nextTrackNumber}`
        let id = baseId
        let suffix = 2
        while (this._rows.some(row => row.id === id)) {
            id = `${baseId}-${suffix}`
            suffix += 1
        }
        const track = {
            id,
            label: `Track ${nextTrackNumber}`,
            kind: 'track',
            autoNumbered: true,
            clips: [],
        }
        const nextRows = [...this._rows.slice(0, insertionIndex), track, ...this._rows.slice(insertionIndex)]
        const detail = {
            group: null,
            key: 'track',
            option: null,
            track: this._publicTrack(track),
            trackId: id,
            tracks: nextRows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('add-track', detail).defaultPrevented) return
        this._trackNumber = nextTrackNumber
        this._rows = nextRows
        this._localRowsDirty = true
        this._emit('add-track', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('add-track', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Remove a track and emit the complete controlled snapshot.
     *
     * @param {Object} row - Track row to remove.
     * @param {Event} event - Triggering interaction event.
     */
    _removeTrack = (row, event) => {
        const current = this._rows.find(value => value.id === row?.id)
        if (!this._isTrackEditable(current)) return
        if ((current.actions ?? current.clips ?? []).length > 0) return
        const nextRows = this._rows.filter(value => value.id !== current.id)
        const detail = {
            trackId: current.id,
            track: this._publicTrack(current),
            tracks: nextRows.map(value => this._publicTrack(value)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('remove-track', detail).defaultPrevented) return
        this._rows = nextRows
        this._localRowsDirty = true
        if (this._editingRowId === current.id) {
            this._editingRowId = null
            this._editingLabelValue = ''
        }
        this._emit('remove-track', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('remove-track', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Request and remove an editable clip through the controlled event flow.
     *
     * @param {string} clipId - Clip identifier.
     * @param {KeyboardEvent} event - Triggering keyboard event.
     */
    _removeClip = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return
        event?.preventDefault?.()
        event?.stopPropagation?.()
        const clip = Object.assign({}, entry.clip, {trackId: entry.row.id})
        const nextRows = this._rows.map(row => row.id === entry.row.id
            ? {...row, actions: (row.actions ?? []).filter(value => value.id !== clipId)}
            : row)
        const detail = {
            clipId,
            trackId: entry.row.id,
            clip,
            tracks: nextRows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        const request = this._emitBefore('remove-clip', detail)
        if (request.defaultPrevented) return
        this._rows = nextRows
        this._localRowsDirty = true
        if (this._isClipSelected(clip)) this._selectedClipKey = null
        if (this._menus.getClipContextMenuClipId() === clipId) this._closeClipContextMenu()
        this._emit('remove-clip', {
            ...detail,
            tracks: this.tracks,
            data: this._publicSnapshot(),
        })
        this._render()
        this._emitAfter('remove-clip', {
            ...detail,
            tracks: this.tracks,
            data: this._publicSnapshot(),
        })
    }

    /**
     * Generate an unused identifier for a duplicated clip.
     *
     * @param {string|number} identifier - Original clip identifier.
     * @returns {string} New clip identifier.
     */
    _duplicateClipIdentifier = identifier => {
        const identifiers = new Set([
            ...this._rows.flatMap(row => (row.actions ?? []).map(clip => String(clip.id))),
            ...this._generatedClipIdentifiers,
        ])
        const base = `${String(identifier)}-copy`
        let candidate = base
        let suffix = 2
        while (identifiers.has(candidate)) {
            candidate = `${base}-${suffix}`
            suffix += 1
        }
        return candidate
    }

    /**
     * Generate an identifier that is not used by any current clip.
     *
     * @param {string|number} identifier - Preferred clip identifier.
     * @returns {string} Unused clip identifier.
     */
    _uniqueClipIdentifier = identifier => {
        const identifiers = new Set([
            ...this._rows.flatMap(row => (row.actions ?? []).map(clip => String(clip.id))),
            ...this._generatedClipIdentifiers,
        ])
        const base = String(identifier ?? 'clip').trim() || 'clip'
        let candidate = base
        let suffix = 2
        while (identifiers.has(candidate)) {
            candidate = `${base}-${suffix}`
            suffix += 1
        }
        return candidate
    }

    /**
     * Remove the transient copy-placement ghost from the timeline surface.
     */
    _removeClipCopyPresentation = () => {
        this._root.querySelectorAll('[data-clip-copy-ghost]').forEach(element => element.remove())
    }

    /**
     * Remove the listeners and state used by a pending clip copy.
     */
    _cancelClipCopy = () => {
        window.removeEventListener('pointermove', this._handleClipCopyPointerMove, true)
        window.removeEventListener('pointerdown', this._handleClipCopyPointerDown, true)
        window.removeEventListener('contextmenu', this._handleClipCopyContextMenu, true)
        if (this._clipCopyPresentationFrame !== null) {
            cancelAnimationFrame(this._clipCopyPresentationFrame)
            this._clipCopyPresentationFrame = null
        }
        this._clipCopyState = null
        this._removeClipCopyPresentation()
    }

    /**
     * Preview a copied clip under the current pointer position.
     *
     * @param {PointerEvent} event - Pointer movement event.
     */
    _previewClipCopy = event => {
        const state = this._clipCopyState
        if (!state) return
        const targetTrack = this._trackAtClientY(event.clientY)
        const duration = state.originalEnd - state.originalStart
        const targetTime = this._timeAtClientX(event.clientX)
        const start = Math.max(0, targetTime - (duration / 2))
        const proposedClip = Object.assign({}, state.clip, {
            start,
            end: start + duration,
            trackId: targetTrack?.id ?? state.targetTrackId,
        })
        const result = targetTrack
            ? this._clipEditor.place({
                baseRows: state.baseRows,
                clip: proposedClip,
                targetTrackId: targetTrack.id,
                mode: 'move',
            })
            : null
        const placedEntry = result ? this._clipEditor.findClipEntry(result.rows, state.clip.id) : null
        state.previewClientX = event.clientX
        state.previewClientY = event.clientY
        state.targetTrackId = targetTrack?.id ?? state.targetTrackId
        state.previewClip = placedEntry
            ? Object.assign({}, placedEntry.clip, {trackId: placedEntry.row.id})
            : proposedClip
        state.lastResult = result
        state.dropRejected = !result
        this._updateClipCopyPresentation()
    }

    /**
     * Render the transient copied clip without adding it to controlled rows.
     */
    _updateClipCopyPresentation = () => {
        this._removeClipCopyPresentation()
        const state = this._clipCopyState
        if (!state) return
        const sourceElement = [...this._root.querySelectorAll('[data-clip-id]')]
            .find(element => String(element.getAttribute('data-clip-id')) === String(state.sourceClipId))
        if (!sourceElement) return
        const ghost = sourceElement.cloneNode(true)
        const clip = state.previewClip ?? state.clip
        const {start, end} = timelineEditing.resolveClipInterval(clip)
        const isInitialCopy = state.previewClientX === null
        const presentationStart = isInitialCopy ? state.originalStart : start
        const presentationEnd = presentationStart + (end - start)
        const {majorSeconds} = this._resolveScale()
        const scaleWidth = this._scaleWidth()
        const scaleOffset = this._numericToken('scale-offset', timelineUtils.START_LEFT)
        const copyOffset = isInitialCopy
            ? Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight) / 2
            : 0
        ghost.removeAttribute('id')
        ghost.removeAttribute('data-clip-id')
        ghost.setAttribute('data-clip-copy-ghost', '')
        ghost.setAttribute('aria-hidden', 'true')
        ghost.setAttribute('tabindex', '-1')
        ghost.classList.remove(
            'lgs1920-wa-timeline__clip--selected',
            'lgs1920-wa-timeline__clip--dragging',
            'lgs1920-wa-timeline__clip--resizing',
            'lgs1920-wa-timeline__clip--drop-rejected',
        )
        ghost.classList.add(
            'lgs1920-wa-timeline__clip--drag-ghost',
            'lgs1920-wa-timeline__clip--copy-ghost',
        )
        if (state.dropRejected) ghost.classList.add('lgs1920-wa-timeline__clip--drop-rejected')
        ghost.style.left = `${scaleOffset + ((presentationStart / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
        ghost.style.width = `${Math.max(this._numericToken('clip-min-width', 8), ((presentationEnd - presentationStart) / Math.max(Number.EPSILON, majorSeconds)) * scaleWidth)}px`
        ghost.style.transform = copyOffset > 0
            ? `translate(${-copyOffset}px, ${copyOffset}px)`
            : ''
        const surfaceRect = this._surface?.getBoundingClientRect?.()
        const overlay = this._root.querySelector('[data-overlay]')
        const track = [...this._root.querySelectorAll('[part="track"]')]
            .find(element => String(element.dataset.rowId) === String(state.targetTrackId))
        const trackRect = track?.getBoundingClientRect?.()
        const sourceRect = sourceElement.getBoundingClientRect?.()
        const previewClientY = Number.isFinite(state.previewClientY)
            ? state.previewClientY
            : trackRect?.height > 0
                ? trackRect.top + (trackRect.height / 2)
                : sourceRect?.height > 0
                    ? sourceRect.top + (sourceRect.height / 2)
                    : null
        if (overlay && surfaceRect && Number.isFinite(previewClientY)) {
            const rowHeight = Math.max(timelineUtils.MIN_ROW_HEIGHT, this._rowHeight)
            ghost.style.top = `${previewClientY - surfaceRect.top - (rowHeight / 2)}px`
            ghost.style.bottom = 'auto'
            ghost.style.height = `${rowHeight}px`
            ghost.style.zIndex = '8'
            overlay.append(ghost)
            return
        }
        if (track) track.append(ghost)
    }

    /**
     * Scroll the horizontal surface just enough to reveal the initial copy ghost.
     */
    _revealInitialClipCopy = () => {
        const state = this._clipCopyState
        const surface = this._surface
        const ghost = this._root.querySelector('[data-clip-copy-ghost]')
        if (!state || state.previewClientX !== null || !surface || !ghost) return
        const left = Number.parseFloat(ghost.style.left)
        const width = Number.parseFloat(ghost.style.width)
        const viewportWidth = surface.clientWidth
        if (!Number.isFinite(left) || !Number.isFinite(width) || viewportWidth <= 0) return
        const right = left + width
        const padding = 8
        const viewportLeft = surface.scrollLeft
        const viewportRight = viewportLeft + viewportWidth
        if (left < viewportLeft + padding) {
            surface.scrollLeft = Math.max(0, left - padding)
        } else if (right > viewportRight - padding) {
            surface.scrollLeft = Math.min(
                Math.max(0, surface.scrollWidth - viewportWidth),
                right - viewportWidth + padding,
            )
        }
    }

    /**
     * Reapply the initial copy presentation after the layout has measured the surface.
     */
    _scheduleClipCopyPresentation = () => {
        if (!this._clipCopyState) return
        if (typeof requestAnimationFrame !== 'function') {
            this._revealInitialClipCopy()
            return
        }
        if (this._clipCopyPresentationFrame !== null) {
            cancelAnimationFrame(this._clipCopyPresentationFrame)
        }
        this._clipCopyPresentationFrame = requestAnimationFrame(() => {
            this._clipCopyPresentationFrame = requestAnimationFrame(() => {
                this._clipCopyPresentationFrame = null
                if (!this._clipCopyState) return
                this._updateClipCopyPresentation()
                this._revealInitialClipCopy()
            })
        })
    }

    /**
     * Track pointer movement while a copied clip awaits placement.
     *
     * @param {PointerEvent} event - Pointer movement event.
     */
    _handleClipCopyPointerMove = event => {
        const eventBelongsToTimeline = event.composedPath?.().includes(this)
            || event.target === this
            || this._root.contains(event.target)
        if (!this._clipCopyState || !eventBelongsToTimeline) return
        event.preventDefault()
        event.stopPropagation()
        this._previewClipCopy(event)
    }

    /**
     * Commit a pending copy when the user clicks a timeline track.
     *
     * @param {PointerEvent} event - Pointer press event.
     */
    _handleClipCopyPointerDown = event => {
        const eventBelongsToTimeline = event.composedPath?.().includes(this)
            || event.target === this
            || this._root.contains(event.target)
        if (!this._clipCopyState) return
        if (!eventBelongsToTimeline) {
            this._cancelClipCopy()
            return
        }
        if (event.button !== 0) {
            event.preventDefault()
            event.stopImmediatePropagation()
            return
        }
        event.preventDefault()
        event.stopImmediatePropagation()
        this._previewClipCopy(event)
        const state = this._clipCopyState
        if (!state || state.dropRejected || !state.lastResult || !state.previewClip) return
        const option = {
            key: 'copy',
            label: state.clip.label ? `Copy of ${state.clip.label}` : 'Copy',
            trackId: state.targetTrackId,
            duration: state.originalEnd - state.originalStart,
            end: state.previewClip.end,
            clip: Object.assign({}, state.clip, {
                start: state.previewClip.start,
                end: state.previewClip.end,
            }),
        }
        const placement = {
            trackId: state.targetTrackId,
            start: state.previewClip.start,
        }
        this._cancelClipCopy()
        this._insertClip(option, event, placement)
    }

    /**
     * Cancel a pending copy when the mouse context menu is requested.
     *
     * @param {MouseEvent|PointerEvent} event - Context-menu event.
     */
    _handleClipCopyContextMenu = event => {
        if (!this._clipCopyState) return
        event.preventDefault()
        event.stopImmediatePropagation()
        this._cancelClipCopy()
    }

    /**
     * Start placing a copied clip as a transient ghost.
     *
     * @param {string} clipId - Source clip identifier.
     * @param {KeyboardEvent|MouseEvent} event - Triggering interaction event.
     */
    _startClipCopy = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return
        const {start, end} = timelineEditing.resolveClipInterval(entry.clip)
        if (end <= start) return
        const copyId = this._duplicateClipIdentifier(entry.clip.id)
        const duration = end - start
        const copyClip = Object.assign({}, entry.clip, {
            id: copyId,
            start: end,
            end: end + duration,
        })
        event?.preventDefault?.()
        event?.stopPropagation?.()
        this._cancelClipCopy()
        this._clipCopyState = {
            baseRows: timelineEditing.cloneRows(this._rows),
            clip: copyClip,
            sourceClipId: entry.clip.id,
            originalStart: start,
            originalEnd: end,
            targetTrackId: entry.row.id,
            previewClip: Object.assign({}, copyClip, {trackId: entry.row.id}),
            previewClientX: null,
            previewClientY: null,
            lastResult: this._clipEditor.place({
                baseRows: timelineEditing.cloneRows(this._rows),
                clip: copyClip,
                targetTrackId: entry.row.id,
                mode: 'move',
            }),
            dropRejected: false,
        }
        window.addEventListener('pointermove', this._handleClipCopyPointerMove, true)
        window.addEventListener('pointerdown', this._handleClipCopyPointerDown, true)
        window.addEventListener('contextmenu', this._handleClipCopyContextMenu, true)
        this._render()
        this._revealInitialClipCopy()
    }

    /**
     * Copy a clip into a transient placement ghost, or keep the legacy
     * immediate duplicate shortcut for Mod+D.
     *
     * @param {string} clipId - Clip identifier.
     * @param {KeyboardEvent|MouseEvent} event - Triggering interaction event.
     */
    _duplicateClip = (clipId, event) => {
        if (event?.key?.toLowerCase?.() === 'd') {
            this._duplicateClipImmediately(clipId, event)
            return
        }
        this._startClipCopy(clipId, event)
    }

    /**
     * Duplicate an editable clip immediately after its current interval.
     *
     * @param {string} clipId - Clip identifier.
     * @param {KeyboardEvent} event - Triggering keyboard event.
     */
    _duplicateClipImmediately = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return
        const {end, duration} = timelineEditing.resolveClipInterval(entry.clip)
        if (duration <= 0) return
        event?.preventDefault?.()
        event?.stopPropagation?.()
        this._insertClip({
            key: 'duplicate',
            label: entry.clip.label ? `Copy of ${entry.clip.label}` : 'Copy',
            trackId: entry.row.id,
            start: end,
            end: end + duration,
            duration,
            clip: {
                ...entry.clip,
                id: this._duplicateClipIdentifier(entry.clip.id),
                start: end,
                end: end + duration,
            },
        }, event)
    }

    /**
     * Toggle one clip's visibility and emit the controlled change event.
     *
     * @param {string} clipId - Clip identifier.
     * @param {Event} event - Triggering interaction event.
     */
    _toggleClipVisibility = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return
        const visible = entry.clip.visible === false
        const clip = {...entry.clip, visible, trackId: entry.row.id}
        const nextRows = this._rows.map(row => row.id === entry.row.id
            ? {...row, actions: (row.actions ?? []).map(value => value.id === clipId ? {...value, visible} : value)}
            : row)
        const detail = {
            clipId,
            trackId: entry.row.id,
            visible,
            clip,
            tracks: nextRows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('clip-visibility-change', detail).defaultPrevented) return
        this._rows = nextRows
        this._localRowsDirty = true
        this._emit('clip-visibility-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('clip-visibility-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Toggle whether an editable clip participates in timeline playback.
     *
     * @param {string} clipId - Clip identifier.
     * @param {KeyboardEvent|MouseEvent} event - Triggering interaction event.
     */
    _toggleClipEnabled = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return
        const enabled = entry.clip.enabled === false
        const clip = {...entry.clip, enabled, trackId: entry.row.id}
        const nextRows = this._rows.map(row => row.id === entry.row.id
            ? {...row, actions: (row.actions ?? []).map(value => value.id === clipId ? {...value, enabled} : value)}
            : row)
        const detail = {
            clipId,
            trackId: entry.row.id,
            enabled,
            clip,
            tracks: nextRows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('clip-enabled-change', detail).defaultPrevented) return
        this._rows = nextRows
        this._localRowsDirty = true
        this._emit('clip-enabled-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('clip-enabled-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Extend one clip to the available interval on both sides.
     *
     * @param {string} clipId - Clip identifier.
     * @param {Event} event - Triggering interaction event.
     */
    _extendClip = (clipId, event) => {
        if (this._timelineConfig.editable === false) return
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false || entry.clip.resizable === false) return
        const result = this._clipEditor.extend(clipId)
        if (!result) return
        const updatedEntry = this._clipEditor.findClipEntry(result.rows, clipId)
        const clip = updatedEntry ? {...updatedEntry.clip, trackId: updatedEntry.row.id} : null
        const detail = {
            clipId,
            trackId: entry.row.id,
            clip,
            oldClip: {...entry.clip, trackId: entry.row.id},
            start: clip?.start ?? null,
            end: clip?.end ?? null,
            durationMillis: result.durationMillis,
            rangeEndMillis: result.rangeEndMillis,
            tracks: result.rows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('clip-extend', detail).defaultPrevented) return
        this._rows = result.rows
        this._localRowsDirty = true
        this._localDurationDirty = true
        this._interactionDurationMillis = result.durationMillis
        this._rangeEndMillis = result.rangeEndMillis
        this._emit('clip-extend', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('clip-extend', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Update the rendered clip color without rebuilding the timeline structure.
     *
     * @param {string} clipId - Clip identifier.
     * @param {Array} colorClasses - Web Awesome color classes.
     * @param {string} [timelineColor] - Optional custom CSS color.
     */
    _updateClipColorPresentation = (clipId, colorClasses, timelineColor = null) => {
        const element = [...this._root.querySelectorAll('[data-clip-id]')]
            .find(value => String(value.getAttribute('data-clip-id')) === String(clipId))
        if (!element) return
        const paletteClasses = [...element.classList]
            .filter(value => value === 'wa-neutral' || value.startsWith('wa-neutral-'))
        element.classList.remove(...paletteClasses)
        element.classList.add(...colorClasses)
        timelineUtils.applyTimelinePaletteStyles(element, colorClasses, timelineColor)
    }

    /**
     * Apply a Web Awesome palette color to one clip.
     *
     * @param {string} clipId - Clip identifier.
     * @param {string} value - Selected color value.
     * @param {Event} event - Triggering color-picker event.
     */
    _changeClipColor = (clipId, value, event) => {
        if (this._timelineConfig.editable === false) return false
        const entry = this._clipEditor.findClipEntry(this._rows, clipId)
        if (!entry || !this._isTrackEditable(entry.row) || entry.clip.editable === false) return false
        const colorSwatches = timelineUtils.normalizeTimelineColorSwatches(this._timelineConfig.swatches)
        const normalizedValue = String(value ?? '').trim().toLowerCase()
        const selectedSwatch = colorSwatches.find(swatch => swatch.color === normalizedValue || swatch.palette === normalizedValue)
        if (!selectedSwatch && !normalizedValue) return false
        const selectedValue = selectedSwatch?.color ?? normalizedValue
        const palette = selectedSwatch?.palette ?? timelineUtils.resolveTimelinePaletteFromValue(selectedValue, colorSwatches)
        const timelineColor = selectedSwatch
            ? null
            : (palette ?? selectedValue)
        const colorClasses = Array.isArray(selectedSwatch?.colorClasses)
            ? selectedSwatch.colorClasses
            : selectedSwatch
                ? ['wa-neutral', `wa-neutral-${selectedSwatch.palette}`]
                : (entry.clip.colorClasses ?? ['wa-neutral', 'wa-neutral-blue'])
        const clip = {...entry.clip, colorClasses, timelineColor, trackId: entry.row.id}
        const nextRows = this._rows.map(row => row.id === entry.row.id
            ? {...row, actions: (row.actions ?? row.clips ?? []).map(item => item.id === clipId ? {...item, colorClasses, timelineColor} : item)}
            : row)
        const detail = {
            clipId,
            trackId: entry.row.id,
            color: selectedValue,
            colorClasses,
            timelineColor,
            clip,
            tracks: nextRows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('clip-color-change', detail).defaultPrevented) return false
        this._rows = nextRows
        this._localRowsDirty = true
        this._emit('clip-color-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._updateClipColorPresentation(clipId, colorClasses, timelineColor)
        this._emitAfter('clip-color-change', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        return true
    }

    /**
     * Insert a clip from a clip-menu option at the current playhead.
     *
     * @param {Object} option - Clip insertion option.
     * @param {Event} event - Triggering click or drop event.
     * @param {{trackId?: string, start?: number}} [placement] - Optional drop placement.
     */
    _insertClip = (option, event, placement = {}) => {
        if (this._timelineConfig.editable === false) return
        const requestedTrackId = placement.trackId ?? option?.trackId ?? this._timelineConfig.defaultTrackId
        const target = this._rows.find(row => row.id === requestedTrackId && this._isTrackEditable(row))
            ?? this._rows.find(row => this._isTrackEditable(row) && timelineEditing.trackAcceptsClip(row, {kind: option?.kind ?? option?.key}))
        const start = Math.max(0, Number(placement.start ?? option?.start ?? (this._currentTimeMillis / 1000)) || 0)
        const duration = Math.max(0, Number(option?.duration ?? this._timelineConfig.defaultClipDuration ?? 1) || 0)
        const requestedId = option?.clip?.id
            ?? option?.id
            ?? `${option?.key ?? 'clip'}-${Date.now()}`
        const id = this._uniqueClipIdentifier(requestedId)
        const clip = {
            ...(option?.clip ?? {}),
            id,
            kind: option?.clip?.kind ?? option?.kind ?? option?.key ?? 'clip',
            label: option?.clip?.label ?? option?.label ?? option?.key ?? 'Clip',
            start,
            end: Number(option?.end) > start ? Number(option.end) : start + duration,
        }
        if (!target || !this._isTrackEditable(target) || !timelineEditing.trackAcceptsClip(target, clip)) {
            const detail = {group: option?.group, key: option?.key, option, clip: null, trackId: null, tracks: this.tracks, previousTracks: this.tracks, event, data: this._publicSnapshot()}
            if (this._emitBefore('add-clip', detail).defaultPrevented) return
            this._emit('add-clip', detail)
            this._emitAfter('add-clip', detail)
            return
        }
        const result = this._clipEditor.place({
            baseRows: timelineEditing.cloneRows(this._rows),
            clip,
            targetTrackId: target.id,
        })
        if (!result) {
            const detail = {group: option?.group, key: option?.key, option, clip: null, trackId: target.id, tracks: this.tracks, previousTracks: this.tracks, event, data: this._publicSnapshot()}
            if (this._emitBefore('add-clip', detail).defaultPrevented) return
            this._emit('add-clip', detail)
            this._emitAfter('add-clip', detail)
            return
        }
        const entry = this._clipEditor.findClipEntry(result.rows, id)
        const addedClip = entry ? Object.assign({}, entry.clip, {trackId: entry.row.id}) : null
        const detail = {
            group: option?.group,
            key: option?.key,
            option,
            clip: addedClip,
            trackId: target.id,
            durationMillis: result.durationMillis,
            tracks: result.rows.map(row => this._publicTrack(row)),
            previousTracks: this.tracks,
            event,
            data: this._publicSnapshot(),
        }
        if (this._emitBefore('add-clip', detail).defaultPrevented) return
        this._generatedClipIdentifiers.add(id)
        this._rows = result.rows
        this._localRowsDirty = true
        this._localDurationDirty = true
        if (addedClip) this._selectedClipKey = this._clipSelectionKey(addedClip.trackId, addedClip.id)
        this._interactionDurationMillis = result.durationMillis
        this._rangeEndMillis = result.rangeEndMillis
        this._emit('add-clip', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
        this._render()
        this._emitAfter('add-clip', {...detail, tracks: this.tracks, data: this._publicSnapshot()})
    }

    /**
     * Store a clip option in the native drag payload.
     *
     * @param {Object} option - Clip insertion option.
     * @param {DragEvent} event - Native drag event.
     */
    _startClipOptionDrag = (option, event) => {
        this._claimClipOptionDrag(option)
        const transfer = event.dataTransfer
        if (!transfer) return
        transfer.effectAllowed = 'copy'
        try {
            transfer.setData(timelineConstants.CLIP_OPTION_DRAG_MIME, JSON.stringify(option))
        } catch {
            transfer.setData('text/plain', String(option?.label ?? option?.key ?? 'Clip'))
        }
    }

    /**
     * Clear the track preview while the pointer is outside a drop track.
     *
     * @param {Object} option - Clip insertion option.
     * @param {DragEvent} event - Native drag event.
     */
    _previewExternalClipOutside = (option, event) => {
        if (!option || !this._surface) return
        const state = this._ensureClipOptionDragState(option, event, null)
        if (!state) return
        const pointer = this._externalClipPointerFromEvent(event, state)
        if (!pointer) return
        state.targetTrackId = null
        state.dropRejected = false
        state.lastResult = null
        state.snapTargetTime = null
        state.snapTargetClipId = null
        state.snapTargetEdge = null
        state.snapTargetKind = null
        this._rows = state.baseRows
        this._interactionDurationMillis = state.initialDurationMillis
        this._rangeEndMillis = state.initialRangeEndMillis
        this._clipScroll.stop()
        this._clearClipDropTrackFeedback()
        state.previewClip = null
        state.previewClientX = null
        state.previewClientY = null
        this._updateClipInteractionPresentation()
        this._queueExternalClipPreview(pointer, 'outside')
    }

    /**
     * Claim the shared native drag gesture for this timeline instance.
     *
     * @param {Object} option - Clip insertion option.
     * @returns {boolean} Whether this instance owns the gesture.
     */
    _claimClipOptionDrag = option => {
        if (!option) return false
        const previousOwner = timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner
        if (previousOwner && previousOwner !== this) previousOwner._releaseClipOptionDragOwnership()
        timelineConstants.timelineInteractionState.activeClipOptionDrag = {owner: this, option}
        this._draggedClipOption = option
        return true
    }

    /**
     * Check whether a track belongs to this timeline instance.
     *
     * @param {Element|null} track - Candidate track element.
     * @returns {boolean} Whether the track is rendered by this instance.
     */
    _ownsTrack = track => track?.getRootNode?.() === this._root

    /**
     * Release this timeline's ownership of a shared native drag gesture.
     */
    _releaseClipOptionDragOwnership = () => {
        if (timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner === this) timelineConstants.timelineInteractionState.activeClipOptionDrag = null
        this._draggedClipOption = null
        this._clearClipOptionDragPreview({render: true})
        this._clearClipDropTrackFeedback()
    }

    /**
     * Extract stable pointer data from a native drag event.
     *
     * A dragleave event often carries zeroed coordinates, so the last valid
     * pointer is retained for that event type.
     *
     * @param {DragEvent|Object} event - Native drag event.
     * @param {Object|null} state - Active external drag state.
     * @returns {Object|null} Stable pointer data.
     */
    _externalClipPointerFromEvent = (event, state = null) => {
        if (event?.type === 'dragleave' && state?.lastPointer) return state.lastPointer
        const clientX = Number(event?.clientX)
        const clientY = Number(event?.clientY)
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return state?.lastPointer ?? null
        const pointer = {
            clientX,
            clientY,
            shiftKey: event?.shiftKey === true,
            altKey: event?.altKey === true,
            ctrlKey: event?.ctrlKey === true,
            metaKey: event?.metaKey === true,
        }
        if (state) state.lastPointer = pointer
        return pointer
    }

    /**
     * Schedule one external preview calculation per animation frame.
     *
     * @param {Object} pointer - Stable pointer data.
     * @param {'track'|'outside'} mode - Preview mode.
     */
    _queueExternalClipPreview = (pointer, mode) => {
        const currentlyOutside = this._dragState?.external === true && !this._dragState.previewClip
        this._externalClipPreviewRequest = {pointer, mode}
        if (this._externalClipPreviewFrame !== null) {
            const modeChanged = (mode === 'outside') !== currentlyOutside
            if (modeChanged) this._flushExternalClipPreview()
            return
        }
        if (typeof globalThis.requestAnimationFrame !== 'function') {
            this._flushExternalClipPreview()
            return
        }
        this._externalClipPreviewFrame = globalThis.requestAnimationFrame(() => {
            this._externalClipPreviewFrame = null
            this._flushExternalClipPreview()
        })
        this._flushExternalClipPreview()
    }

    /**
     * Apply the latest queued external preview request.
     */
    _flushExternalClipPreview = () => {
        const request = this._externalClipPreviewRequest
        this._externalClipPreviewRequest = null
        if (!request || this._dragState?.external !== true) return
        if (request.mode === 'outside') {
            const state = this._dragState
            state.previewClip = null
            state.previewClientX = null
            state.previewClientY = null
            this._updateClipInteractionPresentation()
            return
        }
        this._clipEditor.preview(this._dragState, request.pointer)
    }

    /**
     * Cancel a pending external preview frame.
     */
    _cancelExternalClipPreview = () => {
        if (this._externalClipPreviewFrame !== null) globalThis.cancelAnimationFrame?.(this._externalClipPreviewFrame)
        this._externalClipPreviewFrame = null
        this._externalClipPreviewRequest = null
    }

    /**
     * Update drop feedback for a track when the payload value is unavailable.
     *
     * @param {string|null} rowId - Track identifier.
     * @param {boolean} rejected - Whether the track rejects the drag.
     */
    _updateClipDropTrackFeedback = (rowId, rejected) => {
        const presentation = this._resolveClipPresentationElements()
        const track = presentation.tracks.get(String(rowId))
        if (!track) return
        track.classList.remove('lgs1920-wa-timeline__track--clip-drop-target')
        track.classList.toggle('lgs1920-wa-timeline__track--clip-drop-rejected', rejected)
        presentation.trackBackgrounds.get(String(rowId))?.classList.toggle(
            'lgs1920-wa-timeline__track-background--clip-drop-rejected', rejected,
        )
        presentation.legends.get(String(rowId))?.classList.toggle(
            'lgs1920-wa-timeline__legend-row--clip-drop-rejected', rejected,
        )
        this.toggleAttribute('data-clip-drop-rejected', rejected)
    }

    /**
     * Clear all transient external drop feedback.
     */
    _clearClipDropTrackFeedback = () => {
        const presentation = this._resolveClipPresentationElements()
        presentation.tracks.forEach(track => track.classList.remove(
            'lgs1920-wa-timeline__track--clip-drop-target',
            'lgs1920-wa-timeline__track--clip-drop-rejected',
        ))
        presentation.trackBackgrounds.forEach(track => track.classList.remove(
            'lgs1920-wa-timeline__track-background--clip-drop-rejected',
        ))
        presentation.legends.forEach(legend => legend.classList.remove(
            'lgs1920-wa-timeline__legend-row--clip-drop-target',
            'lgs1920-wa-timeline__legend-row--clip-drop-rejected',
        ))
        this.removeAttribute('data-clip-drop-rejected')
    }

    /**
     * Clear the internal clip option drag state after a native drag ends.
     *
     * @param {DragEvent} event - Native drag event.
     */
    _endClipOptionDrag = event => {
        event.stopPropagation()
        if (timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner === this) timelineConstants.timelineInteractionState.activeClipOptionDrag = null
        this._draggedClipOption = null
        this._clearClipOptionDragPreview({render: false})
        this._clearClipDropTrackFeedback()
        this._render()
    }

    /**
     * Capture an option after an application source has populated the native
     * drag payload. The listener is intentionally on window so sources outside
     * the component can participate in the same timeline drag mechanism.
     *
     * @param {DragEvent} event - Native drag-start event.
     */
    _handleWindowClipOptionDragStart = event => {
        const option = this._clipOptionFromDragEvent(event)
        if (!option) return
        if (timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner && timelineConstants.timelineInteractionState.activeClipOptionDrag.owner !== this
            && timelineConstants.timelineInteractionState.activeClipOptionDrag.owner.isConnected) return
        if (this._isReadonlyMode() || this._timelineConfig.editable === false) return
        this._claimClipOptionDrag(option)
        this._previewExternalClipOutside(option, event)
    }

    /**
     * Keep the external preview moving when the browser emits `drag` without
     * a corresponding `dragover` on the timeline surface.
     *
     * @param {DragEvent} event - Native drag event.
     */
    _handleWindowClipOptionDrag = event => this._handleWindowClipOptionDragOver(event)

    /**
     * Keep an external clip preview active when the browser does not expose
     * the drag payload on the shadow track event yet.
     *
     * @param {DragEvent} event - Native drag-over event.
     */
    _handleWindowClipOptionDragOver = event => {
        const option = this._clipOptionFromDragEvent(event) ?? timelineConstants.timelineInteractionState.activeClipOptionDrag?.option ?? null
        if (!option || !this._surface) return
        const allowExternalPreview = () => {
            if (timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner !== this) return
            this._previewExternalClipOutside(option, event)
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
            if (event.type === 'dragover') event.preventDefault()
        }
        const pathTrack = event.composedPath?.().find(target => target?.getAttribute?.('part') === 'track')
        if (pathTrack && pathTrack.getRootNode?.() !== this._root) return
        const pathRow = pathTrack
            ? this._rows.find(row => String(row.id) === String(pathTrack.getAttribute('data-row-id')))
            : null
        if (pathTrack && pathRow) {
            this._claimClipOptionDrag(option)
            this._handleClipDragOver(event, pathRow.id, pathTrack)
            if (this._dragState?.external === true) this._clipScroll.update(event)
            return
        }
        const surfaceRect = this._surface.getBoundingClientRect()
        const insideSurface = event.clientX >= surfaceRect.left && event.clientX <= surfaceRect.right
            && event.clientY >= surfaceRect.top && event.clientY <= surfaceRect.bottom
        if (insideSurface) {
            const row = this._trackAtClientY(event.clientY)
            const track = row
                ? [...this._root.querySelectorAll('[part="track"]')]
                    .find(element => element.getAttribute('data-row-id') === String(row.id))
                : null
            if (row && track) {
                this._claimClipOptionDrag(option)
                this._handleClipDragOver(event, row.id, track)
                if (this._dragState?.external === true) this._clipScroll.update(event)
                return
            }
        }
        allowExternalPreview()
    }

    /**
     * Commit a drop using the track from the composed event path when present.
     *
     * @param {DragEvent} event - Native drop event.
     * @returns {boolean} Whether a track handled the drop.
     */
    _dropClipOptionFromEventPath = event => {
        const track = event.composedPath?.().find(target => target?.getAttribute?.('part') === 'track')
        if (!track || track.getRootNode?.() !== this._root) return false
        const row = this._rows.find(value => String(value.id) === String(track.getAttribute('data-row-id')))
        if (!row) return false
        const option = this._clipOptionFromDragEvent(event) ?? timelineConstants.timelineInteractionState.activeClipOptionDrag?.option ?? null
        if (option) this._claimClipOptionDrag(option)
        this._handleClipDrop(event, row.id, track)
        return true
    }

    /**
     * Commit an external clip drop before Shadow DOM propagation can hide it
     * from the track listener.
     *
     * @param {DragEvent} event - Native drop event.
     */
    _handleWindowClipOptionDrop = event => {
        const option = this._clipOptionFromDragEvent(event) ?? timelineConstants.timelineInteractionState.activeClipOptionDrag?.option ?? null
        if (!option || !this._surface) return
        if (this._dropClipOptionFromEventPath(event)) return
        const surfaceRect = this._surface.getBoundingClientRect()
        if (event.clientX < surfaceRect.left || event.clientX > surfaceRect.right
            || event.clientY < surfaceRect.top || event.clientY > surfaceRect.bottom) return
        const row = this._trackAtClientY(event.clientY)
        if (!row) return
        const track = [...this._root.querySelectorAll('[part="track"]')]
            .find(element => element.getAttribute('data-row-id') === String(row.id))
        if (!track) return
        this._claimClipOptionDrag(option)
        this._handleClipDrop(event, row.id, track)
    }

    /**
     * Clear an application-provided clip drag when its native gesture ends.
     *
     * @param {DragEvent} event - Native drag-end event.
     */
    _handleWindowClipOptionDragEnd = event => {
        if (timelineConstants.timelineInteractionState.activeClipOptionDrag?.owner && timelineConstants.timelineInteractionState.activeClipOptionDrag.owner !== this) return
        if (!this._hasClipOptionDragType(event) && !this._draggedClipOption) return
        this._endClipOptionDrag(event)
    }

    /**
     * Read a clip option from a native drag payload.
     *
     * @param {DragEvent} event - Native drag event.
     * @returns {Object|null} Dragged clip option.
     */
    _clipOptionFromDragEvent = event => {
        const raw = event.dataTransfer?.getData?.(timelineConstants.CLIP_OPTION_DRAG_MIME)
            || event.dataTransfer?.getData?.('text/plain')
        if (raw) {
            try {
                const option = JSON.parse(raw)
                if (option && typeof option === 'object' && (option.group || option.clip || option.duration)) return option
            } catch {
                // Browsers may expose a non-JSON text fallback while hiding
                // the application payload. The drag-start state remains the
                // authoritative option in that case.
            }
        }
        return this._draggedClipOption
    }

    /**
     * Restore the controlled rows after a transient external clip preview.
     *
     * @param {{render?: boolean}} [options] - Cleanup options.
     */
    _clearClipOptionDragPreview = ({render = true} = {}) => {
        const state = this._dragState
        this._cancelExternalClipPreview()
        if (state?.external !== true) return
        this._clipScroll?.stop()
        this._rows = state.baseRows
        this._interactionDurationMillis = state.initialDurationMillis
        this._rangeEndMillis = state.initialRangeEndMillis
        this._dragState = null
        this.removeAttribute('data-clip-drop-rejected')
        this._clearClipDropTrackFeedback()
        if (render) this._render()
    }

    /**
     * Create the transient state used to preview an application clip option.
     * The pointer maps to the beginning edge of the clip. Snap may then move
     * that beginning edge to a ruler or clip boundary.
     *
     * @param {Object} option - Clip insertion option.
     * @param {DragEvent} event - Native drag event.
     * @param {string} rowId - Target track identifier.
     * @returns {Object|null} External drag state.
     */
    _ensureClipOptionDragState = (option, event, rowId) => {
        if (!option) return null
        const existing = this._dragState?.external === true ? this._dragState : null
        if (existing && existing.optionSignature === JSON.stringify(option)) {
            existing.targetTrackId = rowId
            existing.option = option
            return existing
        }
        const duration = Math.max(0, Number(option.duration ?? this._timelineConfig.defaultClipDuration ?? 1) || 0)
        const requestedId = option?.clip?.id ?? option?.id ?? option?.key ?? 'clip'
        const previewId = `__lgs1920-clip-option-${this._uniqueClipIdentifier(requestedId)}`
        const optionClip = {
            ...(option.clip ?? {}),
            id: previewId,
            kind: option.clip?.kind ?? option.kind ?? option.key ?? 'clip',
            label: option.clip?.label ?? option.label ?? option.key ?? 'Clip',
            start: 0,
            end: Number(option.end) > 0 ? Number(option.end) : duration,
        }
        const initialDurationMillis = this._durationMillis()
        this._dragState = {
            type: 'clip',
            external: true,
            pending: false,
            activated: true,
            mode: 'move',
            edge: null,
            clipId: previewId,
            option,
            optionSignature: JSON.stringify(option),
            optionClip,
            sourceTrackId: rowId,
            targetTrackId: rowId,
            startX: Number(event.clientX) || 0,
            startY: Number(event.clientY) || 0,
            pointerId: null,
            pointerType: 'mouse',
            sourceElement: null,
            startTime: 0,
            pointerOffsetSeconds: Math.max(0, optionClip.end - optionClip.start) / 2,
            targetTime: 0,
            originalStart: 0,
            originalEnd: Math.max(0, optionClip.end - optionClip.start),
            initialDurationMillis,
            initialRangeEndMillis: this._rangeEndMillis,
            wasSelected: false,
            baseRows: timelineEditing.cloneRows(this._rows),
            lastPointer: this._externalClipPointerFromEvent(event),
            lastResult: null,
            snapTargetKind: null,
            lastUnsnappedInterval: {start: 0, end: Math.max(0, optionClip.end - optionClip.start)},
            dragStart: {
                clientX: Number(event.clientX) || 0,
                clientY: Number(event.clientY) || 0,
                time: 0,
                timeMillis: 0,
                trackId: rowId,
            },
        }
        return this._dragState
    }

    /**
     * Check whether a native drag carries a timeline clip option payload.
     *
     * Browsers expose the payload type during `dragover`, but may hide its
     * value until the final `drop` event. The type is enough to authorize the
     * drop target; the option is validated again when the drop is committed.
     *
     * @param {DragEvent} event - Native drag event.
     * @returns {boolean} Whether the drag carries a clip option.
     */
    _hasClipOptionDragType = event => [...(event.dataTransfer?.types ?? [])]
        .some(type => String(type).toLowerCase() === timelineConstants.CLIP_OPTION_DRAG_MIME)

    /**
     * Check whether a track can receive an option whose value is unavailable
     * during `dragover`.
     *
     * @param {string} rowId - Target track identifier.
     * @returns {boolean} Whether the track can receive a clip drop.
     */
    _canReceiveClipOption = rowId => {
        if (this._isReadonlyMode() || this._timelineConfig.editable === false) return false
        const row = this._rows.find(value => value.id === rowId)
        return Boolean(row && this._isTrackEditable(row)
            && row.droppable !== false
            && row.acceptsClips !== false)
    }

    /**
     * Accept drag-over events for new clip insertion.
     *
     * @param {DragEvent} event - Native drag event.
     * @param {string} rowId - Target track identifier.
     * @param {HTMLElement} track - Target track element.
     */
    _handleClipDragOver = (event, rowId, track) => {
        if (!this._ownsTrack(track)) return
        const option = this._clipOptionFromDragEvent(event) ?? timelineConstants.timelineInteractionState.activeClipOptionDrag?.option ?? null
        const canReceive = this._canReceiveClipOption(rowId)
        const isClipOptionDrag = Boolean(option) || this._hasClipOptionDragType(event)
        if (!isClipOptionDrag) return
        event.preventDefault()
        event.stopPropagation()
        if (option) {
            this._claimClipOptionDrag(option)
            const state = this._ensureClipOptionDragState(option, event, rowId)
            const pointer = this._externalClipPointerFromEvent(event, state)
            if (!pointer) return
            state.targetTrackId = rowId
            this._queueExternalClipPreview(pointer, 'track')
            if (event.dataTransfer) event.dataTransfer.dropEffect = state.dropRejected ? 'none' : 'copy'
            return
        }
        if (!canReceive) {
            this._updateClipDropTrackFeedback(rowId, true)
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
            return
        }
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        track.classList.add('lgs1920-wa-timeline__track--clip-drop-target')
    }

    /**
     * Remove the insertion target state when a dragged option leaves a track.
     *
     * @param {DragEvent} event - Native drag event.
     * @param {HTMLElement} track - Target track element.
     */
    _handleClipDragLeave = (event, track) => {
        if (!this._ownsTrack(track)) return
        if (event.relatedTarget && track.contains(event.relatedTarget)) return
        if (this._dragState?.external === true) {
            this._previewExternalClipOutside(this._dragState.option, event)
            this._clearClipDropTrackFeedback()
            return
        }
        this._updateClipDropTrackFeedback(track.getAttribute('data-row-id'), false)
    }

    /**
     * Insert a new clip at the horizontal drop position.
     *
     * @param {DragEvent} event - Native drop event.
     * @param {string} rowId - Target track identifier.
     * @param {HTMLElement} track - Target track element.
     */
    _handleClipDrop = (event, rowId, track) => {
        if (!this._ownsTrack(track)) return
        const option = this._clipOptionFromDragEvent(event)
            ?? timelineConstants.timelineInteractionState.activeClipOptionDrag?.option
            ?? this._dragState?.option
            ?? null
        this._updateClipDropTrackFeedback(rowId, false)
        if (!option) return
        this._claimClipOptionDrag(option)
        if (!this._canReceiveClipOption(rowId)) {
            event.preventDefault()
            event.stopPropagation()
            this._clearClipOptionDragPreview({render: true})
            return
        }
        event.preventDefault()
        event.stopPropagation()
        let state = this._dragState?.external === true ? this._dragState : null
        if (!state || state.optionSignature !== JSON.stringify(option)) {
            state = this._ensureClipOptionDragState(option, event, rowId)
        }
        state.targetTrackId = rowId
        const pointer = this._externalClipPointerFromEvent(event, state)
        this._cancelExternalClipPreview()
        this._clipEditor.preview(state, pointer ?? event)
        const accepted = state && state.dropRejected !== true && state.lastResult
        const start = accepted && Number.isFinite(Number(state.previewClip?.start))
            ? state.previewClip.start
            : null
        this._clearClipOptionDragPreview({render: false})
        if (!accepted || start === null) {
            this._render()
            return
        }
        this._insertClip(option, event, {
            trackId: rowId,
            start,
        })
    }

    /**
     * Convert a surface client coordinate to timeline seconds.
     *
     * @param {number} clientX - Pointer client coordinate.
     * @returns {number} Timeline seconds.
     */
}
