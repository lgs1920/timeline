/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: app.js
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-14
 * Last modified: 2026-09-15
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import '@awesome.me/webawesome/dist/components/breadcrumb/breadcrumb.js'
import '@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/button-group/button-group.js'
import '@awesome.me/webawesome/dist/components/details/details.js'
import '@awesome.me/webawesome/dist/components/icon/icon.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/slider/slider.js'
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js'
import '@lgs1920/timeline'
import '@awesome.me/webawesome/dist/components/toast/toast.js'
import {CLIP_OPTION_DRAG_MIME, formatRulerTime} from '@lgs1920/timeline'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup.js'
import 'prismjs/components/prism-javascript.js'

const THEME_CONFIG = {
    default: {
        theme: 'wa-theme-default',
        palette: 'wa-palette-default',
    },
    awesome: {
        theme: 'wa-theme-awesome',
        palette: 'wa-palette-bright',
    },
    shoelace: {
        theme: 'wa-theme-shoelace',
        palette: 'wa-palette-shoelace',
    },
}
const themeClasses = Object.values(THEME_CONFIG).flatMap(({theme, palette}) => [theme, palette])
const modeClasses = ['wa-light', 'wa-dark']
const brandClasses = ['wa-brand-blue', 'wa-brand-red', 'wa-brand-orange', 'wa-brand-green', 'wa-brand-cyan', 'wa-brand-purple', 'wa-brand-pink']

const studioTimeline = document.querySelector('#studio-timeline')
const studioPlaybackRateGroup = document.querySelector('#studio-playback-rate')
const studioPlaybackRateButtons = [...studioPlaybackRateGroup.querySelectorAll('[data-playback-rate]')]
const studioSeekBackwardButton = document.querySelector('#studio-seek-backward')
const studioSeekForwardButton = document.querySelector('#studio-seek-forward')
const studioStatus = document.querySelector('#studio-status')
const studioOutput = document.querySelector('#studio-output')
const studioToast = document.querySelector('#studio-toast')

const showStudioToast = (message, icon) => {
    studioToast?.create(message, {
        duration: 3_000,
        icon,
        variant: 'brand',
    })
}
const generatedClipSources = document.querySelector('#generated-clip-sources')
const clipDragStatus = document.querySelector('#clip-drag-status')
const interactiveTimeline = document.querySelector('#interactive-timeline')
const readonlyTimeline = document.querySelector('#readonly-timeline')
const readonlyPlayButton = document.querySelector('#readonly-play')
const readonlyTimeSlider = document.querySelector('#readonly-time-slider')
const readonlyTimeTooltip = document.querySelector('#readonly-time-tooltip')
const readonlyStatus = document.querySelector('#readonly-status')
const rangeTimeline = document.querySelector('#range-timeline')
const rangeTimeSlider = document.querySelector('#range-time-slider')
const rangeTimeTooltip = document.querySelector('#range-time-tooltip')
const eventOutput = document.querySelector('#event-output')
const eventStatus = document.querySelector('#event-status')
const rangeStatus = document.querySelector('#range-status')
const keyboardStatus = document.querySelector('#keyboard-status')

const DEMO_DURATION_MILLIS = 60_000
const SHORT_DEMO_DURATION_MILLIS = 30_000
const formatMillis = value => formatRulerTime(Number(value) / 1000)
const randomClipTypes = [
    {kind: 'video', label: 'Video', icon: 'film', color: 'blue'},
    {kind: 'audio', label: 'Audio', icon: 'music', color: 'green'},
    {kind: 'text', label: 'Text', icon: 'font', color: 'purple'},
    {kind: 'other', label: 'Other', icon: 'puzzle-piece', color: 'orange'},
]
const MAX_PENDING_CLIPS = randomClipTypes.length

const randomItem = values => values[Math.floor(Math.random() * values.length)]
let generatedClipIndex = 0

/**
 * Create the option payload accepted by the timeline's native clip drop zone.
 *
 * @returns {Object} Randomized clip insertion option.
 */
