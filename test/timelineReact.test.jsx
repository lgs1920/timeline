// @vitest-environment jsdom
/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: timelineReact.test.jsx
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

import {cleanup, render} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'

vi.mock('@awesome.me/webawesome/dist/components/button/button.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/card/card.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/color-picker/color-picker.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/drawer/drawer.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/icon/icon.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/input/input.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/popup/popup.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/split-panel/split-panel.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/slider/slider.js', () => ({}))
vi.mock('@awesome.me/webawesome/dist/components/tooltip/tooltip.js', () => ({}))

import {LGS1920TimelineReact} from '../src/timelineReact'

const options = {
    mode: 'edit',
    durationMillis: 5_000,
    visible: true,
}

const tracks = []

afterEach(() => cleanup())

describe('LGS1920TimelineReact', () => {
    it('bridges grouped options, controlled state, slots, and events', () => {
        const onSeek = vi.fn()
        const onDblClick = vi.fn()
        const {container} = render(
            <LGS1920TimelineReact
                options={options}
                tracks={tracks}
                currentTimeMillis={0}
                playing={false}
                clipOptions={[]}
                events={{
                    seek: onSeek,
                    dblclick: onDblClick,
                }}>
                <span slot="header">React header</span>
            </LGS1920TimelineReact>,
        )
        const element = container.querySelector('lgs1920-timeline')
        element.dispatchEvent(new CustomEvent('lgs1920-timeline-seek', {
            bubbles: true,
            composed: true,
            detail: {timeMillis: 1_000},
        }))

        expect(element.options.mode).toBe('edit')
        expect(element.shadowRoot.querySelector('slot[name="header"]').assignedElements()[0].textContent).toBe('React header')
        expect(onSeek).toHaveBeenCalledWith({timeMillis: 1_000}, expect.any(CustomEvent))

        const dblclickDetail = {clip: {id: 'clip#001'}}
        element.dispatchEvent(new CustomEvent('lgs1920-timeline-dblclick', {
            bubbles: true,
            composed: true,
            detail: dblclickDetail,
        }))
        expect(onDblClick).toHaveBeenCalledWith(dblclickDetail, expect.any(CustomEvent))
    })

    it('bridges event lifecycle descriptors and cancellation', () => {
        const order = []
        const beforePause = vi.fn((_detail, event) => {
            order.push(`before:${event.type}`)
            event.preventDefault()
        })
        const {container} = render(
            <LGS1920TimelineReact
                options={options}
                events={{
                    play: {
                        before: (_detail, event) => order.push(`before:${event.type}`),
                        on: (_detail, event) => order.push(`on:${event.type}`),
                        after: (_detail, event) => order.push(`after:${event.type}`),
                    },
                    pause: {
                        before: beforePause,
                        on: (_detail, event) => order.push(`pause:${event.type}`),
                        after: _event => order.push('after:pause'),
                    },
                }}/>,
        )
        const element = container.querySelector('lgs1920-timeline')
        element.shadowRoot.querySelector('[data-testid="lgs1920-wa-timeline-play"]').click()
        expect(order).toEqual([
            'before:lgs1920-timeline-play',
            'on:lgs1920-timeline-play',
            'after:lgs1920-timeline-play',
        ])

        element.playing = true
        element.shadowRoot.querySelector('[data-testid="lgs1920-wa-timeline-play"]').click()
        expect(beforePause).toHaveBeenCalledOnce()
        expect(order).not.toContain('pause:lgs1920-timeline-pause')
        expect(order).not.toContain('after:pause')
    })

    it('supports lifecycle descriptors for continuous event names', () => {
        const onChanging = vi.fn()
        const {container} = render(
            <LGS1920TimelineReact
                options={options}
                events={{
                    'clip-changing': onChanging,
                }}/>,
        )
        const element = container.querySelector('lgs1920-timeline')
        const detail = {clipId: 'clip#001'}
        const event = new CustomEvent('lgs1920-timeline-clip-changing', {detail})
        element.dispatchEvent(event)

        expect(onChanging).toHaveBeenCalledWith(detail, event)
    })
})
