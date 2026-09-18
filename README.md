# `@lgs1920/timeline`

<p align="center">
  <strong>A controlled timeline Web Component for Web Awesome applications.</strong><br>
  Build editing interfaces with tracks, clips, playback, range selection, zoom, and external clip sources.
</p>

<p align="center">
  <a href="https://lgs1920.github.io/timeline/">Live demo</a> ·
  <a href="https://lgs1920.github.io/timeline/docs/">API documentation</a> ·
  <a href="https://www.npmjs.com/package/@lgs1920/timeline">npm</a> ·
  <a href="https://github.com/lgs1920/timeline">Repository</a>
</p>

The application owns the playback clock, persistence, and business rules. The
timeline renders the state provided by its host and emits namespaced events for
user intent and editing results.

The component is designed for Web Awesome applications. It uses Web Awesome
components, themes, and design tokens for its controls and visual integration.

The current release is `1.0.0`.

## Overview

| Timeline editing | Host integration |
| --- | --- |
| Multiple tracks with video, audio, marker, or custom clip kinds | Controlled timeline, tracks, playhead, and playback state |
| Move, trim, snap, reorder, extend, mask, and duplicate clips | Namespaced events with optional cancelable `before` and `after` hooks |
| Range handles, frame stepping, keyboard shortcuts, and zoom | Web Component slots, external controls, and a React adapter |
| Read-only projections for compact sequence summaries | Collision policies and application-defined clip actions |

## Installation

The package supports Bun 1.4 or newer and Node.js 20 or newer.

```bash
bun add @lgs1920/timeline
```

Import the Web Awesome stylesheet in the host application, then register the
timeline element:

```js
import '@awesome.me/webawesome/dist/styles/webawesome.css'
import '@lgs1920/timeline'
```

The stylesheet remains in the host application so the host controls when the
Web Awesome styles are loaded. The package registers the Web Awesome components
required by the timeline and registers `<lgs1920-timeline>`.

## Quick start

```html
<lgs1920-timeline id="timeline" aria-label="Video timeline"></lgs1920-timeline>
```

```js
const timeline = document.querySelector('#timeline')

timeline.options = {
    mode: 'edit',
    durationMillis: 60_000,
    view: {visible: true},
}

timeline.tracks = [
    {
        id: 'camera',
        label: 'Camera',
        clips: [
            {id: 'intro', label: 'Introduction', kind: 'video', start: 0, end: 8},
        ],
    },
]

timeline.currentTimeMillis = 0
timeline.playing = false
timeline.looping = false

timeline.addEventListener('lgs1920-timeline-seek', event => {
    timeline.currentTimeMillis = event.detail.timeMillis
})

timeline.on('clip-change', {
    before: event => validateClipEdit(event.detail),
    on: event => timeline.tracks = event.detail.tracks,
    after: event => console.log('clip edit completed', event.detail),
})
```

Timeline duration and range values use milliseconds. Clip `start` and `end`
values use seconds. The component emits user intent and editing results; the
host decides whether to persist the resulting state or connect it to a media
player.

## Controlled playback

The component does not advance the application clock. It emits playback
requests, while the host starts or stops its own clock and writes the current
position back through `currentTimeMillis`.

An accepted play request always starts at the active range start. The host
clock must stop at the active range end, or return to the range start when
looping is enabled.

The loop button emits a controlled `loop-change` request. Apply its
`detail.looping` value to the host playback clock and to `timeline.looping`.
Set `timeline.noLoopMode = true` to hide that button.

```js
timeline.addEventListener('lgs1920-timeline-play', () => {
    timeline.playing = true
    media.play()
})

timeline.addEventListener('lgs1920-timeline-pause', () => {
    timeline.playing = false
    media.pause()
})

timeline.addEventListener('lgs1920-timeline-seek', event => {
    const timeMillis = event.detail.timeMillis
    timeline.currentTimeMillis = timeMillis
    media.currentTime = timeMillis / 1000
})

media.addEventListener('timeupdate', () => {
    timeline.currentTimeMillis = media.currentTime * 1000
})
```