const createRandomClipOption = (preferredType = null) => {
    generatedClipIndex += 1
    const type = preferredType ?? randomItem(randomClipTypes)
    const label = `${type.label} clip #${String(generatedClipIndex).padStart(3, '0')}`
    const duration = Number((2 + (Math.random() * 10)).toFixed(1))

    return {
        group: 'demo-random',
        key: `generated-clip-${generatedClipIndex}`,
        label,
        kind: type.kind,
        icon: type.icon,
        duration,
        clip: {
            label,
            kind: type.kind,
            icon: type.icon,
            colorClasses: ['wa-neutral', `wa-neutral-${type.color}`],
            timelineColor: type.color,
        },
    }
}

const removeGeneratedClipSource = option => {
    const optionKey = String(option?.key ?? '')
    const source = [...generatedClipSources.querySelectorAll('[data-generated-clip]')]
        .find(element => element.getAttribute('data-clip-option-key') === optionKey)
    if (!source) return false
    source.remove()
    return true
}

const tracks = [
    {
        id: 'story',
        label: 'Story',
        icon: 'film',
        colorClasses: ['wa-neutral', 'wa-neutral-blue'],
        canHide: true,
        clips: [
            {id: 'opening', label: 'Opening', kind: 'video', start: 0, end: 9, colorClasses: ['wa-neutral-blue']},
            {id: 'middle', label: 'Middle scene', kind: 'video', start: 18, end: 33, colorClasses: ['wa-neutral-purple']},
            {id: 'ending', label: 'Finale', kind: 'video', start: 43, end: 56, colorClasses: ['wa-neutral-pink']},
        ],
    },
    {
        id: 'b-roll',
        label: 'B-roll',
        icon: 'camera',
        colorClasses: ['wa-neutral', 'wa-neutral-orange'],
        canHide: true,
        clips: [
            {id: 'city', label: 'City details', kind: 'video', start: 4, end: 12, colorClasses: ['wa-neutral-orange']},
            {id: 'portrait', label: 'Portrait cutaway', kind: 'video', start: 25, end: 34, colorClasses: ['wa-neutral-yellow']},
            {id: 'landscape', label: 'Landscape', kind: 'video', start: 45, end: 59, colorClasses: ['wa-neutral-cyan']},
        ],
    },
    {
        id: 'sound',
        label: 'Sound',
        icon: 'music',
        colorClasses: ['wa-neutral', 'wa-neutral-green'],
        canHide: true,
        clips: [
            {id: 'music', label: 'Music bed', kind: 'audio', start: 0, end: 18, colorClasses: ['wa-neutral-green']},
            {id: 'ambience', label: 'Room ambience', kind: 'audio', start: 18, end: 40, colorClasses: ['wa-neutral-cyan']},
            {id: 'outro', label: 'Outro music', kind: 'audio', start: 40, end: 60, colorClasses: ['wa-neutral-indigo']},
        ],
    },
    {
        id: 'voice',
        label: 'Voice over',
        icon: 'microphone',
        colorClasses: ['wa-neutral', 'wa-neutral-red'],
        canHide: true,
        clips: [
            {id: 'voice-opening', label: 'Opening narration', kind: 'audio', start: 9, end: 17, colorClasses: ['wa-neutral-red']},
            {id: 'voice-scene', label: 'Scene narration', kind: 'audio', start: 31, end: 41, colorClasses: ['wa-neutral-pink']},
        ],
    },
    {
        id: 'graphics',
        label: 'Graphics',
        icon: 'wand-magic-sparkles',
        colorClasses: ['wa-neutral', 'wa-neutral-purple'],
        canHide: true,
        clips: [
            {id: 'title-card', label: 'Title card', kind: 'graphic', start: 14, end: 20, colorClasses: ['wa-neutral-purple']},
            {id: 'end-card', label: 'End card', kind: 'graphic', start: 48, end: 55, colorClasses: ['wa-neutral-gray']},
        ],
    },
    {
        id: 'captions',
        label: 'Captions',
        icon: 'font',
        colorClasses: ['wa-neutral', 'wa-neutral-cyan'],
        canHide: true,
        clips: [
            {id: 'caption-opening', label: 'Opening caption', kind: 'text', start: 2, end: 8, colorClasses: ['wa-neutral-cyan']},
            {id: 'caption-scene', label: 'Scene caption', kind: 'text', start: 22, end: 30, colorClasses: ['wa-neutral-blue']},
            {id: 'caption-ending', label: 'Closing caption', kind: 'text', start: 47, end: 58, colorClasses: ['wa-neutral-purple']},
        ],
    },
    {
        id: 'other',
        label: 'Other',
        icon: 'puzzle-piece',
        colorClasses: ['wa-neutral', 'wa-neutral-yellow'],
        canHide: true,
        clips: [
            {id: 'map-overlay', label: 'Map overlay', kind: 'other', start: 10, end: 16, colorClasses: ['wa-neutral-yellow']},
            {id: 'logo-overlay', label: 'Logo overlay', kind: 'other', start: 36, end: 44, colorClasses: ['wa-neutral-orange']},
        ],
    },
]

