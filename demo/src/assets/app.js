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
 * Last modified: 2026-09-14
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import '@awesome.me/webawesome/dist/components/breadcrumb/breadcrumb.js'
import '@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/icon/icon.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/slider/slider.js'
import '@lgs1920/timeline'
import {CLIP_OPTION_DRAG_MIME, formatRulerTime} from '@lgs1920/timeline'

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
const studioTimeSlider = document.querySelector('#studio-time-slider')
const studioZoomSlider = document.querySelector('#studio-zoom-slider')
const studioStatus = document.querySelector('#studio-status')
const studioOutput = document.querySelector('#studio-output')
const randomClipSource = document.querySelector('#random-clip-source')
const createEmptyTrackButton = document.querySelector('#create-empty-track')
const clipDragStatus = document.querySelector('#clip-drag-status')
const interactiveTimeline = document.querySelector('#interactive-timeline')
const readonlyTimeline = document.querySelector('#readonly-timeline')
const rangeTimeline = document.querySelector('#range-timeline')
const eventOutput = document.querySelector('#event-output')
const eventStatus = document.querySelector('#event-status')
const rangeStatus = document.querySelector('#range-status')
const keyboardStatus = document.querySelector('#keyboard-status')

const DEMO_DURATION_MILLIS = 60_000
const formatMillis = value => formatRulerTime(Number(value) / 1000)
const randomClipNames = ['Sunrise', 'City pulse', 'Interview', 'Map reveal', 'Sound bed', 'Title card', 'Wide shot']
const randomClipKinds = ['video', 'audio', 'graphic', 'marker']
const randomClipIcons = ['film', 'camera', 'microphone', 'music', 'map', 'wand-magic-sparkles', 'bookmark']
const randomClipColors = ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']
let generatedClipIndex = 0
let generatedTrackIndex = 0

const randomItem = values => values[Math.floor(Math.random() * values.length)]

/**
 * Create the option payload accepted by the timeline's native clip drop zone.
 *
 * @returns {Object} Randomized clip insertion option.
 */
const createRandomClipOption = () => {
    const color = randomItem(randomClipColors)
    const label = randomItem(randomClipNames)
    const kind = randomItem(randomClipKinds)
    const icon = randomItem(randomClipIcons)
    const duration = Number((2 + (Math.random() * 10)).toFixed(1))

    return {
        group: 'demo-random',
        key: `${kind}-${Date.now()}`,
        label,
        kind,
        icon,
        duration,
        clip: {
            label,
            kind,
            icon,
            colorClasses: ['wa-neutral', `wa-neutral-${color}`],
            timelineColor: color,
        },
    }
}

const demoTrackAcceptsClip = (track, kind) => track.editable !== false
    && track.droppable !== false
    && track.acceptsClips !== false
    && (!Array.isArray(track.accepts) || track.accepts.length === 0 || track.accepts.includes(kind))

const demoClipOverlaps = (track, start, end) => (track.clips ?? []).some(clip => {
    const clipStart = Number(clip.start) || 0
    const clipEnd = Number(clip.end) || clipStart
    return clipStart < end && start < clipEnd
})

const createEmptyDemoTrack = () => {
    generatedTrackIndex += 1
    return {
        id: `generated-${generatedTrackIndex}`,
        label: `Generated clips ${generatedTrackIndex}`,
        icon: 'wand-magic-sparkles',
        colorClasses: ['wa-neutral', 'wa-neutral-purple'],
        canHide: true,
        clips: [],
    }
}

