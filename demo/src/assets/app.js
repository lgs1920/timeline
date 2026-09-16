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
 * Last modified: 2026-09-16
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
import '@awesome.me/webawesome/dist/components/popup/popup.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/slider/slider.js'
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js'
import '@lgs1920/timeline'
import '@awesome.me/webawesome/dist/components/toast/toast.js'
import {CLIP_OPTION_DRAG_MIME, formatRulerTime} from '@lgs1920/timeline'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup.js'
import 'prismjs/components/prism-javascript.js'
import * as THREE from 'three'

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
const studioShuffleButton = document.querySelector('#studio-shuffle')
const studioPlaybackRateGroup = document.querySelector('#studio-playback-rate')
const studioPlaybackRateButtons = [...studioPlaybackRateGroup.querySelectorAll('[data-playback-rate]')]
const studioSeekBackwardButton = document.querySelector('#studio-seek-backward')
const studioSeekForwardButton = document.querySelector('#studio-seek-forward')
const studioStatus = document.querySelector('#studio-status')
const studioOutput = document.querySelector('#studio-output')
const studioToast = document.querySelector('#studio-toast')
const studioPacmanPopup = document.querySelector('#studio-pacman-popup')
const studioPacmanClose = document.querySelector('#studio-pacman-close')
const studioPacmanSound = document.querySelector('#studio-pacman-sound')
const studioPacmanMusic = document.querySelector('#studio-pacman-music')
const studioPacmanSoundLabel = document.querySelector('#studio-pacman-sound-label')
const studioPacmanMusicLabel = document.querySelector('#studio-pacman-music-label')
const studioPacmanCanvas = document.querySelector('#studio-pacman-canvas')
const studioPacmanStatus = document.querySelector('#studio-pacman-status')
const studioPacmanProgress = document.querySelector('#studio-pacman-progress')
const studioPacmanAlmostProgress = document.querySelector('#studio-pacman-almost-progress')
const studioPacmanResult = document.querySelector('#studio-pacman-result')

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
    const duration = Number((3 + (Math.random() * 17)).toFixed(1))

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
    const clipOptions = options.mode === 'edit'
        ? [{key: 'marker', label: 'Add marker', kind: 'marker', duration: 4, icon: 'bookmark'}]
        : []
    element.options = {
        durationMillis,
        ...options,
    }
    element.tracks = cloneTracks(tracks, durationMillis)
    element.clipOptions = clipOptions
    element.currentTimeMillis = 0
    element.playing = false
    element.looping = false
}