/**
 * Clone the public track model before handing it to a controlled element.
 *
 * @param {Array} source - Track definitions.
 * @returns {Array} Detached track definitions.
 */
const cloneTracks = (source, durationMillis = DEMO_DURATION_MILLIS) => {
    const durationSeconds = Math.max(0, Number(durationMillis) || 0) / 1000
    return source.map(track => ({
        ...track,
        clips: track.clips
            .filter(clip => Number(clip.start) < durationSeconds)
            .map(clip => ({
                ...clip,
                end: Math.min(Number(clip.end) || 0, durationSeconds),
            })),
    }))
}

/**
 * Configure one demonstration timeline.
 *
 * @param {HTMLElement} element - Timeline custom element.
 * @param {Object} [options={}] - Timeline options.
 * @returns {void}
 */
const configureTimeline = (element, options = {}) => {
    const durationMillis = Number(options.durationMillis) > 0
        ? Number(options.durationMillis)
        : DEMO_DURATION_MILLIS
    const clipOptions = options.interactive === true
        ? [{key: 'marker', label: 'Add marker', kind: 'marker', duration: 4, icon: 'bookmark'}]
        : []
    element.timeline = {
        durationMillis,
        visible: true,
        showClipMenu: options.interactive === true,
        ...options,
    }
    element.tracks = cloneTracks(tracks, durationMillis)
    element.clipOptions = clipOptions
    element.currentTimeMillis = 0
    element.playing = false
}

const studioTimelineOptions = {
    interactive: true,
    editable: true,
    horizontalFit: true,
    fps: 30,
    frameCount: 1_801,
    frameIntervalMillis: 1000 / 30,
    rangeStartMillis: 0,
    rangeEndMillis: DEMO_DURATION_MILLIS,
    showTimeSlider: true,
    showZoomSlider: true,
    collisionPolicy: 'prevent',
    resizeCollisionPolicy: 'ripple',
    resizeExtendsDuration: true,
    durationPolicy: 'extend',
    keyboardZoomActive: true,
    showBuildingOverlay: false,
    showClipMenu: false,
}

const emitStatus = event => {
    const detail = event.detail ?? {}
    const label = `${event.type.replace('lgs1920-timeline-', '')} · ${detail.clip?.label ?? detail.trackId ?? ''}`.trim()
    eventOutput.textContent = JSON.stringify(detail, (key, value) => key === 'event' ? undefined : value, 2)
    eventStatus.textContent = label
}

const applyTheme = value => {
    const selectedTheme = THEME_CONFIG[value] ?? THEME_CONFIG.default

    document.documentElement.classList.remove(...themeClasses)
    document.documentElement.classList.add(selectedTheme.theme, selectedTheme.palette)
}

const applyMode = value => {
    document.documentElement.classList.remove(...modeClasses)
    document.documentElement.classList.add(value === 'light' ? 'wa-light' : 'wa-dark')
}

