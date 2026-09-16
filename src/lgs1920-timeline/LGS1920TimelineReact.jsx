/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: LGS1920TimelineReact.jsx
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

import {useEffect, useRef} from 'react'
import {LGS1920Timeline} from './LGS1920Timeline'

/**
 * React adapter for the controlled `lgs1920-timeline` Web Component.
 *
 * This adapter only bridges React properties and event callbacks. The Web
 * Component remains responsible for DOM rendering and pointer interaction.
 *
 * @param {Object} props - React component properties.
 * @param {Object} [props.options={}] - Grouped timeline options.
 * @param {Object} [props.timeline] - Deprecated alias for `options`.
 * @param {Array} [props.tracks=[]] - Public track definitions.
 * @param {number} [props.currentTimeMillis=0] - Current logical time.
 * @param {boolean} [props.playing=false] - Whether playback is active.
 * @param {boolean} [props.looping=false] - Whether playback repeats its range.
 * @param {boolean} [props.noLoopMode=false] - Deprecated compatibility alias.
 * @param {Array|null} [props.clipOptions=null] - Clip insertion options, or null for the generic option.
 * @param {Object} [props.events={}] - Event descriptors keyed by event suffix.
 * @returns {JSX.Element} Web Component React adapter.
 */
export const LGS1920TimelineReact = ({
    options = null,
    timeline = {},
    tracks = [],
    currentTimeMillis = 0,
    playing = false,
    looping = false,
    noLoopMode = false,
    clipOptions = null,
    events = {},
    children,
}) => {
    const _element = useRef(null)
    const resolvedOptions = options ?? timeline

    useEffect(() => {
        const element = _element.current
        if (!element) return
        element.options = resolvedOptions
        element.tracks = tracks
        element.clipOptions = clipOptions
    }, [clipOptions, options, resolvedOptions, timeline, tracks])

    useEffect(() => {
        const element = _element.current
        if (!element) return
        element.currentTimeMillis = currentTimeMillis
    }, [currentTimeMillis])

    useEffect(() => {
        const element = _element.current
        if (!element) return
        element.playing = playing
    }, [playing])

    useEffect(() => {
        const element = _element.current
        if (!element) return
        element.noLoopMode = noLoopMode
    }, [noLoopMode])

    useEffect(() => {
        const element = _element.current
        if (!element) return
        element.looping = looping
    }, [looping])

    useEffect(() => {
        const element = _element.current
        if (!element) return undefined
        const removers = Object.entries(events ?? {}).map(([name, descriptor]) => {
            const config = typeof descriptor === 'function' ? {on: descriptor} : (descriptor ?? {})
            const main = typeof config.on === 'function'
                ? event => config.on(event.detail, event)
                : undefined
            const lifecycle = {
                before: typeof config.before === 'function'
                    ? event => config.before(event.detail, event)
                    : undefined,
                after: typeof config.after === 'function'
                    ? event => config.after(event.detail, event)
                    : undefined,
            }
            return element.on(name, main, lifecycle)
        })
        return () => removers.forEach(remove => remove())
    }, [events])

    return (
        <lgs1920-timeline ref={_element}>
            {children}
        </lgs1920-timeline>
    )
}

LGS1920TimelineReact.displayName = 'LGS1920TimelineReact'

export {LGS1920Timeline}