const studioTimelineOptions = {
    mode: 'edit',
    horizontalFit: true,
    fps: 30,
    frameCount: 1_801,
    frameIntervalMillis: 1000 / 30,
    range: {startMillis: 0, endMillis: DEMO_DURATION_MILLIS},
    playback: {loop: 'toggle', timeSlider: 'visible'},
    view: {visible: true, zoomSlider: true, buildingOverlay: false},
    editing: {clipMenu: false, collisionPolicy: 'prevent', resizeCollisionPolicy: 'ripple', durationPolicy: 'extend'},
    keyboardZoomActive: true,
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
    mode: 'edit',
    playback: {loop: 'hidden'},
    editing: {clipMenu: false},
})
configureTimeline(readonlyTimeline, {
    durationMillis: SHORT_DEMO_DURATION_MILLIS,
    mode: 'readonly',
    playback: {loop: 'hidden'},
})
configureTimeline(rangeTimeline, {
    durationMillis: SHORT_DEMO_DURATION_MILLIS,
    mode: 'edit',
    playback: {loop: 'hidden'},
    range: {startMillis: 6_000, endMillis: 24_000},
    editing: {clipMenu: false},
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
            if (timeline.looping) {
                const start = Number(getStartMillis()) || 0
                sync(start)
                clockStartMillis = start
                clockStartedAt = performance.now()
                return
            }
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

    const pause = (syncTimeline = true) => {
        stopClock()
        if (syncTimeline) sync(timeline.currentTimeMillis)
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

    const seek = (value, constrainToPlaybackRange = true) => {
        if (!constrainToPlaybackRange) {
            stopClock()
            timeline.playing = false
            const timeMillis = Math.max(0, Number(value) || 0)
            timeline.currentTimeMillis = timeMillis
            onTime(timeMillis)
            return timeMillis
        }
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

const seekFromTimelineEvent = (clock, event) => clock.seek(
    event.detail.timeMillis,
    event.detail.source !== 'manual-seek',
)

/**
 * Render a small Three.js companion scene for the Studio demo.
 *
 * @param {Object} options Demo elements and controlled timeline.
 * @returns {Object} Pac-Man demo controls.
 */
const createPacmanAudio = ({musicButton, musicLabel, soundButton, soundLabel}) => {
    // Original arcade chase loop: short syncopated lead, alternating bass,
    // and occasional harmony accents. Keep the pattern data-driven so the
    // timing engine below can schedule it without accumulating setInterval drift.
    const musicPattern = [
        {lead: 659.25, bass: 164.81, harmony: 523.25, accent: true},
        {lead: 783.99},
        {lead: 880, bass: 220, harmony: 659.25},
        {lead: 1046.5, accent: true},
        {lead: 880, bass: 220},
        {lead: 783.99, harmony: 587.33},
        {lead: 659.25, bass: 164.81, accent: true},
        {lead: 587.33},
        {lead: 698.46, bass: 174.61, harmony: 523.25},
        {lead: 830.61},
        {lead: 987.77, bass: 246.94, harmony: 659.25, accent: true},
        {lead: 1174.66},
        {lead: 987.77, bass: 246.94},
        {lead: 830.61, harmony: 622.25},
        {lead: 698.46, bass: 174.61, accent: true},
        {lead: 659.25},
    ]
    const MUSIC_STEP_SECONDS = 0.13
    const MUSIC_LOOKAHEAD_SECONDS = 0.2
    const MUSIC_SCHEDULER_INTERVAL = 40
    let audioContext = null
    let musicTimer = null
    let musicIndex = 0
    let musicNextTime = 0
    let soundEnabled = true
    let musicEnabled = true

    const updateButton = (button, label, enabled, iconOn, iconOff) => {
        button.setAttribute('aria-pressed', String(enabled))
        label.textContent = enabled ? `${label === soundLabel ? 'Sound' : 'Music'} on` : `${label === soundLabel ? 'Sound' : 'Music'} off`
        button.querySelector('wa-icon').name = enabled ? iconOn : iconOff
    }

    const ensureContext = () => {
        if (!audioContext) {
            const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext
            if (!AudioContextConstructor) return null
            try {
                audioContext = new AudioContextConstructor()
            } catch {
                return null
            }
        }
        if (audioContext.state === 'suspended') audioContext.resume()
        return audioContext
    }

    const playTone = (frequency, duration, type = 'square', volume = 0.035, when = null) => {
        if (!soundEnabled) return
        const context = ensureContext()
        if (!context) return
        const start = Number.isFinite(Number(when)) ? Math.max(context.currentTime, Number(when)) : context.currentTime
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = type
        oscillator.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + duration + 0.02)
    }

    const stopMusic = () => {
        if (musicTimer === null) return
        window.clearInterval(musicTimer)
        musicTimer = null
        musicNextTime = 0
    }

    const startMusic = () => {
        if (!soundEnabled || !musicEnabled || musicTimer !== null) return
        const context = ensureContext()
        if (!context) return
        musicNextTime = context.currentTime + 0.03
        const scheduleMusic = () => {
            if (!soundEnabled || !musicEnabled || !audioContext) return
            const horizon = audioContext.currentTime + MUSIC_LOOKAHEAD_SECONDS
            while (musicNextTime < horizon) {
                const step = musicPattern[musicIndex]
                const leadDuration = MUSIC_STEP_SECONDS * (step.accent ? 0.82 : 0.68)
                playTone(step.lead, leadDuration, 'square', step.accent ? 0.022 : 0.016, musicNextTime)
                if (step.bass) playTone(step.bass, MUSIC_STEP_SECONDS * 1.35, 'triangle', 0.014, musicNextTime)
                if (step.harmony) {
                    playTone(step.harmony, MUSIC_STEP_SECONDS * 0.48, 'sine', 0.006, musicNextTime + (MUSIC_STEP_SECONDS * 0.5))
                }
                musicIndex = (musicIndex + 1) % musicPattern.length
                musicNextTime += MUSIC_STEP_SECONDS
            }
        }
        scheduleMusic()
        musicTimer = window.setInterval(scheduleMusic, MUSIC_SCHEDULER_INTERVAL)
    }

    const start = () => {
        ensureContext()
        startMusic()
    }

    const toggleSound = () => {
        soundEnabled = !soundEnabled
        updateButton(soundButton, soundLabel, soundEnabled, 'volume-high', 'volume-xmark')
        if (soundEnabled) startMusic()
        else stopMusic()
    }

    const toggleMusic = () => {
        musicEnabled = !musicEnabled
        updateButton(musicButton, musicLabel, musicEnabled, 'music', 'music-slash')
        if (musicEnabled) startMusic()
        else stopMusic()
    }

    soundButton.addEventListener('click', toggleSound)
    musicButton.addEventListener('click', toggleMusic)
    updateButton(soundButton, soundLabel, soundEnabled, 'volume-high', 'volume-xmark')
    updateButton(musicButton, musicLabel, musicEnabled, 'music', 'music-slash')

    return {
        chomp: () => {
            const context = ensureContext()
            if (!context) return
            const start = context.currentTime
            playTone(240, 0.04, 'square', 0.04, start)
            playTone(125, 0.075, 'triangle', 0.022, start + 0.022)
        },
        pause: stopMusic,
        start,
        stop: () => {
            stopMusic()
            audioContext?.suspend?.()
        },
    }
}

const createPacmanDemo = ({canvas, popup, timeline, status, progress, almostProgress, result}) => {
    const worldLeft = -4.4
    const worldWidth = 9.6
    const trackHeight = 0.66
    const rulerY = 2.68
    const colorByKind = {
        video: 0x4f8cff,
        audio: 0x42c98a,
        text: 0xc084fc,
        graphic: 0xf08bff,
        other: 0xf4a340,
        marker: 0xf4d35e,
    }
    const popupContent = popup.querySelector('.pacman-popup')
    const dragHandle = popup.querySelector('[data-pacman-drag-handle]')
    const audio = createPacmanAudio({
        musicButton: studioPacmanMusic,
        musicLabel: studioPacmanMusicLabel,
        soundButton: studioPacmanSound,
        soundLabel: studioPacmanSoundLabel,
    })
    let renderer = null
    let scene = null
    let camera = null
    let pacman = null
    let pacmanBody = null
    let pacmanMouth = null
    let pacmanOutcome = ''
    let clipGroup = null
    let laneGroup = null
    let rulerGroup = null
    let playhead = null
    let clipEntries = []
    let clipSignature = ''
    let targetPosition = new THREE.Vector3(worldLeft, 0, 0.4)
    let targetEntry = null
    let lastActiveIndex = -2
    let biteWasActive = false
    let currentTimeMillis = 0
    let playing = false
    let chewing = false
    let frameId = null
    let resizeObserver = null
    let popupOffset = {x: 0, y: 0}
    let dragState = null

    const setMessage = (message, eatenCount = 0, almostEatenCount = 0, total = clipEntries.length) => {
        status.textContent = message
        progress.textContent = `${eatenCount} / ${total} clips eaten`
        almostProgress.textContent = `${almostEatenCount} / ${total} almost eaten`
        const hasWon = total > 0 && eatenCount === total
        const hasLost = total > 0 && almostEatenCount * 2 >= total
        const outcome = hasWon ? 'win' : hasLost ? 'lose' : 'pending'
        result.dataset.outcome = outcome
        result.textContent = hasWon ? 'Win' : hasLost ? 'Lose' : 'In progress'
        const durationMillis = Number(timeline.options?.durationMillis) || DEMO_DURATION_MILLIS
        const hasReachedDemoEnd = currentTimeMillis >= durationMillis
        updatePacmanExpression(hasLost ? 'lose' : 'win', hasReachedDemoEnd)
    }

    const resolveClipColor = clip => {
        const palette = (clip.colorClasses ?? [])
            .find(value => typeof value === 'string' && value.startsWith('wa-neutral-'))
            ?.slice('wa-neutral-'.length)
        const cssColor = palette
            ? getComputedStyle(document.documentElement).getPropertyValue(`--wa-color-${palette}-50`).trim()
            : ''
        return cssColor || colorByKind[clip.kind] || 0x9ca3af
    }

    const createTextSprite = (value, {color = '#d7e5ff', maxWidth = 1.2, fontSize = 26} = {}) => {
        const textCanvas = document.createElement('canvas')
        const context = textCanvas.getContext('2d')
        if (!context) return null
        context.font = `600 ${fontSize}px system-ui, sans-serif`
        const measuredWidth = Math.ceil(context.measureText(String(value)).width + 16)
        textCanvas.width = measuredWidth
        textCanvas.height = fontSize + 16
        context.font = `600 ${fontSize}px system-ui, sans-serif`
        context.fillStyle = color
        context.textBaseline = 'middle'
        context.fillText(String(value), 8, textCanvas.height / 2)
        const texture = new THREE.CanvasTexture(textCanvas)
        texture.colorSpace = THREE.SRGBColorSpace
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            depthTest: false,
            map: texture,
            transparent: true,
        }))
        const scaleWidth = Math.min(maxWidth, Math.max(0.18, measuredWidth / 90))
        sprite.scale.set(scaleWidth, scaleWidth * (textCanvas.height / textCanvas.width), 1)
        return sprite
    }

    const laneY = (trackIndex, trackCount) => ((trackCount - 1) * trackHeight) / 2 - (trackIndex * trackHeight)

    const clearGroup = group => {
        group.children.forEach(object => disposeObject(object))
        group.clear()
    }

    const rebuildStructure = () => {
        if (!laneGroup || !rulerGroup) return
        clearGroup(laneGroup)
        clearGroup(rulerGroup)
        const timelineTracks = timeline.tracks ?? []
        const trackCount = Math.max(1, timelineTracks.length)
        const laneMaterial = new THREE.MeshBasicMaterial({
            color: 0x10233c,
            opacity: 0.72,
            transparent: true,
        })
        timelineTracks.forEach((track, trackIndex) => {
            const y = laneY(trackIndex, trackCount)
            const lane = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, 0.52), laneMaterial.clone())
            lane.position.set(worldLeft + (worldWidth / 2), y, -0.35)
            laneGroup.add(lane)
            const label = createTextSprite(track.label ?? track.id, {color: '#c8d7ee', maxWidth: 1.18, fontSize: 22})
            if (label) {
                label.position.set(worldLeft - 0.67, y, 0.15)
                laneGroup.add(label)
            }
        })
        laneMaterial.dispose()

        const rulerPoints = [
            new THREE.Vector3(worldLeft, rulerY, -0.05),
            new THREE.Vector3(worldLeft + worldWidth, rulerY, -0.05),
        ]
        rulerGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(rulerPoints),
            new THREE.LineBasicMaterial({color: 0x6682a8, transparent: true, opacity: 0.75}),
        ))
        const durationMillis = Number(timeline.options?.durationMillis) || DEMO_DURATION_MILLIS
        for (let second = 0; second <= durationMillis / 1000; second += 10) {
            const x = worldLeft + ((second * 1000) / durationMillis) * worldWidth
            const tick = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, rulerY - 0.12, -0.04),
                    new THREE.Vector3(x, rulerY + 0.1, -0.04),
                ]),
                new THREE.LineBasicMaterial({color: 0x9ab2d1, transparent: true, opacity: 0.85}),
            )
            rulerGroup.add(tick)
            const label = createTextSprite(`${second}s`, {color: '#9ab2d1', maxWidth: 0.55, fontSize: 18})
            if (label) {
                label.position.set(x, rulerY + 0.22, 0.1)
                rulerGroup.add(label)
            }
        }
    }

    const getEntries = () => {
        const durationMillis = Number(timeline.options?.durationMillis) || DEMO_DURATION_MILLIS
        const trackIds = (timeline.tracks ?? []).map(track => track.id)
        const trackIndexById = new Map(trackIds.map((id, index) => [id, index]))
        return (timeline.tracks ?? []).flatMap(track => (track.clips ?? []).map(clip => ({
            clip,
            trackId: track.id,
            trackLabel: track.label,
            trackIndex: trackIndexById.get(track.id) ?? 0,
            startMillis: Math.max(0, Number(clip.start) * 1000),
            endMillis: Math.max(0, Number(clip.end) * 1000),
        })))
            .filter(entry => entry.endMillis > entry.startMillis)
            .sort((left, right) => left.startMillis - right.startMillis || left.trackIndex - right.trackIndex || left.endMillis - right.endMillis)
            .map((entry, index, entries) => {
                const trackCount = Math.max(1, trackIds.length)
                const middle = ((entry.startMillis + entry.endMillis) / 2) / durationMillis
                const width = Math.max(0.16, ((entry.endMillis - entry.startMillis) / durationMillis) * worldWidth)
                const y = laneY(entry.trackIndex, trackCount)
                return {
                    ...entry,
                    index,
                    total: entries.length,
                    startPosition: new THREE.Vector3(
                        worldLeft + ((entry.startMillis / durationMillis) * worldWidth),
                        y,
                        0.4,
                    ),
                    position: new THREE.Vector3(
                        worldLeft + (middle * worldWidth),
                        y,
                        0,
                    ),
                    endPosition: new THREE.Vector3(
                        worldLeft + ((entry.endMillis / durationMillis) * worldWidth),
                        y,
                        0.4,
                    ),
                    width,
                }
            })
    }

    const getEatenState = (entry, index, entries, timeMillis) => {
        const nextEntry = entries[index + 1]
        const changesTrack = nextEntry && nextEntry.trackId !== entry.trackId
        const biteEndMillis = changesTrack
            ? Math.min(entry.endMillis, nextEntry.startMillis)
            : entry.endMillis
        const progress = Math.max(0, Math.min(1,
            (Math.min(timeMillis, biteEndMillis) - entry.startMillis)
            / Math.max(1, entry.endMillis - entry.startMillis),
        ))

        return {
            biteEndMillis,
            almostEaten: biteEndMillis > entry.startMillis
                && biteEndMillis < entry.endMillis
                && timeMillis >= biteEndMillis,
            fullyEaten: biteEndMillis === entry.endMillis && timeMillis >= entry.endMillis,
            progress,
        }
    }

    const disposeObject = object => {
        object.traverse?.(child => {
            child.geometry?.dispose()
            if (Array.isArray(child.material)) child.material.forEach(material => {
                material.map?.dispose()
                material.dispose()
            })
            else {
                child.material?.map?.dispose()
                child.material?.dispose()
            }
        })
    }

    const updatePacmanGeometry = mouthSize => {
        if (!pacmanBody) return
        const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--wa-color-brand-60').trim() || '#ffd23f'
        pacmanBody.material.color.set(brandColor)
        const geometry = new THREE.CircleGeometry(0.36, 40, mouthSize / 2, (Math.PI * 2) - mouthSize)
        const previousGeometry = pacmanBody.geometry
        pacmanBody.geometry = geometry
        previousGeometry.dispose()
    }

    const updatePacmanExpression = (outcome, visible = false) => {
        if (!pacmanMouth) return
        pacmanMouth.visible = visible
        if (!visible || pacmanOutcome === outcome) return
        const isFrowning = outcome === 'lose'
        const previousGeometry = pacmanMouth.geometry
        const mouthCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.31, isFrowning ? -0.02 : 0.02, 0),
            new THREE.Vector3(0.2, isFrowning ? 0.12 : -0.12, 0),
            new THREE.Vector3(0.08, isFrowning ? 0.05 : -0.05, 0),
        )
        pacmanMouth.geometry = new THREE.BufferGeometry().setFromPoints(mouthCurve.getPoints(20))
        previousGeometry.dispose()
        pacmanOutcome = outcome
    }

    const rebuildClips = () => {
        if (!clipGroup) return
        clipGroup.children.forEach(disposeObject)
        clipGroup.clear()
        clipEntries = getEntries()
        clipSignature = clipEntries.map(entry => `${entry.trackId}:${entry.trackLabel}:${entry.clip.id}:${entry.clip.start}:${entry.clip.end}:${entry.clip.label}:${(entry.clip.colorClasses ?? []).join(',')}`).join('|')
        clipEntries.forEach(entry => {
            const geometry = new THREE.BoxGeometry(entry.width, 0.26, 0.22)
            const material = new THREE.MeshBasicMaterial({
                color: resolveClipColor(entry.clip),
                transparent: true,
                opacity: 0.9,
            })
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(entry.position)
            mesh.userData.label = entry.clip.label ?? entry.clip.id
            const outline = new THREE.LineSegments(
                new THREE.EdgesGeometry(geometry),
                new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.24}),
            )
            outline.position.z = 0.12
            mesh.add(outline)
            if (entry.width > 0.55) {
                const label = createTextSprite(entry.clip.label ?? entry.clip.id, {
                    color: '#ffffff',
                    fontSize: 15,
                    maxWidth: Math.min(1.45, entry.width - 0.12),
                })
                if (label) {
                    label.position.set(0, 0, 0.14)
                    mesh.add(label)
                }
            }
            entry.mesh = mesh
            clipGroup.add(mesh)
        })
    }

    const resize = () => {
        if (!renderer || !canvas.parentElement) return
        const bounds = canvas.parentElement.getBoundingClientRect()
        const width = Math.max(1, Math.floor(bounds.width))
        const height = Math.max(1, Math.floor(bounds.height))
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(width, height, false)
    }

    const ensureRenderer = () => {
        if (renderer) return true
        try {
            renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true})
        } catch {
            setMessage('WebGL is unavailable in this browser')
            return false
        }
        renderer.setClearColor(0x07111f, 0)
        scene = new THREE.Scene()
        camera = new THREE.OrthographicCamera(-5.7, 5.7, 3, -3, 0.1, 100)
        camera.position.z = 10
        clipGroup = new THREE.Group()
        laneGroup = new THREE.Group()
        rulerGroup = new THREE.Group()
        scene.add(laneGroup, rulerGroup)
        scene.add(clipGroup)

        const stage = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 5.5),
            new THREE.MeshBasicMaterial({color: 0x07111f, transparent: true, opacity: 0.9}),
        )
        stage.position.z = -0.5
        scene.add(stage)
        rebuildStructure()
        playhead = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -2.5, 0),
                new THREE.Vector3(0, rulerY + 0.1, 0),
            ]),
            new THREE.LineBasicMaterial({color: 0x58b8ff, transparent: true, opacity: 0.95}),
        )
        playhead.position.set(worldLeft, 0, 0.32)
        scene.add(playhead)

        pacman = new THREE.Group()
        pacmanBody = new THREE.Mesh(
            new THREE.CircleGeometry(0.36, 40, 0.2, (Math.PI * 2) - 0.4),
            new THREE.MeshBasicMaterial({color: getComputedStyle(document.documentElement).getPropertyValue('--wa-color-brand-60').trim() || '#ffd23f'}),
        )
        const eye = new THREE.Mesh(
            new THREE.CircleGeometry(0.045, 16),
            new THREE.MeshBasicMaterial({color: 0x101828}),
        )
        eye.position.set(0.12, 0.17, 0.34)
        pacmanMouth = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({color: 0x101828, depthTest: false}),
        )
        pacmanMouth.visible = false
        pacman.add(pacmanBody, eye, pacmanMouth)
        updatePacmanExpression('win')
        pacman.position.copy(targetPosition)
        scene.add(pacman)
        rebuildClips()
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(canvas.parentElement)
        resize()
        return true
    }

    const syncScene = () => {
        if (!renderer) return
        const durationMillis = Number(timeline.options?.durationMillis) || DEMO_DURATION_MILLIS
        if (playhead) playhead.position.x = worldLeft + (Math.max(0, Math.min(durationMillis, currentTimeMillis)) / durationMillis) * worldWidth
        const nextEntries = getEntries()
        const nextSignature = nextEntries.map(entry => `${entry.trackId}:${entry.trackLabel}:${entry.clip.id}:${entry.clip.start}:${entry.clip.end}:${entry.clip.label}:${(entry.clip.colorClasses ?? []).join(',')}`).join('|')
        if (nextSignature !== clipSignature) {
            rebuildStructure()
            rebuildClips()
        }

        let activeIndex = -1
        clipEntries.forEach((entry, index) => {
            if (entry.startMillis <= currentTimeMillis) activeIndex = index
        })
        const currentEntry = activeIndex >= 0 ? clipEntries[activeIndex] : clipEntries[0]
        const eatenStates = clipEntries.map((entry, index) => getEatenState(entry, index, clipEntries, currentTimeMillis))
        const eatenCount = eatenStates.filter(state => state.fullyEaten).length
        const almostEatenCount = eatenStates.filter(state => state.almostEaten).length
        clipEntries.forEach((entry, index) => {
            const eatenState = eatenStates[index]
            entry.mesh.position.copy(entry.position)
            const isActive = index === activeIndex
            entry.mesh.visible = !eatenState.fullyEaten
            entry.mesh.material.opacity = isActive ? 1 : eatenState.progress > 0 ? 0.42 : 0.9
            entry.mesh.scale.setScalar(1)
            if (eatenState.progress > 0) {
                const remaining = Math.max(0.04, 1 - eatenState.progress)
                const clipLength = entry.endPosition.x - entry.startPosition.x
                entry.mesh.scale.x = remaining
                entry.mesh.position.x = entry.startPosition.x + ((eatenState.progress + (remaining / 2)) * clipLength)
            }
        })
        if (currentEntry) {
            targetEntry = currentEntry
            const clipProgress = Math.max(0, Math.min(1, (currentTimeMillis - currentEntry.startMillis) / Math.max(1, currentEntry.endMillis - currentEntry.startMillis)))
            targetPosition = currentEntry.startPosition.clone().lerp(currentEntry.endPosition, clipProgress)
            chewing = playing
                && activeIndex >= 0
                && currentTimeMillis >= currentEntry.startMillis
                && currentTimeMillis < currentEntry.endMillis
            if (activeIndex !== lastActiveIndex && pacman) {
                pacman.position.copy(targetPosition)
            }
            lastActiveIndex = activeIndex
            setMessage(`${chewing ? 'Eating' : 'At'} ${currentEntry.clip.label ?? currentEntry.clip.id}`, eatenCount, almostEatenCount)
        } else {
            targetPosition = new THREE.Vector3(worldLeft, 0, 0.4)
            targetEntry = null
            chewing = false
            lastActiveIndex = -1
            setMessage('Waiting for the first clip', eatenCount, almostEatenCount)
        }
    }

    const renderFrame = timestamp => {
        frameId = window.requestAnimationFrame(renderFrame)
        if (pacman) {
            const previousX = pacman.position.x
            pacman.position.copy(targetPosition)
            const direction = targetPosition.x >= previousX ? 1 : -1
            pacman.scale.x = direction
            const chomp = Math.abs(Math.sin(timestamp / (playing ? 78 : 180)))
            updatePacmanGeometry(chewing ? chomp : 0)
            const biteIsActive = chewing && Math.sin(timestamp / 78) > 0.92
            if (biteIsActive && !biteWasActive) audio.chomp()
            biteWasActive = biteIsActive
            if (targetEntry?.mesh) targetEntry.mesh.scale.y = chewing ? 1 + (chomp * 0.16) : 1
        }
        renderer.render(scene, camera)
    }

    const startRendering = () => {
        if (!ensureRenderer() || frameId !== null) return
        syncScene()
        frameId = window.requestAnimationFrame(renderFrame)
    }

    const stopRendering = () => {
        if (frameId === null) return
        window.cancelAnimationFrame(frameId)
        frameId = null
    }

    const setOpen = open => {
        popup.active = open
        if (open) {
            audio.start()
            startRendering()
            window.requestAnimationFrame(resize)
        } else {
            audio.stop()
            stopRendering()
        }
    }

    const updateTime = (timeMillis, isTimelinePlaying) => {
        currentTimeMillis = Number(timeMillis) || 0
        playing = Boolean(isTimelinePlaying)
        if (playing && popup.active) audio.start()
        if (!playing) {
            audio.pause()
            biteWasActive = false
        }
        if (renderer) syncScene()
    }

    const setTracks = () => {
        if (renderer) syncScene()
    }

    const reset = () => updateTime(0, false)

    const handlePointerMove = event => {
        if (!dragState) return
        popupOffset = {
            x: dragState.offsetX + event.clientX - dragState.clientX,
            y: dragState.offsetY + event.clientY - dragState.clientY,
        }
        popupContent.style.translate = `${popupOffset.x}px ${popupOffset.y}px`
    }

    const stopDragging = event => {
        if (!dragState) return
        dragHandle.releasePointerCapture?.(event.pointerId)
        dragHandle.classList.remove('is-dragging')
        dragState = null
    }

    dragHandle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('wa-button')) return
        dragState = {
            clientX: event.clientX,
            clientY: event.clientY,
            offsetX: popupOffset.x,
            offsetY: popupOffset.y,
        }
        dragHandle.setPointerCapture(event.pointerId)
        dragHandle.classList.add('is-dragging')
        event.preventDefault()
    })
    dragHandle.addEventListener('pointermove', handlePointerMove)
    dragHandle.addEventListener('pointerup', stopDragging)
    dragHandle.addEventListener('pointercancel', stopDragging)

    return {
        close: () => setOpen(false),
        open: () => setOpen(true),
        reset,
        setTracks,
        updateTime,
    }
}