const applyBrand = value => {
    document.documentElement.classList.remove(...brandClasses)
    document.documentElement.classList.add(`wa-brand-${value}`)
}

configureTimeline(studioTimeline, studioTimelineOptions)
configureTimeline(interactiveTimeline, {
    durationMillis: SHORT_DEMO_DURATION_MILLIS,
    interactive: true,
    showClipMenu: false,
})
configureTimeline(readonlyTimeline, {
    durationMillis: SHORT_DEMO_DURATION_MILLIS,
    interactive: false,
    editable: false,
})
configureTimeline(rangeTimeline, {
    durationMillis: SHORT_DEMO_DURATION_MILLIS,
    interactive: true,
    editable: true,
    rangeStartMillis: 6_000,
    rangeEndMillis: 24_000,
    showClipMenu: false,
})

/**
 * Keep a timeline's current time moving after its host receives a play intent.
 * The component exposes the intent; the host owns this clock and writes the
 * resulting time back through currentTimeMillis.
 *
 * @param {Object} options Clock configuration.
 * @returns {Object} Host playback clock controls.
 */
const createPlaybackClock = ({timeline, startMillis = 0, endMillis = DEMO_DURATION_MILLIS, playbackRate = 1, onTime = () => {}}) => {
    const getStartMillis = typeof startMillis === 'function' ? startMillis : () => startMillis
    const getEndMillis = typeof endMillis === 'function' ? endMillis : () => endMillis
    let intervalId = null
    let rate = Number(playbackRate) > 0 ? Number(playbackRate) : 1
    let clockStartMillis = 0
    let clockStartedAt = 0

    const stopClock = () => {
        if (intervalId === null) return
        window.clearInterval(intervalId)
        intervalId = null
    }

    const sync = value => {
        const start = Number(getStartMillis()) || 0
        const end = Math.max(start, Number(getEndMillis()) || DEMO_DURATION_MILLIS)
        const timeMillis = Math.max(start, Math.min(end, Number(value) || 0))
        timeline.currentTimeMillis = timeMillis
        onTime(timeMillis)
        return timeMillis
    }

    const tick = () => {
        if (!timeline.playing) {
            stopClock()
            return
        }
        const nextTime = sync(clockStartMillis + ((performance.now() - clockStartedAt) * rate))
        const end = Number(getEndMillis()) || DEMO_DURATION_MILLIS
        if (nextTime >= end) {
            timeline.playing = false
            stopClock()
            onTime(nextTime)
        }
    }

    const start = () => {
        stopClock()
        const startMillisValue = Number(getStartMillis()) || 0
        const endMillisValue = Number(getEndMillis()) || DEMO_DURATION_MILLIS
        const current = Number(timeline.currentTimeMillis) || startMillisValue
        clockStartMillis = Math.max(startMillisValue, Math.min(endMillisValue, current))
        sync(clockStartMillis)
        clockStartedAt = performance.now()
        intervalId = window.setInterval(tick, 33)
        tick()
    }

    const pause = () => {
        stopClock()
        sync(timeline.currentTimeMillis)
    }

    const stop = () => {
        timeline.playing = false
        stopClock()
        sync(getEndMillis())
    }

    const restart = () => {
        sync(getStartMillis())
        if (timeline.playing) start()
    }

    const seek = value => {
        const timeMillis = sync(value)
        if (timeline.playing) start()
        return timeMillis
    }

    const setRate = value => {
        const nextRate = Number(value)
        if (!Number.isFinite(nextRate) || nextRate <= 0) return rate
        if (nextRate === rate) return rate
        rate = nextRate
        if (timeline.playing) start()
        else sync(timeline.currentTimeMillis)
        return rate
    }

    return {start, pause, stop, restart, seek, getRate: () => rate, setRate, sync}
}

readonlyTimeSlider.valueFormatter = value => `${formatMillis(value)} / ${formatMillis(SHORT_DEMO_DURATION_MILLIS)}`
rangeTimeSlider.valueFormatter = value => `${formatMillis(value)} / ${formatMillis(SHORT_DEMO_DURATION_MILLIS)}`

