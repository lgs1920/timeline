# 🎬 `@lgs1920/timeline`

<p align="center">
  <strong>A vivid, controlled timeline for Web Awesome applications.</strong><br>
  Build editing surfaces with tracks, clips, playback, zoom, range selection, and drag-and-drop sources.
</p>

<p align="center">
  <a href="https://lgs1920.github.io/timeline/"><img src="https://img.shields.io/badge/demo-live-7c3aed?style=for-the-badge" alt="Live demo"></a>
  <a href="https://www.npmjs.com/package/@lgs1920/timeline"><img src="https://img.shields.io/npm/v/@lgs1920/timeline?style=for-the-badge&color=06b6d4" alt="npm version"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="MIT license"></a>
</p>

> **Designed for controlled state.** Your application owns the clock, persistence, and business rules. The component renders the timeline, emits `lgs1920-timeline-*` events, and accepts the state you write back.

[**Open the live demo →**](https://lgs1920.github.io/timeline/) · [**Read the full documentation →**](https://lgs1920.github.io/timeline/docs/) · [npm](https://www.npmjs.com/package/@lgs1920/timeline) · [Repository](https://github.com/lgs1920/timeline)

The current release is `0.1.3`.

## ✨ What you get

| 🎞️ Editing surface | 🎛️ Application control |
| --- | --- |
| Multiple tracks with video, audio, marker, or custom clip kinds | Controlled timeline, tracks, playhead, and playback state |
| Move, resize, snap, reorder, extend, mask, and duplicate clips | Namespaced events with cancelable before/after lifecycles |
| Range handles, frame stepping, keyboard shortcuts, and zoom | Web Component slots, external controls, and a React adapter |
| Read-only projections for compact sequence summaries | Collision policies and application-defined clip actions |

## Install

The package requires Bun 1.4 or newer or Node.js 20 or newer. Install the package and load the Web Awesome stylesheet in the host application:

```bash
bun add @lgs1920/timeline
```

```js
import '@awesome.me/webawesome/dist/styles/webawesome.css'
import '@lgs1920/timeline'
```

The stylesheet belongs to the host application so it controls when Web Awesome styles are loaded. The package registers the Web Awesome components required by the timeline and registers `<lgs1920-timeline>`.

## Minimal usage

```html
<lgs1920-timeline id="timeline" aria-label="Video timeline"></lgs1920-timeline>
```

```js
const timeline = document.querySelector('#timeline')

timeline.timeline = {
    durationMillis: 60_000,
    visible: true,
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

timeline.addEventListener('lgs1920-timeline-seek', event => {
    timeline.currentTimeMillis = event.detail.timeMillis
})
```

The public timeline and range values use milliseconds. Clip `start` and `end` values use seconds. The element emits intent and interaction results; the host decides whether to persist them or connect them to playback.

On the initial display, the range start handle stays visible by default. When
there is enough content before it, the component places it at 5% from the
left edge of the visible timeline. Set `timeline.initialRangeStartVisible` to
`false` to keep the default scroll position.

During playback, the playhead remains visible while the timeline follows the
current time. Forward playback holds it at 75% of the visible surface while
the selected end is still outside the viewport, then lets it move again once
that end is visible. Reverse playback applies the mirrored rule at 25% while
the selected start remains outside the viewport.

## ▶️ Connect external playback

Playback is controlled by the host. The component emits an intent; the host
starts or stops its own media clock and writes the resulting position back
through `currentTimeMillis`. Scrubbing follows the same loop through the
`seek` event:

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

The `play`, `pause`, `stop`, `restart`, and `seek` events are requests from the
timeline UI. The component does not advance the application clock by itself.

## 🪄 Add clips from an external source

Clip sources can live above the timeline in a palette, toolbar, or application menu. They do not need to be placed in a timeline slot. Make the source draggable, serialize a clip option with the exported MIME constant, and drop it on an editable track:

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

The pointer represents the clip center during the drag, then the timeline applies the same snap and collision rules used by internal clip dragging. While the source is over a track, the timeline previews the placement; an occupied or otherwise insufficient track is shown in red. If `add-clip` reports `detail.clip === null`, let the user choose another compatible track or drop position. The demo creates a fresh random clip source on click, then lets the user drag it onto the timeline. The complete slot and event reference remains in the [documentation](https://lgs1920.github.io/timeline/docs/).

## React adapter

React is an optional peer dependency:

```jsx
import {LGS1920TimelineReact} from '@lgs1920/timeline/react'

export const VideoTimeline = props => <LGS1920TimelineReact {...props} />
```

Use the same `timeline`, `tracks`, `currentTimeMillis`, and `playing` props as the Web Component. Event callbacks receive `(detail, event)`.

## Development

```bash
bun install
bun run verify
bun run pack:check
```

The verification command runs the tests, linting, package build, consumer export check, and static demo build. Build and serve the demo independently with:

```bash
bun run demo:build
bun run demo:serve
```

The local demo is served at `http://localhost:4173`. The generated Pages directory is `demo/dist/`; the package bundle is generated in `dist/`. Both are build outputs and must not be edited manually.

The repository rules and shared component delivery skill are available through
[AGENTS.md](AGENTS.md) and the [skills directory](skills/). After cloning,
activate the local Git hooks once:

```bash
bun run git:hooks:install
```

When local guidance links are configured, the pre-commit hook copies their
targets into the commit and the post-commit hook restores the links. The same
pre-commit hook updates staged source-file headers. A standalone clone remains
self-contained; use `bun run headers:check` to verify staged headers without
changing files.

## Release and publication

Preview the next release and its annotated tag message without changing files:

```bash
bun run publish --preview
bun run publish --minor --preview
```

After reviewing the preview on a clean, validated working tree, the release script can update the version, commit the release, create the annotated tag, and push it:

```bash
bun run publish
bun run publish --minor
bun run publish --major
```

The tag workflow reruns verification, checks that the tag matches `package.json`, publishes `@lgs1920/timeline` to npm using the `NPM_TOKEN` repository secret, and creates the GitHub release from the tag notes. Pushes to `main` build and deploy the demo to GitHub Pages.

The complete API reference, including properties, track and clip models, slots, events, editing behavior, CSS tokens, methods, and accessibility notes, is available in the [documentation page of the demo](https://lgs1920.github.io/timeline/docs/). The same reference is also maintained in the [LGS1920 site documentation](https://github.com/lgs1920/site/blob/main/docs/lgs1920-timeline.md).

## License

MIT. See [`LICENSE.md`](LICENSE.md).