const addRandomClipAtPlayhead = () => {
    const option = createRandomClipOption()
    const start = Math.max(0, Number(studioTimeline.currentTimeMillis) / 1000 || 0)
    const duration = Number(option.duration) || 1
    const end = start + duration
    const nextTracks = studioTimeline.tracks.map(track => ({
        ...track,
        clips: [...(track.clips ?? [])],
    }))
    let target = nextTracks.find(track => demoTrackAcceptsClip(track, option.kind)
        && !demoClipOverlaps(track, start, end))
    let createdTrack = false
    if (!target) {
        target = createEmptyDemoTrack()
        nextTracks.push(target)
        createdTrack = true
    }
    generatedClipIndex += 1
    target.clips.push({
        ...option.clip,
        id: `generated-clip-${generatedClipIndex}`,
        start,
        end,
    })
    studioTimeline.tracks = nextTracks
    clipDragStatus.textContent = `${createdTrack ? 'Created an empty track and added' : 'Added'} ${option.label} · ${duration.toFixed(1)}s · ${option.kind}`
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
]

/**
 * Clone the public track model before handing it to a controlled element.
 *
 * @param {Array} source - Track definitions.
 * @returns {Array} Detached track definitions.
 */
const cloneTracks = source => source.map(track => ({
    ...track,
    clips: track.clips.map(clip => ({...clip})),
}))

/**
 * Configure one demonstration timeline.
 *
 * @param {HTMLElement} element - Timeline custom element.
 * @param {Object} [options={}] - Timeline options.
 * @returns {void}
 */