const studioClock = createPlaybackClock({
    timeline: studioTimeline,
    onTime: timeMillis => {
        studioSeekBackwardButton.disabled = timeMillis <= 0
        studioSeekForwardButton.disabled = timeMillis >= DEMO_DURATION_MILLIS
        studioStatus.textContent = studioTimeline.playing
            ? `Playing · ${studioClock.getRate()}× · ${formatMillis(timeMillis)}`
            : `Current time · ${formatMillis(timeMillis)}`
        studioOutput.textContent = `currentTimeMillis = ${timeMillis}`
    },
})

const updateStudioPlaybackRateButtons = rate => {
    studioPlaybackRateButtons.forEach(button => {
        const selected = button.dataset.playbackRate === String(rate)
        button.setAttribute('aria-pressed', String(selected))
        button.setAttribute('variant', selected ? 'brand' : 'neutral')
    })
}

studioPlaybackRateButtons.forEach(button => {
    button.addEventListener('pointerdown', event => event.stopPropagation())
    button.addEventListener('click', event => {
        event.stopPropagation()
        const rate = button.dataset.playbackRate
        studioClock.setRate(rate)
        updateStudioPlaybackRateButtons(rate)
    })
})

updateStudioPlaybackRateButtons('1')

const seekStudioBy = (button, method, durationMillis) => {
    button.addEventListener('pointerdown', event => event.stopPropagation())
    button.addEventListener('click', event => {
        event.stopPropagation()
        studioClock.seek(studioTimeline[method](durationMillis))
    })
}

seekStudioBy(studioSeekBackwardButton, 'rewind', 10_000)
seekStudioBy(studioSeekForwardButton, 'advance', 10_000)

studioTimeline.addEventListener('lgs1920-timeline-seek', event => {
    studioClock.seek(event.detail.timeMillis)
})
studioTimeline.addEventListener('lgs1920-timeline-play', () => {
    showStudioToast('Clip started', 'play')
    studioTimeline.playing = true
    studioClock.start()
})
studioTimeline.addEventListener('lgs1920-timeline-pause', () => {
    showStudioToast('Clip paused', 'pause')
    studioTimeline.playing = false
    studioClock.pause()
})
studioTimeline.addEventListener('lgs1920-timeline-stop', () => {
    showStudioToast('Clip stopped', 'stop')
    studioClock.stop()
})
studioTimeline.addEventListener('lgs1920-timeline-restart', event => {
    studioClock.seek(event.detail.timeMillis)
})

const setClipDragData = (event, option) => {
    if (!event.dataTransfer) return
    if (typeof event.dataTransfer.setDragImage === 'function') {
        const transparentDragImage = document.createElement('canvas')
        transparentDragImage.width = 1
        transparentDragImage.height = 1
        event.dataTransfer.setDragImage(transparentDragImage, 0, 0)
    }
    const payload = JSON.stringify(option)
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(CLIP_OPTION_DRAG_MIME, payload)
    event.dataTransfer.setData('text/plain', payload)
    clipDragStatus.textContent = `Dragging ${option.label} · ${option.duration}s · ${option.kind} · ${option.clip.timelineColor}`
}

