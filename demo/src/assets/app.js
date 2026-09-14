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
import '@awesome.me/webawesome/dist/components/icon/icon.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@lgs1920/timeline'

const themeClasses = ['wa-theme-default', 'wa-theme-awesome', 'wa-theme-shoelace']
const modeClasses = ['wa-light', 'wa-dark']
const brandClasses = ['wa-brand-blue', 'wa-brand-red', 'wa-brand-orange', 'wa-brand-green', 'wa-brand-cyan', 'wa-brand-purple', 'wa-brand-pink']

const interactiveTimeline = document.querySelector('#interactive-timeline')
const readonlyTimeline = document.querySelector('#readonly-timeline')
const eventOutput = document.querySelector('#event-output')
const eventStatus = document.querySelector('#event-status')

const tracks = [
    {
        id: 'story',
        label: 'Story',
        icon: 'film',
        colorClasses: ['wa-neutral', 'wa-neutral-blue'],
        canHide: true,
        clips: [
            {id: 'opening', label: 'Opening', kind: 'video', start: 0, end: 9, colorClasses: ['wa-blue']},
            {id: 'middle', label: 'Middle scene', kind: 'video', start: 18, end: 33, colorClasses: ['wa-purple']},
        ],
    },
    {
        id: 'sound',
        label: 'Sound',
        icon: 'music',
        colorClasses: ['wa-neutral', 'wa-neutral-green'],
        canHide: true,
        clips: [
            {id: 'music', label: 'Music bed', kind: 'audio', start: 5, end: 43, colorClasses: ['wa-green']},
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

const emitStatus = event => {
    const detail = event.detail ?? {}
    const label = `${event.type.replace('lgs1920-timeline-', '')} · ${detail.clip?.label ?? detail.trackId ?? ''}`.trim()
    eventOutput.textContent = JSON.stringify(detail, (key, value) => key === 'event' ? undefined : value, 2)
    eventStatus.textContent = label
}

const applyTheme = value => {
    document.documentElement.classList.remove(...themeClasses)
    document.documentElement.classList.add(`wa-theme-${value}`)
}

const applyMode = value => {
    document.documentElement.classList.remove(...modeClasses)
    document.documentElement.classList.add(value === 'light' ? 'wa-light' : 'wa-dark')
}

const applyBrand = value => {
    document.documentElement.classList.remove(...brandClasses)
    document.documentElement.classList.add(`wa-brand-${value}`)
}

configureTimeline(interactiveTimeline, {interactive: true})
configureTimeline(readonlyTimeline, {interactive: false, editable: false})

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

document.querySelector('#theme-control').addEventListener('change', event => applyTheme(event.target.value))
document.querySelector('#mode-control').addEventListener('change', event => applyMode(event.target.value))
document.querySelector('#color-control').addEventListener('change', event => applyBrand(event.target.value))
