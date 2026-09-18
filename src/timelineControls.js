/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineControls.js
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
 * Create the timeline navigation and view controls.
 *
 * The component owns the state and event lifecycle. This module only builds
 * control DOM and forwards control changes through the supplied callbacks.
 *
 * @param {Object} options - Control dependencies.
 * @returns {Object} Control builders and handlers.
 */
export const createTimelineControls = ({
    createElement,
    createIcon,
    formatRulerTime,
    maxRowHeight,
    minRowHeight,
    button,
    tooltip,
    getConfig,
    getHostNoDragClasses,
    getHorizontalFitActive,
    setHorizontalFitActive,
    getZoom,
    setZoom,
    getMinimumHorizontalZoom,
    clampHorizontalZoom,
    getNumericToken,
    getRowHeight,
    setRowHeight,
    render,
    getRangeStartMillis,
    getRangeEndMillis,
    getCurrentTimeMillis,
    setCurrentTimeMillis,
    getFrameIntervalMillis,
    getDurationMillis,
    getDurationSeconds,
    getReadonly,
    getCutMode,
    toggleCutMode,
    getCanUndo,
    getCanRedo,
    undo,
    redo,
    normalizeTime,
    updateDynamicState,
    emitBefore,
    emit,
    emitAfter,
}) => {
    const timelineEditTools = () => {
        const config = getConfig()
        if (getReadonly()
            || config.interactive === false
            || config.editable === false
            || config.toolsHidden === true) return null
        const tools = createElement('span', `lgs1920-wa-timeline__edit-tools${getHostNoDragClasses()}`, {
            part: 'edit-tools',
            'data-testid': 'lgs1920-wa-timeline-edit-tools',
            'aria-label': 'Timeline editing tools',
        })
        const cutLabel = 'Cut clip'
        const cut = button({
            label: cutLabel,
            testId: 'tools-cut',
            iconSlotElement: createIcon('scissors', 'solid'),
            variant: getCutMode() ? 'brand' : 'neutral',
        })
        cut.id = 'lgs1920-timeline-tools-cut'
        cut.classList.add('lgs1920-wa-timeline__timeline-tool')
        cut.setAttribute('aria-pressed', String(getCutMode()))
        cut.toggleAttribute('data-active', getCutMode())
        cut.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            toggleCutMode(event)
        })
        const undoLabel = 'Undo'
        const undoButton = button({
            label: undoLabel,
            testId: 'tools-undo',
            iconSlotElement: createIcon('arrow-rotate-left', 'solid'),
            disabled: !getCanUndo(),
        })
        undoButton.id = 'lgs1920-timeline-tools-undo'
        undoButton.classList.add('lgs1920-wa-timeline__timeline-tool')
        undoButton.setAttribute('aria-disabled', String(!getCanUndo()))
        undoButton.addEventListener('click', event => undo(event))
        const redoLabel = 'Redo'
        const redoButton = button({
            label: redoLabel,
            testId: 'tools-redo',
            iconSlotElement: createIcon('arrow-rotate-right', 'solid'),
            disabled: !getCanRedo(),
        })
        redoButton.id = 'lgs1920-timeline-tools-redo'
        redoButton.classList.add('lgs1920-wa-timeline__timeline-tool')
        redoButton.setAttribute('aria-disabled', String(!getCanRedo()))
        redoButton.addEventListener('click', event => redo(event))
        tools.append(
            cut,
            tooltip(cut.id, cutLabel),
            undoButton,
            tooltip(undoButton.id, undoLabel),
            redoButton,
            tooltip(redoButton.id, redoLabel),
        )
        stopTimelineControlPropagation(tools)
        return tools
    }

    const timelineTools = () => {
        const config = getConfig()
        if (getReadonly() || config.noZoomControls === true) return null
        const tools = createElement('span', `lgs1920-wa-timeline__timeline-tools${getHostNoDragClasses()}`, {
            part: 'timeline-tools',
            'aria-label': 'Timeline view tools',
        })
        const horizontalLabel = getHorizontalFitActive()
            ? 'Restore normal horizontal view'
            : 'Fit entire timeline horizontally'
        const horizontal = button({
            label: horizontalLabel,
            testId: 'tools-horizontal-fit',
            iconSlotElement: createIcon('left-right', 'solid'),
            variant: 'brand',
        })
        horizontal.id = 'lgs1920-timeline-tools-horizontal-fit'
        horizontal.classList.add('lgs1920-wa-timeline__timeline-tool')
        horizontal.addEventListener('click', () => {
            const fitted = !getHorizontalFitActive()
            setHorizontalFitActive(fitted)
            setZoom(fitted ? getMinimumHorizontalZoom() : clampHorizontalZoom(0))
            render()
        })

        const minimumRowHeight = getNumericToken('row-height', minRowHeight)
        const verticalAtMinimum = getRowHeight() <= minimumRowHeight
        const verticalLabel = verticalAtMinimum ? 'Maximize track size' : 'Show maximum tracks'
        const vertical = button({
            label: verticalLabel,
            testId: 'tools-vertical-zoom',
            iconSlotElement: createIcon('up-down', 'solid'),
            variant: 'brand',
        })
        vertical.id = 'lgs1920-timeline-tools-vertical-zoom'
        vertical.classList.add('lgs1920-wa-timeline__timeline-tool')
        vertical.addEventListener('click', () => {
            setRowHeight(verticalAtMinimum ? maxRowHeight : minimumRowHeight)
            render()
        })
        tools.append(
            horizontal,
            tooltip(horizontal.id, horizontalLabel),
            vertical,
            tooltip(vertical.id, verticalLabel),
        )
        return tools
    }

    const stopTimelineControlPropagation = element => {
        ['click', 'dblclick', 'mousedown', 'pointerdown', 'touchstart', 'wheel'].forEach(type => {
            element.addEventListener(type, event => event.stopPropagation())
        })
    }

    const timelineScrubber = () => {
        const config = getConfig()
        if (getReadonly() || config.interactive === false || config.noTimeSlider === true || config.showTimeSlider === false) return null
        const scrubber = createElement('div', `lgs1920-wa-timeline__timeline-scrubber${getHostNoDragClasses()}`, {
            part: 'timeline-scrubber',
            'data-timeline-ruler-fixed': '',
        })
        const slider = createElement('wa-slider', 'lgs1920-wa-timeline__time-slider', {
            id: 'lgs1920-timeline-time-slider',
            part: 'time-slider',
            'data-testid': 'lgs1920-wa-timeline-time-slider',
            'data-timeline-time-slider': '',
            'aria-label': 'Timeline time',
            size: 's',
            variant: 'brand',
            'label-at-start': true,
            'width-auto': true,
            min: getRangeStartMillis(),
            max: getRangeEndMillis(),
            step: getFrameIntervalMillis(),
            value: getCurrentTimeMillis(),
        })
        slider.withTooltip = true
        slider.tooltipPlacement = 'top'
        slider.valueFormatter = value => `${formatRulerTime(Number(value) / 1000)} / ${formatRulerTime(getDurationSeconds())}`
        const seekFromSlider = (event, settled) => {
            if (getConfig().interactive === false) return
            const value = event.target?.value ?? event.currentTarget?.value
            const duration = getDurationMillis()
            const timeMillis = normalizeTime(value, false)
            const detail = {
                timeMillis,
                progress: duration > 0 ? timeMillis / duration : 0,
                settled,
                source: 'timeline-slider',
                event,
            }
            if (emitBefore('seek', detail).defaultPrevented) {
                updateDynamicState()
                return
            }
            setCurrentTimeMillis(timeMillis)
            emit('seek', detail)
            updateDynamicState()
            if (settled) emitAfter('seek', detail)
        }
        slider.addEventListener('input', event => {
            seekFromSlider(event, false)
        })
        slider.addEventListener('change', event => {
            seekFromSlider(event, true)
        })
        scrubber.append(slider)
        stopTimelineControlPropagation(scrubber)
        return scrubber
    }

    const timelineZoomControl = () => {
        const config = getConfig()
        if (getReadonly()
            || config.interactive === false
            || config.noZoomControls === true
            || config.showZoomSlider !== true) return null
        const control = createElement('span', `lgs1920-wa-timeline__zoom-control${getHostNoDragClasses()}`, {
            part: 'zoom-control',
            'data-testid': 'lgs1920-wa-timeline-zoom-control',
        })
        const icon = createIcon('left-right', 'solid')
        icon.classList.add('lgs1920-wa-timeline__zoom-icon')
        icon.setAttribute('size', 's')
        icon.setAttribute('aria-hidden', 'true')
        const slider = createElement('wa-slider', 'lgs1920-wa-timeline__zoom-slider', {
            id: 'lgs1920-timeline-zoom-slider',
            part: 'zoom-slider',
            'data-testid': 'lgs1920-wa-timeline-zoom-slider',
            'data-timeline-zoom-slider': '',
            size: 's',
            variant: 'brand',
            min: getMinimumHorizontalZoom(),
            max: 500,
            step: 1,
            value: getZoom(),
        })
        slider.valueFormatter = value => `${Math.round(Number(value))}%`
        const sliderTooltip = tooltip(slider.id, slider.valueFormatter(slider.value), 'top')
        const updateTooltip = () => {
            sliderTooltip.textContent = slider.valueFormatter(slider.value)
        }
        const zoomFromSlider = (event, settled) => {
            if (getConfig().interactive === false) return
            const value = event.target?.value ?? event.currentTarget?.value
            const zoomPercent = clampHorizontalZoom(value)
            const detail = {
                zoomPercent,
                settled,
                source: 'timeline-zoom-slider',
                event,
            }
            if (emitBefore('zoom-change', detail).defaultPrevented) {
                updateDynamicState()
                return
            }
            setHorizontalFitActive(false)
            setZoom(zoomPercent)
            emit('zoom-change', detail)
            render()
            if (settled) {
                emitAfter('zoom-change', detail)
            }
        }
        slider.addEventListener('input', event => {
            updateTooltip()
            zoomFromSlider(event, false)
        })
        slider.addEventListener('change', event => {
            updateTooltip()
            zoomFromSlider(event, true)
        })
        control.append(icon, slider, sliderTooltip)
        stopTimelineControlPropagation(control)
        return control
    }

    return {
        timelineEditTools,
        timelineTools,
        timelineScrubber,
        timelineZoomControl,
        stopTimelineControlPropagation,
    }
}