const createGeneratedClipSource = option => {
    const source = document.createElement('div')
    let dragPreview = null
    let lastPointer = null

    const isTrackElement = target => target?.getAttribute?.('part') === 'track'
    const isOverTimelineTrack = event => {
        const pathTrack = event.composedPath?.().some(isTrackElement)
        const relatedPathTrack = event.relatedTarget?.getAttribute?.('part') === 'track'
        const coordinatesTrack = [...document.querySelectorAll('lgs1920-timeline')].some(timeline => (
            [...timeline.shadowRoot?.querySelectorAll('[part="track"]') ?? []].some(track => {
                const rect = track.getBoundingClientRect()
                return event.clientX >= rect.left && event.clientX <= rect.right
                    && event.clientY >= rect.top && event.clientY <= rect.bottom
            })
        ))
        if (event.type === 'dragleave' && !relatedPathTrack && !coordinatesTrack) return false
        return pathTrack || relatedPathTrack || coordinatesTrack
    }

    const updateSourceVisibility = event => {
        const overTrack = isOverTimelineTrack(event)
        source.classList.toggle('demo-generated-clip--dragging', true)
        dragPreview.hidden = overTrack

        const clientX = Number(event.clientX)
        const clientY = Number(event.clientY)
        if (Number.isFinite(clientX) && Number.isFinite(clientY)
            && (event.type !== 'dragstart' || clientX !== 0 || clientY !== 0)) {
            lastPointer = {clientX, clientY}
        }
        if (overTrack) return

        if (lastPointer) {
            dragPreview.style.left = `${lastPointer.clientX + 14}px`
            dragPreview.style.top = `${lastPointer.clientY + 14}px`
            return
        }
        const sourceRect = source.getBoundingClientRect()
        dragPreview.style.left = `${sourceRect.left}px`
        dragPreview.style.top = `${sourceRect.top}px`
    }

    const clearDragState = () => {
        source.classList.remove('demo-generated-clip--dragging')
        dragPreview.hidden = true
        dragPreview.remove()
        lastPointer = null
        window.removeEventListener('drag', updateSourceVisibility, true)
        window.removeEventListener('dragenter', updateSourceVisibility, true)
        window.removeEventListener('dragover', updateSourceVisibility, true)
        window.removeEventListener('dragleave', updateSourceVisibility, true)
        window.removeEventListener('dragend', clearDragState, true)
    }

    const startDragState = event => {
        document.body.append(dragPreview)
        updateSourceVisibility(event)
        window.addEventListener('drag', updateSourceVisibility, true)
        window.addEventListener('dragenter', updateSourceVisibility, true)
        window.addEventListener('dragover', updateSourceVisibility, true)
        window.addEventListener('dragleave', updateSourceVisibility, true)
        window.addEventListener('dragend', clearDragState, true)
    }

    const handleDragStart = event => {
        startDragState(event)
        setClipDragData(event, option)
    }

    const handleDragEnd = () => {
        clearDragState()
        if (!source.isConnected) return
        clipDragStatus.textContent = `${option.label} is still available. Drop it onto a compatible track to insert it.`
    }

    const appendDragListeners = () => {
        source.addEventListener('dragstart', handleDragStart)
        source.addEventListener('dragend', handleDragEnd)
    }

    const setSourceMarkup = () => {
        source.className = 'demo-generated-clip'
        source.setAttribute('data-generated-clip', '')
        source.setAttribute('data-clip-option-key', option.key)
        source.setAttribute('data-clip-kind', option.kind)
        source.setAttribute('draggable', 'true')
        source.draggable = true
        source.setAttribute('role', 'button')
        source.setAttribute('tabindex', '0')
        source.setAttribute('aria-label', `Drag ${option.label} onto the timeline`)
        source.classList.add('wa-neutral', `wa-neutral-${option.clip.timelineColor}`)
    }

    setSourceMarkup()
    const icon = document.createElement('wa-icon')
    icon.name = option.icon
    icon.variant = 'regular'
    icon.label = ''
    icon.className = 'demo-generated-clip-icon'
    icon.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.className = 'demo-generated-clip-label'
    label.textContent = option.label
    const duration = document.createElement('span')
    duration.className = 'demo-generated-clip-duration'
    duration.textContent = `${option.duration.toFixed(1)}s`
    source.append(
        icon,
        label,
        duration,
    )
    dragPreview = source.cloneNode(true)
    dragPreview.removeAttribute('draggable')
    dragPreview.removeAttribute('tabindex')
    dragPreview.setAttribute('aria-hidden', 'true')
    dragPreview.classList.add('demo-generated-clip--drag-preview')
    dragPreview.hidden = true
    appendDragListeners()
    return source
}