readonlyTimeSlider.valueFormatter = value => `${formatMillis(value)} / ${formatMillis(SHORT_DEMO_DURATION_MILLIS)}`

let studioPacmanDemo

const studioClock = createPlaybackClock({
    timeline: studioTimeline,
    onTime: timeMillis => {
        studioSeekBackwardButton.disabled = timeMillis <= 0
        studioSeekForwardButton.disabled = timeMillis >= DEMO_DURATION_MILLIS
        studioStatus.textContent = studioTimeline.playing
            ? `Playing · ${studioClock.getRate()}× · ${formatMillis(timeMillis)}`
            : `Current time · ${formatMillis(timeMillis)}`
        studioOutput.textContent = `currentTimeMillis = ${timeMillis}`
        studioPacmanDemo?.updateTime(timeMillis, studioTimeline.playing)
    },
})

studioPacmanDemo = createPacmanDemo({
    canvas: studioPacmanCanvas,
    popup: studioPacmanPopup,
    progress: studioPacmanProgress,
    almostProgress: studioPacmanAlmostProgress,
    result: studioPacmanResult,
    status: studioPacmanStatus,
    timeline: studioTimeline,
})
studioPacmanDemo.updateTime(studioTimeline.currentTimeMillis, studioTimeline.playing)
studioPacmanClose.addEventListener('click', event => {
    event.stopPropagation()
    studioPacmanDemo.close()
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

const shuffleValues = values => {
    const shuffled = [...values]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        const current = shuffled[index]
        shuffled[index] = shuffled[swapIndex]
        shuffled[swapIndex] = current
    }
    return shuffled
}

const shuffleStudioClips = () => {
    const sourceTracks = studioTimeline.tracks ?? []
    if (sourceTracks.length === 0) return
    const tracks = sourceTracks.map(track => ({...track, clips: []}))
    const clips = shuffleValues(sourceTracks.flatMap(track => (track.clips ?? []).map(clip => ({...clip}))))
    if (clips.length === 0) return
    const durationSeconds = (Number(studioTimeline.timeline?.durationMillis) || DEMO_DURATION_MILLIS) / 1000
    const firstTrackForClip = shuffleValues(tracks)

    clips
        .sort((left, right) => (Number(right.end) - Number(right.start)) - (Number(left.end) - Number(left.start)))
        .forEach((clip, clipIndex) => {
            const clipDuration = Math.max(0, Number(clip.end) - Number(clip.start))
            const latestStart = Math.max(0, durationSeconds - clipDuration)
            const candidates = []
            const trackOrder = clipIndex < firstTrackForClip.length
                ? [firstTrackForClip[clipIndex], ...shuffleValues(tracks.filter(track => track !== firstTrackForClip[clipIndex]))]
                : shuffleValues(tracks)
            trackOrder.forEach(track => {
                for (let attempt = 0; attempt < 40; attempt += 1) {
                    const start = Number((Math.random() * latestStart).toFixed(2))
                    const end = start + clipDuration
                    const overlaps = track.clips.some(existing => start < Number(existing.end) && end > Number(existing.start))
                    if (!overlaps) candidates.push({track, start, end})
                }
            })

            const placement = candidates[0] ?? {track: tracks[Math.floor(Math.random() * tracks.length)], start: 0, end: clipDuration}
            placement.track.clips.push({...clip, start: placement.start, end: placement.end})
        })

    tracks.forEach(track => track.clips.sort((left, right) => Number(left.start) - Number(right.start)))
    studioTimeline.tracks = tracks
    studioPacmanDemo.setTracks()
    showStudioToast('Clips shuffled across the existing tracks', 'shuffle')
}

studioShuffleButton.addEventListener('pointerdown', event => event.stopPropagation())
studioShuffleButton.addEventListener('click', event => {
    event.stopPropagation()
    shuffleStudioClips()
})

seekStudioBy(studioSeekBackwardButton, 'rewind', 10_000)
seekStudioBy(studioSeekForwardButton, 'advance', 10_000)

studioTimeline.addEventListener('lgs1920-timeline-seek', event => {
    seekFromTimelineEvent(studioClock, event)
})
studioTimeline.addEventListener('lgs1920-timeline-loop-change', event => {
    studioTimeline.looping = event.detail.looping
    showStudioToast(event.detail.looping ? 'Loop enabled' : 'Loop disabled', 'repeat')
})
studioTimeline.addEventListener('lgs1920-timeline-play', () => {
    showStudioToast('Clip started', 'play')
    studioPacmanDemo.open()
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
    studioPacmanDemo.open()
    studioPacmanDemo.reset()
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
    studioPacmanDemo.setTracks()
    clipDragStatus.textContent = `Added ${clip.label} · ${Number(clip.end - clip.start).toFixed(1)}s · ${clip.kind}`
})

replenishGeneratedClipSources()

let currentRangeStartMillis = 6_000
let currentRangeEndMillis = 24_000

const updateRangeStatus = timeMillis => {
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
rangeTimeline.addEventListener('lgs1920-timeline-seek', event => {
    seekFromTimelineEvent(rangeClock, event)
})
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
    seekFromTimelineEvent(interactiveClock, event)
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
readonlyTimeline.addEventListener('lgs1920-timeline-play', () => {
    readonlyTimeline.playing = true
    readonlyClock.start()
})
readonlyTimeline.addEventListener('lgs1920-timeline-pause', () => {
    readonlyTimeline.playing = false
    readonlyClock.pause()
})
readonlyTimeline.addEventListener('lgs1920-timeline-stop', () => readonlyClock.stop())
readonlyTimeline.addEventListener('lgs1920-timeline-restart', event => readonlyClock.seek(event.detail.timeMillis))
readonlyTimeline.addEventListener('lgs1920-timeline-seek', event => seekFromTimelineEvent(readonlyClock, event))

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