const configureTimeline = (element, options = {}) => {
    const clipOptions = options.interactive === true
        ? [{key: 'marker', label: 'Add marker', kind: 'marker', duration: 4, icon: 'bookmark'}]
        : []
    element.timeline = {
        durationMillis: 60_000,
        visible: true,
        legendWidth: 128,
        showClipMenu: options.interactive === true,
        ...options,
    }
    element.tracks = cloneTracks(tracks)
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
    collisionPolicy: 'prevent',
    resizeCollisionPolicy: 'ripple',
    resizeExtendsDuration: true,
    durationPolicy: 'extend',
    keyboardZoomActive: true,
    showBuildingOverlay: false,
    showClipMenu: false,
    legendMinWidth: 190,
    legendWidth: 240,
    legendMaxWidth: 320,
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
configureTimeline(interactiveTimeline, {interactive: true, showClipMenu: false})
configureTimeline(readonlyTimeline, {interactive: false, editable: false})
configureTimeline(rangeTimeline, {
    interactive: true,
    editable: true,
    rangeStartMillis: 12_000,
    rangeEndMillis: 48_000,
    showClipMenu: false,
})

studioTimeSlider.valueFormatter = value => `${formatMillis(value)} / ${formatMillis(DEMO_DURATION_MILLIS)}`
studioZoomSlider.valueFormatter = value => `${Math.round(Number(value))}%`

const updateStudioTime = value => {
    const timeMillis = Math.max(0, Math.min(DEMO_DURATION_MILLIS, Number(value) || 0))
    studioTimeline.currentTimeMillis = timeMillis
    studioTimeSlider.value = timeMillis
    studioStatus.textContent = `Current time · ${formatMillis(timeMillis)}`
    studioOutput.textContent = `currentTimeMillis = ${timeMillis}`
}

studioTimeSlider.addEventListener('input', event => updateStudioTime(event.currentTarget.value))
studioTimeSlider.addEventListener('change', event => updateStudioTime(event.currentTarget.value))
studioTimeline.addEventListener('lgs1920-timeline-seek', event => updateStudioTime(event.detail.timeMillis))
studioTimeline.addEventListener('lgs1920-timeline-play', () => {
    studioTimeline.playing = true
    studioStatus.textContent = 'Playback intent · play'
})
studioTimeline.addEventListener('lgs1920-timeline-pause', () => {
    studioTimeline.playing = false
    studioStatus.textContent = 'Playback intent · pause'
})
studioTimeline.addEventListener('lgs1920-timeline-stop', () => {
    studioTimeline.playing = false
    updateStudioTime(0)
})
studioTimeline.addEventListener('lgs1920-timeline-restart', () => updateStudioTime(0))
studioZoomSlider.addEventListener('input', event => {
    const zoomPercent = Number(event.currentTarget.value)
    studioTimeline.setZoom(zoomPercent)
    studioStatus.textContent = `Horizontal zoom · ${Math.round(zoomPercent)}%`
    studioOutput.textContent = `timeline.setZoom(${Math.round(zoomPercent)})`
})
studioZoomSlider.addEventListener('change', event => studioTimeline.setZoom(Number(event.currentTarget.value)))

randomClipSource.addEventListener('dragstart', event => {
    const option = createRandomClipOption()
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(CLIP_OPTION_DRAG_MIME, JSON.stringify(option))
    clipDragStatus.textContent = `Dragging ${option.label} · ${option.duration}s · ${option.kind} · ${option.clip.timelineColor}`
})
randomClipSource.addEventListener('click', () => addRandomClipAtPlayhead())
randomClipSource.addEventListener('dragend', () => {
    clipDragStatus.textContent = 'Click to add at the playhead, or drag into a compatible track.'
})
createEmptyTrackButton.addEventListener('click', () => {
    const track = createEmptyDemoTrack()
    studioTimeline.tracks = [...studioTimeline.tracks, track]
    clipDragStatus.textContent = `Created ${track.label}. Drag or click a random clip to use it.`
})
studioTimeline.addEventListener('lgs1920-timeline-add-clip', event => {
    const detail = event.detail ?? {}
    const clip = detail.clip
    if (!clip) {
        clipDragStatus.textContent = 'No compatible track accepted this clip. Create an empty track above, then try again.'
        return
    }
    studioTimeline.tracks = detail.tracks
    clipDragStatus.textContent = `Added ${clip.label} · ${Number(clip.end - clip.start).toFixed(1)}s · ${clip.kind}`
})

rangeTimeline.addEventListener('lgs1920-timeline-range-change', event => {
    const {rangeStartMillis, rangeEndMillis} = event.detail
    rangeStatus.textContent = `Range: ${formatMillis(rangeStartMillis)} – ${formatMillis(rangeEndMillis)}`
})

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

interactiveTimeline.addEventListener('lgs1920-timeline-seek', event => {
    interactiveTimeline.currentTimeMillis = event.detail.timeMillis
})
interactiveTimeline.addEventListener('lgs1920-timeline-play', () => {
    interactiveTimeline.playing = true
})
interactiveTimeline.addEventListener('lgs1920-timeline-pause', () => {
    interactiveTimeline.playing = false
})
interactiveTimeline.addEventListener('lgs1920-timeline-stop', () => {
    interactiveTimeline.playing = false
    interactiveTimeline.currentTimeMillis = 0
})
interactiveTimeline.addEventListener('lgs1920-timeline-restart', () => {
    interactiveTimeline.currentTimeMillis = 0
})
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

document.querySelector('#theme-control').addEventListener('change', event => applyTheme(event.currentTarget.value))
document.querySelector('#mode-control').addEventListener('change', event => applyMode(event.currentTarget.value))
document.querySelector('#color-control').addEventListener('change', event => applyBrand(event.currentTarget.value))

const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const codeTokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|<\/?[a-z][^>]*>|\b\d+(?:\.\d+)?\b|\b(?:const|let|var|function|return|if|else|for|of|new|true|false|null|undefined|async|await|import|from)\b)/gi

const codeTokenClass = token => {
    if (token.startsWith('//') || token.startsWith('/*')) return 'comment'
    if (/^[`'"]/.test(token)) return 'string'
    if (token.startsWith('<')) return 'tag'
    if (/^\d/.test(token)) return 'number'
    return 'keyword'
}

const highlightCode = source => {
    const output = []
    let cursor = 0

    for (const match of source.matchAll(codeTokenPattern)) {
        const token = match[0]
        const index = match.index ?? cursor
        output.push(escapeHtml(source.slice(cursor, index)))
        output.push(`<span class="code-token-${codeTokenClass(token)}">${escapeHtml(token)}</span>`)
        cursor = index + token.length
    }

    output.push(escapeHtml(source.slice(cursor)))
    return output.join('')
}

document.querySelectorAll('pre code[data-language]').forEach(code => {
    code.innerHTML = highlightCode(code.textContent)
})
