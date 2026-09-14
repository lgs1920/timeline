# `@lgs1920/timeline`

`@lgs1920/timeline` is a controlled timeline Web Component for Web Awesome 3. It renders tracks, clips, a time ruler, a playhead, playback controls, and editable interactions. An optional React adapter exposes the same controlled model.

The current release is `0.1.0`.

[Open the live demo](https://lgs1920.github.io/timeline/) · [Read the full component reference in the demo](https://lgs1920.github.io/timeline/docs/) · [View the npm package](https://www.npmjs.com/package/@lgs1920/timeline) · [View the repository](https://github.com/lgs1920/timeline)

The component stays domain-neutral and controlled by its host application. It never owns the application clock or persistence. The host provides the timeline and track models, receives `lgs1920-timeline-*` events, and writes accepted changes back to the element.

It supports:

- multiple tracks with video, audio, marker, or application-defined clip kinds;
- playhead scrubbing, frame stepping, range handles, zoom, and track resizing;
- clip movement, resizing, collision policies, snapping, drag and drop, and context actions;
- editable track labels, visibility, ordering, addition, and removal;
- display-only projections through `interactive: false`;
- Web Component slots and a React adapter with matching callbacks.

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