const replenishGeneratedClipSources = () => {
    while (generatedClipSources.children.length < MAX_PENDING_CLIPS) {
        const displayedKinds = new Set([...generatedClipSources.querySelectorAll('[data-generated-clip]')]
            .map(source => source.getAttribute('data-clip-kind')))
        const missingType = randomClipTypes.find(type => !displayedKinds.has(type.kind))
        generatedClipSources.append(createGeneratedClipSource(createRandomClipOption(missingType)))
    }
}

studioTimeline.addEventListener('lgs1920-timeline-add-clip', event => {
    const detail = event.detail ?? {}
    const clip = detail.clip
    if (!clip) {
        clipDragStatus.textContent = 'No compatible track accepted this clip. Drag it over another track or time.'
        return
    }
    if (removeGeneratedClipSource(detail.option)) replenishGeneratedClipSources()
    studioTimeline.tracks = detail.tracks
    clipDragStatus.textContent = `Added ${clip.label} · ${Number(clip.end - clip.start).toFixed(1)}s · ${clip.kind}`
})

replenishGeneratedClipSources()

let currentRangeStartMillis = 6_000
let currentRangeEndMillis = 24_000

const updateRangeStatus = timeMillis => {
    rangeTimeSlider.value = timeMillis
    rangeTimeTooltip.textContent = rangeTimeSlider.valueFormatter(rangeTimeSlider.value)
    rangeStatus.textContent = `Range: ${formatMillis(currentRangeStartMillis)} – ${formatMillis(currentRangeEndMillis)} · Playback ${rangeTimeline.playing ? 'running' : 'paused'} at ${formatMillis(timeMillis)}`
}

const rangeClock = createPlaybackClock({
    timeline: rangeTimeline,
    startMillis: () => currentRangeStartMillis,
    endMillis: () => currentRangeEndMillis,
    onTime: updateRangeStatus,
})

rangeTimeline.addEventListener('lgs1920-timeline-range-change', event => {
    const {rangeStartMillis, rangeEndMillis} = event.detail
    currentRangeStartMillis = rangeStartMillis
    currentRangeEndMillis = rangeEndMillis
    rangeClock.seek(rangeTimeline.currentTimeMillis)
})

rangeTimeSlider.addEventListener('input', event => rangeClock.seek(event.currentTarget.value))
rangeTimeSlider.addEventListener('change', event => rangeClock.seek(event.currentTarget.value))
rangeTimeline.addEventListener('lgs1920-timeline-play', () => {
    rangeTimeline.playing = true
    rangeClock.start()
})
rangeTimeline.addEventListener('lgs1920-timeline-pause', () => {
    rangeTimeline.playing = false
    rangeClock.pause()
})
rangeTimeline.addEventListener('lgs1920-timeline-stop', () => rangeClock.stop())
rangeTimeline.addEventListener('lgs1920-timeline-restart', event => rangeClock.seek(event.detail.timeMillis))
rangeTimeline.addEventListener('lgs1920-timeline-seek', event => rangeClock.seek(event.detail.timeMillis))
rangeClock.sync(currentRangeStartMillis)

const formatKeyboardKey = event => {
    const key = {' ': 'Space', Spacebar: 'Space', Escape: 'Esc'}[event.key] ?? event.key
    const modifiers = [
        event.ctrlKey ? 'Ctrl' : '',
        event.metaKey ? '⌘' : '',
        event.altKey ? 'Alt' : '',
        event.shiftKey ? 'Shift' : '',
    ].filter(Boolean)
    return [...modifiers, key].join(' + ')
}

document.addEventListener('keydown', event => {
    if (!event.composedPath?.().includes(studioTimeline)) return
    keyboardStatus.textContent = `Last key · ${formatKeyboardKey(event)}`
}, true)

const eventNames = [
    'play', 'pause', 'restart', 'stop', 'seek', 'clip-change', 'clip-select',
    'reorder', 'track-label-change', 'track-visibility-change', 'add-clip',
]
eventNames.forEach(name => interactiveTimeline.addEventListener(`lgs1920-timeline-${name}`, emitStatus))