The same loop applies to `stop`, `restart`, and frame navigation. For direct
host-controlled movement without emitting a seek event, use `setTime()`,
`advance(durationMillis)`, or `rewind(durationMillis)`.

## Public configuration and events

Use grouped `options` for configuration:

```js
timeline.options = {
    mode: 'edit',
    durationMillis: 60_000,
    playback: {loop: 'toggle', transport: 'visible', time: 'visible', timeSlider: 'visible'},
    view: {visible: true, zoomSlider: true},
    range: {startMillis: 0, endMillis: 60_000},
    layout: {legend: {width: 150}},
    editing: {clipMenu: true, collisionPolicy: 'prevent'},
}
```

`tracks`, `currentTimeMillis`, `playing`, and `looping` remain separate
controlled properties. Subscribe to one canonical event with `on()` when the
action needs lifecycle hooks:

```js
timeline.on('seek', event => console.log(event.detail), {
    before: event => event.detail.timeMillis < 0 && event.preventDefault(),
    after: event => console.log('seek completed', event.detail),
})
```

The DOM event `lgs1920-timeline-seek` is dispatched for the main action.
`before-*` and `after-*` DOM events and the old React callback props are no
longer part of the API. The React adapter uses `events={{seek: {before, on,
after}}}` and callbacks receive `(detail, event)`.

## Tracks and clips

Tracks are serializable objects identified by a stable `id`. Each track can
define its label, icon, color classes, visibility, accepted clip kinds, and
editing policies. Clips use stable identifiers and second-based `start` and
`end` positions.

```js
timeline.tracks = [
    {
        id: 'camera#main',
        label: 'Main camera',
        icon: 'video',
        clips: [
            {id: 'intro#001', label: 'Intro', kind: 'video', start: 0, end: 8},
            {id: 'scene#002', label: 'Scene', kind: 'video', start: 12, end: 36},
        ],
    },
    {
        id: 'music',
        label: 'Music',
        icon: 'music',
        clips: [
            {id: 'music#001', label: 'Opening theme', kind: 'audio', start: 0, end: 42},
        ],
    },
]
```

The component exposes four interaction contracts:

- `interactive: false`: passive projection with no transport, scrubbing,
  selection, menus, editing, or drag targets.
- `interactive: true` with `editable: false`: playback, scrubbing, selection,
  and keyboard navigation remain available while editing and context menus are
  disabled.
- `interactive: true` with `editable: true`: playback and the configured track
  and clip editing operations are available. Right-click a track to open its
  `Edit`, `Hide`/`Show`, or `Remove` actions when the data allows them.
- `readonly` HTML attribute: playback controls and the playhead grip remain
  available; range handles are fixed and editing, scrubbing, selection, menus,
  and drag targets are disabled. Visible and enabled track names keep their
  normal text color while remaining non-editable.

`readonly` is also available as a boolean element property. It is separate from
the `timeline` configuration object.

```html
<lgs1920-timeline readonly></lgs1920-timeline>
```

## External clip sources

Clip sources can live in a toolbar, palette, or application menu. They do not
need to be placed in a timeline slot. Serialize a clip option with the
exported MIME constant and drop it on an editable track:

```html
<wa-button id="clip-source" draggable="true">
  Add a clip by dragging it
</wa-button>

<lgs1920-timeline id="timeline"></lgs1920-timeline>
```

```js
import {CLIP_OPTION_DRAG_MIME} from '@lgs1920/timeline'

document.querySelector('#clip-source').addEventListener('dragstart', event => {
    const option = {
        key: 'random-clip',
        label: 'Random clip',
        kind: 'video',
        duration: 7.4,
        clip: {
            icon: 'camera',
            colorClasses: ['wa-neutral', 'wa-neutral-purple'],
        },
    }

    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(CLIP_OPTION_DRAG_MIME, JSON.stringify(option))
})
```

