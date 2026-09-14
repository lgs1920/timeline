# @lgs1920/timeline

`@lgs1920/timeline` is a controlled timeline Web Component built for Web
Awesome 3. It supports multiple tracks, clips, keyboard editing, pointer
editing, drag and drop, and an optional React adapter.

## Installation

```bash
bun add @lgs1920/timeline
```

Load the Web Awesome theme once in the host application, then import the custom
element:

```js
import '@awesome.me/webawesome/dist/styles/webawesome.css'
import '@lgs1920/timeline'
```

```html
<lgs1920-timeline id="timeline" aria-label="Video timeline"></lgs1920-timeline>
```

```js
const timeline = document.getElementById('timeline')

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
```

The component is controlled by its host. It emits events in the
`lgs1920-timeline-*` namespace and does not own an application clock. The
complete API is documented in
[`src/lgs1920-timeline/README.md`](src/lgs1920-timeline/README.md).

## React adapter

React is an optional peer dependency. Import the adapter from its dedicated
entry point:

```jsx
import {LGS1920TimelineReact} from '@lgs1920/timeline/react'

export const VideoTimeline = props => <LGS1920TimelineReact {...props}/>
```

## Development

The repository uses Bun for dependency management, tests, bundling, and the
Eleventy demonstration site.

```bash
bun install
bun run verify
bun run pack:check
```

The demo can be built or served locally:

```bash
bun run demo:build
bun run demo:serve
```

## npm publication

Inspect the publish payload without changing the registry:

```bash
bun run publish:check
```

Publish the current version after authentication and version validation:

```bash
bun run publish:npm
```

The `prepack` lifecycle runs tests, linting, and the Bun build before a package
is packed or published.
