/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineStateMixin.js
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

import {clamp} from './timelineUtils.js'

/**
 * Add controlled-state synchronization methods to a timeline host.
 *
 * @param {typeof HTMLElement} Base - Host class.
 * @returns {typeof HTMLElement} Extended host class.
 */
export const TimelineStateMixin = Base => class extends Base {
    _requestControlledSync = ({forceRender = false, zoomPercent} = {}) => {
        if (this._controlledUpdateDepth > 0) {
            this._controlledSyncPending = true
            this._controlledSyncForceRender ||= forceRender
            if (Number.isFinite(Number(zoomPercent))) this._controlledSyncZoomPercent = zoomPercent
            return
        }
        this._syncPublicProps({forceRender, zoomPercent})
    }

    /**
     * Flush a pending controlled synchronization after a transaction.
     */
    _flushControlledSync = () => {
        if (!this._controlledSyncPending) return
        const forceRender = this._controlledSyncForceRender
        const zoomPercent = this._controlledSyncZoomPercent
        this._controlledSyncPending = false
        this._controlledSyncForceRender = false
        this._controlledSyncZoomPercent = undefined
        this._syncPublicProps({forceRender, zoomPercent})
    }

    /**
     * Synchronize the public properties with the internal editor projection.
     */
    _syncPublicProps = ({zoomPercent, forceRender = false} = {}) => {
        const durationMillis = Number(this._timelineConfig.durationMillis
            ?? (Number(this._timelineConfig.durationSeconds) * 1000)) || 0
        const sourceTracks = this._localRowsDirty
            ? this._rows.map(row => this._publicTrack(row))
            : this._trackDefinitions
        const editorData = sourceTracks.map(track => ({
            ...track,
            actions: track.clips ?? [],
        }))
        this._applyState({
            projection: {...this._timelineConfig, durationMillis, durationSeconds: durationMillis / 1000, editorData},
            currentTimeMillis: this._currentTimeMillis,
            playing: this._playing,
            visible: this._visible,
            clipOptions: this._clipOptions,
            zoomPercent,
            forceRender,
            rangeStartMillis: this._timelineConfig.rangeStartMillis,
            rangeEndMillis: this._localDurationDirty
                ? this._rangeEndMillis
                : (this._timelineConfig.rangeEndMillis ?? durationMillis),
        })
    }

    /**
     * Apply normalized controlled state to internal presentation state.
     *
     * @param {Object} state - Normalized timeline state.
     */
    _applyState = (state = {}) => {
        if (this._dragState?.type === 'clip') {
            const pendingState = Object.assign({}, this._pendingControlledState, state)
            pendingState.forceRender = Boolean(this._pendingControlledState?.forceRender || state.forceRender)
            this._pendingControlledState = pendingState
            return
        }
        const nextProjection = state.projection ?? null
        const incomingRows = state.editorData ?? nextProjection?.editorData ?? state.rows ?? []
        const previousRows = this._rows
        const sourceRows = this._trackDefinitions.map(row => ({
            ...row,
            actions: row.clips ?? [],
        }))
        const preserveLocalRows = this._localRowsDirty
            && (
                this._stateSignatures.rowsEqual(incomingRows, sourceRows)
                || this._stateSignatures.rowsEqual(incomingRows, this._rows)
            )
        const nextRows = preserveLocalRows ? this._rows : incomingRows
        const previousTimeMillis = this._currentTimeMillis
        const nextPlaying = state.playing === true
        const playingChanged = Object.prototype.hasOwnProperty.call(state, 'playing')
            && nextPlaying !== this._playing
        const playbackResumed = playingChanged && !nextPlaying
        const patchInPlace = !playbackResumed
            && state.forceRender !== true
            && this._canPatchControlledState(nextProjection, nextRows, state)
        const rowsPresentationChanged = !this._stateSignatures.sameRows(previousRows, nextRows)
            && !this._stateSignatures.rowsEqual(previousRows, nextRows)
        const rowsOnly = rowsPresentationChanged
            && !playbackResumed
            && state.forceRender !== true
            && this._canPatchRowsInPlace(nextProjection, nextRows, state)
        this._projection = nextProjection
        this._rows = nextRows
        const wasPlaying = this._playing
        this._playing = nextPlaying
        this.toggleAttribute('data-playback-active', this._playing)
        const playbackStarted = !wasPlaying && this._playing
        if (playbackStarted) {
            this._removePointerListeners()
            this._closeClipContextMenu()
            this._closeTrackContextMenu()
            this._menuOpen = false
            this._editingRowId = null
            this._editingLabelValue = ''
        }
        this._visible = state.visible !== false
        this._clipOptions = state.clipOptions === null || state.clipOptions === undefined
            ? null
            : (Array.isArray(state.clipOptions) ? state.clipOptions : [])
        if (nextProjection?.horizontalFit === true) {
            this._horizontalFitActive = true
        }
        else if (Number.isFinite(Number(state.zoomPercent))) {
            this._horizontalFitActive = false
            this._zoom = this._clampHorizontalZoom(state.zoomPercent)
        }
        const projectionDurationMillis = Number(this._projection?.durationMillis) || 0
        const durationMillis = this._localDurationDirty && Number.isFinite(this._interactionDurationMillis)
            ? Math.max(projectionDurationMillis, this._interactionDurationMillis)
            : projectionDurationMillis
        if (Number.isFinite(Number(state.rangeStartMillis))) {
            this._rangeStartMillis = clamp(Number(state.rangeStartMillis), 0, durationMillis)
        } else {
            this._rangeStartMillis = 0
        }
        if (Number.isFinite(Number(state.rangeEndMillis))) {
            this._rangeEndMillis = clamp(Math.max(this._rangeStartMillis, Number(state.rangeEndMillis)), this._rangeStartMillis, durationMillis)
        } else {
            this._rangeEndMillis = durationMillis
        }
        this._currentTimeMillis = this._normalizeTime(
            playbackStarted ? this._rangeStartMillis : (state.currentTimeMillis ?? 0),
            false,
        )
        if (!patchInPlace && rowsOnly && this._updateRowsInPlace({majorSeconds: this._resolveScale().majorSeconds})) {
            this._followPlaybackViewport(previousTimeMillis)
            return
        }
        if (!patchInPlace) {
            this._render({replaceRoot: true})
            this._followPlaybackViewport(previousTimeMillis)
            return
        }
        if (rowsPresentationChanged) this._updateClipInteractionPresentation()
        else this._updateDynamicState()
        this._updatePlaybackButton()
        this._updatePlaybackEditingPresentation()
        this._followPlaybackViewport(previousTimeMillis)
    }

    /**
     * Check whether controlled clip data can update the existing DOM in place.
     *
     * @param {Object|null} projection - Next normalized projection.
     * @param {Array} rows - Next editor rows.
     * @param {Object} state - Other controlled values that may require a full render.
     * @returns {boolean} Whether a full structure render is unnecessary.
     */
    _canPatchControlledState = (projection, rows, state) => {
        if (!this._surface || !this._tracksViewport || !projection) return false
        const currentDuration = Number(this._projection?.durationMillis) || 0
        const nextDuration = Number(projection.durationMillis) || 0
        if (currentDuration !== nextDuration) return false
        if (state.visible !== undefined && state.visible !== this._visible) return false
        if (Number.isFinite(Number(state.zoomPercent))) return false
        if (!this._stateSignatures.valuesEqual(this._clipOptions, state.clipOptions ?? null)) return false

        return this._stateSignatures.sameRows(this._rows, rows)
            || this._stateSignatures.rowPresentationEqual(this._rows, rows)
    }

    /**
     * Check whether changed rows can be rebuilt without replacing the timeline shell.
     *
     * @param {Object|null} projection - Next normalized projection.
     * @param {Array} rows - Next editor rows.
     * @param {Object} state - Other controlled values that may require a full render.
     * @returns {boolean} Whether row containers can be refreshed in place.
     */
    _canPatchRowsInPlace = (projection, rows, state) => {
        if (!this._surface || !this._tracksViewport || !projection || !Array.isArray(rows)) return false
        if (this._dragState) return false
        const currentDuration = Number(this._projection?.durationMillis) || 0
        const nextDuration = Number(projection.durationMillis) || 0
        if (currentDuration !== nextDuration) return false
        if (state.visible !== undefined && state.visible !== this._visible) return false
        if (Number.isFinite(Number(state.zoomPercent))) return false
        return this._stateSignatures.valuesEqual(this._clipOptions, state.clipOptions ?? null)
    }

    /**
     * Select the configuration fields that determine the rendered structure.
     *
     * @param {Object} config - Timeline configuration.
     * @param {Array<string>} keys - Structure-affecting field names.
     * @returns {Array} Structure values.
     */
    _structureConfig = (config, keys) => keys.map(key => [key, config?.[key]])

    /**
     * Set the controlled logical time without emitting a seek event.
     *
     * @param {number} timeMillis - Logical time in milliseconds.
     */
}