The pointer represents the clip center during the drag. Outside a drop track,
the host can show a floating drag representation; over a compatible track, the
timeline shows the clip preview. The timeline applies the configured snap and
collision rules and previews rejected placements. If
the resulting `add-clip` event has `detail.clip === null`, the host can ask the
user to choose another track or drop position.

## Range playback and built-in controls

Set `range.startMillis` and `range.endMillis` to limit the active playback range.
The built-in time slider is displayed by default in the left playback area.
Set `noTimeSlider: true` to hide it. Set `showZoomSlider` to display the component's built-in
horizontal zoom control in the footer. The footer also contains the built-in
horizontal-fit and vertical-zoom buttons unless `noZoomControls` is enabled.
Set `playback.transport` to `'hidden'` to remove the built-in transport buttons
and loop toggle. Set `playback.time` to `'hidden'` to remove the current and
total time labels. This is useful when a host provides an external player and
time slider.
Editable timelines place a scissors editing tool immediately to the left of
the time slider. Hovering a clip in cut mode shows a dashed guide and clicking
splits it at that position. `Ctrl/Cmd+K` cuts eligible clips at the playhead;
`Escape` or clicking the scissors button exits cut mode. Set
`view.tools: 'hidden'` or the `tools-hidden` attribute/property to hide the
editing tool.
External controls can use the `timeline-ruler`, `timeline-controls`, and
`footer` slots when the host needs a different layout.

```js
timeline.options = {
    durationMillis: 60_000,
    range: {startMillis: 6_000, endMillis: 24_000},
    playback: {transport: 'hidden', time: 'hidden', timeSlider: 'visible'},
    view: {zoomSlider: true, zoomControls: 'visible'},
}
```

The start and end handles remain visible as the viewport moves. During
playback, the component follows the playhead when the active range extends
beyond the visible surface.

While playback is active, track and clip editing is locked: context menus,
title editing, drag operations, range changes, and insertion are disabled.
Playback controls and the built-in time and zoom sliders remain available.

## React adapter

React is an optional peer dependency:

```jsx
import {LGS1920TimelineReact} from '@lgs1920/timeline/react'

export const VideoTimeline = props => <LGS1920TimelineReact {...props} />
```

The adapter accepts the same `timeline`, `tracks`, `currentTimeMillis`, and
`playing` model as the Web Component. Event callbacks receive `(detail, event)`.
The complete callback mapping is in the [API documentation](https://lgs1920.github.io/timeline/docs/).

## Documentation

- [Complete component reference](https://lgs1920.github.io/timeline/docs/): properties, data models, slots, events, editing behavior, CSS parts, methods, and accessibility.
- [Functional, technical, and software specifications](docs/specifications.md)
- [Live demo](https://lgs1920.github.io/timeline/): controlled playback, clip editing, readonly playback, range playback, slots, and keyboard interaction.
- [NPM package](https://www.npmjs.com/package/@lgs1920/timeline)
- [Source repository](https://github.com/lgs1920/timeline)

## Development

```bash
bun install
bun run verify
bun run pack:check
```

The verification command runs the tests, linting, package build, consumer
export check, and static demo build. Build and serve the demo independently:

```bash
bun run demo:build
bun run demo:serve
```

The local demo is served at `http://localhost:4174`. The generated Pages
directory is `demo/dist/`; the package bundle is generated in `dist/`. These
directories are build outputs and must not be edited manually.

After cloning, install the repository hooks once if you need the project
header and staged-file checks:

```bash
bun run git:hooks:install
```

## Release

Preview release metadata before changing the working tree:

```bash
bun run publish --preview
bun run publish --minor --preview
```

After reviewing the preview on a clean, validated working tree, the release
script can update the version, create the annotated tag, and publish the
package:

```bash
bun run publish
bun run publish --minor
bun run publish --major
```

## License

MIT. See [`LICENSE.md`](LICENSE.md).