const updateInteractiveTime = timeMillis => {
    if (interactiveTimeline.playing) {
        eventStatus.textContent = `Playing · ${formatMillis(timeMillis)}`
    }
}

const interactiveClock = createPlaybackClock({
    timeline: interactiveTimeline,
    endMillis: SHORT_DEMO_DURATION_MILLIS,
    onTime: updateInteractiveTime,
})

interactiveTimeline.addEventListener('lgs1920-timeline-seek', event => {
    interactiveClock.seek(event.detail.timeMillis)
})
interactiveTimeline.addEventListener('lgs1920-timeline-play', () => {
    interactiveTimeline.playing = true
    interactiveClock.start()
})
interactiveTimeline.addEventListener('lgs1920-timeline-pause', () => {
    interactiveTimeline.playing = false
    interactiveClock.pause()
})
interactiveTimeline.addEventListener('lgs1920-timeline-stop', () => interactiveClock.stop())
interactiveTimeline.addEventListener('lgs1920-timeline-restart', event => interactiveClock.seek(event.detail.timeMillis))
interactiveTimeline.addEventListener('lgs1920-timeline-clip-change', event => {
    interactiveTimeline.tracks = event.detail.tracks
})
interactiveTimeline.addEventListener('lgs1920-timeline-reorder', event => {
    interactiveTimeline.tracks = event.detail.tracks
})
interactiveTimeline.addEventListener('lgs1920-timeline-track-label-change', event => {
    interactiveTimeline.tracks = event.detail.tracks
})
interactiveTimeline.addEventListener('lgs1920-timeline-track-visibility-change', event => {
    interactiveTimeline.tracks = event.detail.tracks
})
interactiveTimeline.addEventListener('lgs1920-timeline-add-clip', event => {
    interactiveTimeline.tracks = event.detail.tracks
})

const updateReadonlyTime = timeMillis => {
    readonlyTimeSlider.value = timeMillis
    readonlyTimeTooltip.textContent = readonlyTimeSlider.valueFormatter(readonlyTimeSlider.value)
    readonlyPlayButton.textContent = readonlyTimeline.playing ? 'Pause preview' : 'Play preview'
    readonlyStatus.textContent = `External player ${readonlyTimeline.playing ? 'playing' : 'paused'} · ${formatMillis(timeMillis)}`
}

const readonlyClock = createPlaybackClock({
    timeline: readonlyTimeline,
    endMillis: SHORT_DEMO_DURATION_MILLIS,
    onTime: updateReadonlyTime,
})

readonlyPlayButton.addEventListener('click', () => {
    if (readonlyTimeline.playing) {
        readonlyTimeline.playing = false
        readonlyClock.pause()
        return
    }
    readonlyTimeline.playing = true
    readonlyClock.start()
})
readonlyTimeSlider.addEventListener('input', event => readonlyClock.seek(event.currentTarget.value))
readonlyTimeSlider.addEventListener('change', event => readonlyClock.seek(event.currentTarget.value))

document.querySelector('#theme-control').addEventListener('change', event => applyTheme(event.currentTarget.value))
document.querySelector('#mode-control').addEventListener('change', event => applyMode(event.currentTarget.value))
document.querySelector('#color-control').addEventListener('change', event => applyBrand(event.currentTarget.value))

const highlightWithPrism = (source, language) => Prism.highlight(
    source,
    Prism.languages[language] ?? Prism.languages.javascript,
    language,
)

const highlightMixedCode = source => source.split('\n').map(line => {
    const language = /<\/?[a-z][^>]*>/i.test(line) ? 'markup' : 'javascript'
    return highlightWithPrism(line, language)
}).join('\n')

const highlightCode = (source, language) => language === 'mixed'
    ? highlightMixedCode(source)
    : highlightWithPrism(source, language)

document.querySelectorAll('pre code[data-language]').forEach(code => {
    const language = code.dataset.language ?? 'javascript'
    code.classList.add(`language-${language}`)
    code.innerHTML = highlightCode(code.textContent, language)
})
