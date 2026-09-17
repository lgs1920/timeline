/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineTimeInteraction.js
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

import {TIMELINE_HORIZONTAL_ARROW_KEYS} from './timelineInteraction.js'
import {clamp, START_LEFT} from './timelineUtils.js'

/**
 * Create the timeline range, playhead, and ruler interaction controller.
 *
 * @param {Object} options - Timeline state accessors and callbacks.
 * @returns {Object} Time interaction controller.
 */
export const createTimelineTimeInteraction = options => {
    const {
        addPointerListeners,
        capturePointer,
        clampCurrentTimeToRange,
        emit,
        emitAfter,
        emitBefore,
        getConfig,
        getContentWidth,
        getCurrentTimeMillis,
        getDragState,
        getDurationMillis,
        getDynamicElements,
        getRangeEndMillis,
        getRangeEndFollowsDuration,
        getRangeStartMillis,
        getScaleWidth,
        getSurface,
        getTimeAtClientX,
        handleEdgeAutoScroll,
        isReadonlyMode,
        numericToken,
        normalizeTime,
        releasePointerCapture,
        resolveScale,
        setCurrentTimeMillis,
        setDragState,
        setRangeEndFollowsDuration,
        setRangeEndMillis,
        setRangeStartMillis,
        setSuppressRangeClick,
        getSuppressRangeClick,
        updateDynamicState,
        updatePlayheadPosition,
    } = options

    const rangeChangeDetail = (event, rangeStartMillis = getRangeStartMillis(), rangeEndMillis = getRangeEndMillis()) => ({
        rangeStartMillis,
        rangeEndMillis,
        durationMillis: getDurationMillis(),
        event,
    })

    const startRangeInteraction = (event, edge) => {
        const config = getConfig()
        if (event.button !== 0 || isReadonlyMode() || config.editable === false) return
        event.preventDefault()
        event.stopPropagation()
        setSuppressRangeClick(true)
        capturePointer(event)
        const state = {
            type: 'range',
            edge,
            startX: event.clientX,
            pointerId: event.pointerId,
            initialStartMillis: getRangeStartMillis(),
            initialEndMillis: getRangeEndMillis(),
            initialRangeEndFollowsDuration: getRangeEndFollowsDuration(),
        }
        setDragState(state)
        setRangeEndFollowsDuration(false)
        const detail = rangeChangeDetail(event)
        if (emitBefore('range-change', detail).defaultPrevented) {
            setSuppressRangeClick(false)
            setRangeEndFollowsDuration(state.initialRangeEndFollowsDuration)
            setDragState(null)
            releasePointerCapture()
            return
        }
        addPointerListeners()
        emit('range-change-start', detail)
        handleEdgeAutoScroll(event)
    }

    const previewRangeInteraction = event => {
        const state = getDragState()
        if (state?.type !== 'range') return
        const nextMillis = clamp(getTimeAtClientX(event.clientX) * 1000, 0, getDurationMillis())
        if (state.edge === 'start') setRangeStartMillis(Math.min(nextMillis, getRangeEndMillis()))
        else setRangeEndMillis(Math.max(nextMillis, getRangeStartMillis()))
        clampCurrentTimeToRange()
        emit('range-changing', rangeChangeDetail(event))
        updateDynamicState()
    }

    const setRangeBoundaryToLimit = (edge, event) => {
        const config = getConfig()
        if (isReadonlyMode() || config.editable === false) return
        event.preventDefault()
        event.stopPropagation()
        const rangeStartMillis = edge === 'start' ? 0 : getRangeStartMillis()
        const rangeEndMillis = edge === 'end' ? getDurationMillis() : getRangeEndMillis()
        const detail = rangeChangeDetail(event, rangeStartMillis, rangeEndMillis)
        if (emitBefore('range-change', detail).defaultPrevented) return
        setRangeEndFollowsDuration(false)
        setRangeStartMillis(rangeStartMillis)
        setRangeEndMillis(rangeEndMillis)
        clampCurrentTimeToRange()
        const committedDetail = rangeChangeDetail(event)
        emit('range-change', committedDetail)
        updateDynamicState()
        emitAfter('range-change', committedDetail)
    }

    const moveRangeByKeyboard = (edge, event) => {
        const config = getConfig()
        if (!TIMELINE_HORIZONTAL_ARROW_KEYS.includes(event.key)) return
        if (isReadonlyMode() || config.editable === false) return
        event.preventDefault()
        event.stopPropagation()
        const step = Number(config.keyboardStepSeconds) > 0 ? Number(config.keyboardStepSeconds) * 1000 : 100
        const delta = (event.key === 'ArrowRight' ? 1 : -1) * step * (event.shiftKey ? 10 : 1)
        const rangeStartMillis = edge === 'start'
            ? clamp(getRangeStartMillis() + delta, 0, getRangeEndMillis())
            : getRangeStartMillis()
        const rangeEndMillis = edge === 'end'
            ? clamp(getRangeEndMillis() + delta, getRangeStartMillis(), getDurationMillis())
            : getRangeEndMillis()
        const detail = rangeChangeDetail(event, rangeStartMillis, rangeEndMillis)
        if (emitBefore('range-change', detail).defaultPrevented) return
        setRangeEndFollowsDuration(false)
        setRangeStartMillis(rangeStartMillis)
        setRangeEndMillis(rangeEndMillis)
        clampCurrentTimeToRange()
        const committedDetail = rangeChangeDetail(event)
        emit('range-change', committedDetail)
        updateDynamicState()
        emitAfter('range-change', committedDetail)
    }

    const startPlayheadInteraction = event => {
        if (event.button !== 0 || getConfig().interactive === false) return
        event.preventDefault()
        event.stopPropagation()
        capturePointer(event)
        const gripRect = event.currentTarget?.getBoundingClientRect?.()
        const gripCenter = gripRect && Number.isFinite(gripRect.left) && Number.isFinite(gripRect.width) && gripRect.width > 0
            ? gripRect.left + (gripRect.width / 2)
            : event.clientX
        setDragState({
            type: 'playhead',
            pointerId: event.pointerId,
            initialTimeMillis: getCurrentTimeMillis(),
            pointerOffsetX: event.clientX - gripCenter,
        })
        addPointerListeners()
        handleEdgeAutoScroll(event)
    }

    const movePlayheadByKeyboard = event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        const minimum = getRangeStartMillis()
        const maximum = Math.max(minimum, getRangeEndMillis())
        let timeMillis
        if (event.altKey) timeMillis = event.key === 'ArrowRight' ? minimum : maximum
        else {
            const config = getConfig()
            const step = Number(config.keyboardStepSeconds) > 0 ? Number(config.keyboardStepSeconds) * 1000 : 100
            const delta = (event.key === 'ArrowRight' ? 1 : -1) * step * (event.shiftKey ? 10 : 1)
            timeMillis = clamp(getCurrentTimeMillis() + delta, minimum, maximum)
        }
        const detail = {
            timeMillis,
            progress: getDurationMillis() > 0 ? timeMillis / getDurationMillis() : 0,
            settled: true,
            event,
        }
        if (emitBefore('seek', detail).defaultPrevented) return
        setCurrentTimeMillis(timeMillis)
        emit('seek', detail)
        updateDynamicState()
        emitAfter('seek', detail)
    }

    const setRangeBoundaryAtTime = (edge, timeMillis, event) => {
        const config = getConfig()
        if (isReadonlyMode() || config.editable === false) return
        const boundedTimeMillis = clamp(Number(timeMillis) || 0, 0, getDurationMillis())
        const nextStart = edge === 'start' ? Math.min(boundedTimeMillis, getRangeEndMillis()) : getRangeStartMillis()
        const nextEnd = edge === 'end' ? Math.max(boundedTimeMillis, getRangeStartMillis()) : getRangeEndMillis()
        const detail = rangeChangeDetail(event, nextStart, nextEnd)
        if (emitBefore('range-change', detail).defaultPrevented) return
        setRangeEndFollowsDuration(false)
        setRangeStartMillis(nextStart)
        setRangeEndMillis(nextEnd)
        clampCurrentTimeToRange()
        const committedDetail = rangeChangeDetail(event)
        emit('range-change', committedDetail)
        updateDynamicState()
        emitAfter('range-change', committedDetail)
    }

    const handleRulerClick = event => {
        const config = getConfig()
        if (isReadonlyMode() || config.interactive === false || event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        const durationMillis = getDurationMillis()
        const timeMillis = clamp(getTimeAtClientX(event.clientX) * 1000, 0, durationMillis)
        if (event.altKey && !event.ctrlKey) {
            if (timeMillis <= getRangeEndMillis()) setRangeBoundaryAtTime('start', timeMillis, event)
            return
        }
        if (event.ctrlKey && !event.altKey) {
            if (timeMillis >= getRangeStartMillis()) setRangeBoundaryAtTime('end', timeMillis, event)
            return
        }
        if (!event.altKey && !event.ctrlKey) seek(event.clientX, true)
    }

    const handleRulerPointerDown = event => {
        const config = getConfig()
        if (isReadonlyMode() || config.interactive === false || event.button !== 0 || event.altKey || event.ctrlKey) return
        const surface = getSurface()
        const rect = surface?.getBoundingClientRect()
        const duration = getDurationMillis()
        if (!rect || duration <= 0) return
        const {majorSeconds} = resolveScale()
        const scaleWidth = getScaleWidth()
        const scaleOffset = numericToken('scale-offset', START_LEFT)
        const x = clamp(event.clientX - rect.left + (surface?.scrollLeft ?? 0), scaleOffset, getContentWidth())
        const timeMillis = normalizeTime(((x - scaleOffset) / scaleWidth) * majorSeconds * 1000, false)
        setCurrentTimeMillis(timeMillis)
        updatePlayheadPosition(getDynamicElements())
    }

    const snapPlayheadToRangeBoundary = (timeMillis, majorSeconds, scaleWidth) => {
        const state = getDragState()
        const config = getConfig()
        if (state?.type !== 'playhead' || config.snap === false) return timeMillis
        const configuredThreshold = Number(config.snapThresholdPixels)
        const thresholdPixels = Number.isFinite(configuredThreshold) && configuredThreshold >= 0 ? configuredThreshold : 8
        const pixelsPerSecond = Number(scaleWidth) / Math.max(Number.EPSILON, Number(majorSeconds))
        const thresholdMillis = (thresholdPixels / Math.max(Number.EPSILON, pixelsPerSecond)) * 1000
        const boundaries = [getRangeStartMillis(), getRangeEndMillis()]
        const nearest = boundaries
            .map(boundary => ({boundary, distance: Math.abs(boundary - timeMillis)}))
            .sort((left, right) => left.distance - right.distance)[0]
        return nearest && nearest.distance <= thresholdMillis + 1e-9 ? nearest.boundary : timeMillis
    }

    const seek = (clientX, settled) => {
        if (getSuppressRangeClick()) return
        const surface = getSurface()
        const rect = surface?.getBoundingClientRect()
        const duration = getDurationMillis()
        if (!rect || duration <= 0) return
        const {majorSeconds} = resolveScale()
        const scaleWidth = getScaleWidth()
        const scaleOffset = numericToken('scale-offset', START_LEFT)
        const x = clamp(clientX - rect.left + (surface?.scrollLeft ?? 0), scaleOffset, getContentWidth())
        const proposedTimeMillis = normalizeTime(((x - scaleOffset) / scaleWidth) * majorSeconds * 1000, false)
        const timeMillis = snapPlayheadToRangeBoundary(proposedTimeMillis, majorSeconds, scaleWidth)
        const detail = {
            timeMillis,
            progress: duration > 0 ? timeMillis / duration : 0,
            settled,
            source: 'manual-seek',
        }
        if (emitBefore('seek', detail).defaultPrevented) return
        setCurrentTimeMillis(timeMillis)
        emit('seek', detail)
        updateDynamicState()
        if (settled) emitAfter('seek', detail)
    }

    return {
        handleRulerClick,
        handleRulerPointerDown,
        movePlayheadByKeyboard,
        moveRangeByKeyboard,
        previewRangeInteraction,
        rangeChangeDetail,
        seek,
        setRangeBoundaryAtTime,
        setRangeBoundaryToLimit,
        snapPlayheadToRangeBoundary,
        startPlayheadInteraction,
        startRangeInteraction,
    }
}
