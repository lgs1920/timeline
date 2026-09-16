# LGS1920 Timeline component reference

`@lgs1920/timeline` is a controlled Web Component for building timeline-based
editing interfaces. It provides a time ruler, playhead, tracks, clips, range
selection, scrubbing, playback controls, keyboard interaction, and drag and
drop support.

The application remains the source of truth. It supplies the timeline and
track state, responds to component events, and writes controlled updates back
to the element. The package includes an optional React adapter with the same
public model.

This document is the complete API reference. For installation, a short
integration example, and a guided overview, start with the [package README](../../README.md).
The detailed [functional, technical, and software specifications](../../docs/specifications.md)
describe the behavior, architecture, and maintenance requirements behind this
API.

## Reference map

- [Installation](#installation)
- [Functional, technical, and software specifications](../../docs/specifications.md)
- [Usage](#usage)
- [Interaction modes](#interaction-modes)
- [Public properties](#public-properties)
- [React wrapper](#react-wrapper)
- [Slots](#slots)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Track names and controlled editing](#track-names-and-controlled-editing)
- [Clip and track editing](#clip-and-track-editing)
- [Events](#events)
- [CSS customization](#css-customization)
- [Methods](#methods)
- [Accessibility](#accessibility)
- [License](#license)

## Internal architecture

The public element remains the single integration boundary. Its implementation
is split by responsibility:

- `LGS1920TimelineRendering.js` builds the visual structure and clip elements.
- `LGS1920TimelineEditing.js` coordinates move, resize, snapping, and collision
  policies.
- `LGS1920TimelineClipData.js` contains serializable clip operations and the
  optimized layout checks used by editing.
- `LGS1920TimelineState.js` compares controlled row snapshots.
- `LGS1920TimelineDomCache.js` owns indexes for dynamic, clip, and scrollbar
  elements.
- `LGS1920TimelineInteraction.js` and `LGS1920TimelineClipScroll.js` handle
  input and edge scrolling.

These modules are internal implementation details. The custom element name,
public properties, clip units, and `lgs1920-timeline-*` events remain unchanged.

## Installation

Import the custom element once in the application entry point:

```js
import '@lgs1920/timeline'
```

Import the React wrapper when using React:

```js
import {LGS1920TimelineReact} from '@lgs1920/timeline/react'
```

## Usage

The component has a compact controlled model:

- `timeline` describes the timeline surface.
- `tracks` describes the tracks and their clips.
- `currentTimeMillis` controls the playhead.
- `playing` controls the playback state.
- `looping` controls whether the host playback clock repeats the selected range.
- `timeline.fps`, `timeline.frameCount`, and `timeline.currentFrameIndex`
  describe the canonical frame clock used by frame navigation.
- `clipOptions` supplies entries for the clip menu. Leave it null to expose the
  generic `Clip` option; set it to an empty array to show an empty menu.

During its initial mount, the component covers the timeline before its first
layout with an opaque themed overlay and a Web Awesome paintbrush using the
`wag` animation. The `overlay-text` slot customizes its label and falls back to
`Building...`. Set `timeline.showBuildingOverlay` to `false` to disable the
overlay. When enabled, it is removed after the layout settles and is never
shown again for updates or interactions.

## Interaction modes

Choose the interaction contract with `options.mode`. The accepted values are
`passive`, `review`, `edit`, and `readonly`. The `readonly` HTML attribute and
property remain available when a host needs to toggle that mode directly.

| Mode | Configuration | Available behavior |
| --- | --- | --- |
| Passive projection | `mode: 'passive'` | Renders the controlled ruler, playhead, tracks, and clips without transport, scrubbing, selection, menus, editing, or drag targets. |
| Interactive review | `mode: 'review'` | Keeps playback, surface scrubbing, clip selection, and keyboard navigation. Disables clip and track editing, range-handle editing, insertion, reordering, add-track, and context menus. |
| Editable timeline | `mode: 'edit'` | Enables playback, navigation, selection, track and clip editing, insertion, reordering, and the track context menu according to each row and clip policy. |
| Readonly playback | `mode: 'readonly'` or `readonly` | Keeps standard transport controls and the draggable playhead grip. Range handles are fixed; ruler and surface scrubbing, range editing, view tools, selection, menus, editing, and drag targets are disabled. |

Use the `readonly` attribute for a playback-only projection:

```html
<lgs1920-timeline id="timeline" readonly></lgs1920-timeline>
```

The loop button is shown with the standard playback transport by default. The
host owns the playback clock and should apply the requested state from the
`loop-change` event. Set `playback.loop` to `'hidden'` to hide the loop button:

```js
timeline.addEventListener('lgs1920-timeline-loop-change', event => {
    timeline.looping = event.detail.looping
    player.loop = event.detail.looping
})

timeline.options = {
    ...timeline.options,
    playback: {...timeline.options.playback, loop: 'hidden'},
}
```

Readonly mode keeps the standard playback controls, the fixed start/end range
handles, and the draggable playhead grip. It removes ruler and surface
scrubbing, range editing, view tools, clip editing, clip menus, drag targets,
and clip selection. The host continues to control `currentTimeMillis` and
`playing`.

```html
<lgs1920-timeline id="timeline" aria-label="Video timeline"></lgs1920-timeline>
```

```js
const timeline = document.getElementById('timeline')

timeline.options = {
    mode: 'edit',
    durationMillis: 60_000,
    fps: 30,
    frameCount: 1_801,
    frameIntervalMillis: 1000 / 30,
    currentFrameIndex: 105,
    visible: true,
    zoomPercent: 0,
    legendMinWidth: 50,
    legendWidth: 150,
    legendMaxWidth: 250,
    range: {startMillis: 0, endMillis: 60_000},
    playback: {loop: 'toggle', timeSlider: 'visible'},
    view: {visible: true, zoomSlider: true, buildingOverlay: true},
    editing: {
        clipMenu: true,
        collisionPolicy: 'prevent',
        resizeCollisionPolicy: 'prevent',
        durationPolicy: 'extend',
    },
}

timeline.tracks = [
    {
        id: 'camera#main',
        label: 'Main camera',
        icon: 'video',
        canHide: true,
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

timeline.currentTimeMillis = 3_500
timeline.playing = false
timeline.clipOptions = [
    {group: 'media', key: 'video', label: 'Video clip', icon: 'film'},
    {group: 'media', key: 'audio', label: 'Audio clip', icon: 'music'},
]
```

Clips use seconds for their `start` and `end` positions. The playhead uses
milliseconds through `currentTimeMillis`, matching the editor and playback
clock integration.

## Public properties

### `options`

The grouped configuration is the primary API. `tracks` and playback state stay
separate controlled properties so applications can update them independently.

| Group | Properties | Description |
| --- | --- | --- |
| Root | `durationMillis`, `fps`, `frameCount`, `zoomPercent`, editing thresholds | Timeline geometry and frame settings. |
| `mode` | `'passive' \| 'review' \| 'edit' \| 'readonly'` | Selects the interaction contract. |
| `playback` | `loop: 'toggle' \| 'hidden'`, `timeSlider: 'visible' \| 'hidden'` | Controls playback toolbar features. |
| `view` | `visible`, `zoomSlider`, `zoomControls`, `buildingOverlay`, `initialRangeStartVisible` | Controls visible timeline tools and the initial overlay. |
| `range` | `startMillis`, `endMillis` | Sets the active playback range. |
| `layout.legend` | `minWidth`, `width`, `maxWidth` | Sets the track legend width bounds. |
| `editing` | `clipMenu`, `collisionPolicy`, `resizeCollisionPolicy`, `durationPolicy` | Controls editing features and collision behavior. |

The `options` getter returns the same grouped shape. The older flat
`timeline` property remains available as a migration alias, but new code should
use `options`.

### `timeline` (migration alias)

| Property | Type | Description |
| --- | --- | --- |
| `durationMillis` | `number` | Timeline duration in milliseconds. |
| `fps` | `number` | Canonical frame rate used by frame navigation. Defaults to `30`. |
| `frameCount` | `number` | Canonical frame count. Used to clamp previous/next frame requests. |
| `frameIntervalMillis` | `number` | Canonical interval between frames. Defaults to `1000 / fps`. |
| `currentFrameIndex` | `number` | Currently published absolute frame index. |
| `rangeStartMillis` | `number` | Video range start in milliseconds. Defaults to `0`. |
| `rangeEndMillis` | `number` | Video range end in milliseconds. Defaults to `durationMillis`. |
| `initialRangeStartVisible` | `boolean` | Keeps the start handle visible on the initial mount and places it at 5% from the left when there is room. Defaults to `true`. |
| `visible` | `boolean` | Controls timeline visibility. Defaults to `true`. |
| `zoomPercent` | `number` | Initial ruler zoom up to `500`; the minimum is calculated from the available surface width, full timeline duration, and right safety margin. |
| `legendMinWidth` | `number` | Minimum track legend width in pixels. Defaults to `50`. |
| `legendWidth` | `number` | Initial track legend width in pixels. Defaults to `150`. |
| `legendMaxWidth` | `number` | Maximum track legend width in pixels. Defaults to `250`. |
| `editable` | `boolean` | Enables all timeline editing actions: track dragging, title editing, clip insertion and movement, and track removal. When `false`, those actions are unavailable. Defaults to `true`. |
| `interactive` | `boolean` | Enables playback, scrubbing, editing, menus, and emitted interaction events. Defaults to `true`. |
| `readonly` attribute | `boolean` | Keeps the standard playback controls, fixed start/end range handles, and draggable playhead grip. Disables ruler/surface scrubbing, range editing, view tools, clip editing, menus, drag targets, and clip selection. |
| `looping` property | `boolean` | Controlled loop playback state reflected by the loop button. The host must apply this state to its playback clock. Defaults to `false`. |
| `noLoopMode` property / `noloopmode` attribute | `boolean` | Hides the loop button. Defaults to `false`. |
| `showBuildingOverlay` | `boolean` | Shows the construction overlay during the initial mount. Defaults to `true`. |
| `noTimeSlider` | `boolean` | Hides the branded time slider in the playback row. Defaults to `false`. `showTimeSlider: false` remains supported as a compatibility setting. |
| `showTimeSlider` | `boolean` | Compatibility setting for the built-in time slider. `false` hides it; when omitted, the slider is shown unless `noTimeSlider` is `true`. |
| `showZoomSlider` | `boolean` | Displays the branded horizontal zoom slider in the timeline footer. Defaults to `false`. |
| `noZoomControls` property / `nozoomcontrols` attribute | `boolean` | Hides the built-in horizontal and vertical zoom controls, including the optional zoom slider. Defaults to `false`. |
| `collisionPolicy` | `'allow' \| 'prevent' \| 'ripple'` | Default clip collision policy for tracks. Defaults to `prevent`. |
| `resizeCollisionPolicy` | `'allow' \| 'prevent' \| 'ripple'` | Default collision policy for clip resizes. Defaults to `prevent`. |
| `snapThresholdPixels` | `number` | Distance from a ruler or clip edge at which snapping starts. Defaults to `8`. |
| `snapReleaseThresholdPixels` | `number` | Distance at which an active snap is released. Defaults to the start threshold plus four pixels. |
| `resizeExtendsDuration` | `boolean` | Allows an end resize to increase the timeline duration when it reaches the current end. Defaults to `true`. Set to `false` to keep the duration fixed for end resizes. |
| `durationPolicy` | `'fixed' \| 'extend'` | Keeps the duration fixed or extends it when an edit exceeds the end. Defaults to `extend`. |
| `keyboardZoomActive` | `boolean` | Enables arrow-key zoom when the containing host is selected. Defaults to `false`. |
| `hostInteraction` | `'selectable'` | Allows the embedding host to receive the timeline's selection and drag input. Omit it to keep input local to the component. |
| `hostNoDragClass` | `string` | Optional class supplied by the embedding host and applied to clips and editable track rows so the host can exclude them from its own drag handling. |
| `swatches` | `Array<{color, label, palette}>` | Color choices for the clip color menu. Defaults to the ten Web Awesome neutral palette colors. Pass an empty array to hide the color action. |
| `showClipMenu` | `boolean` | Displays the optional clip creation action. Defaults to `false`. |
| `clipActions` | `Array<{key, label, icon?, variant?, disabled?}>` | Adds application-defined actions to every editable clip context menu. The action emits the `clip-action` event and is configured globally on the timeline. `clipContextMenuActions` is accepted as a compatibility alias. |
| `defaultTrackId` | `string` | Track used when a clip-menu option does not specify a track. |
| `minClipDuration` | `number` | Default minimum clip duration in seconds. Defaults to one frame at `fps`. |
| `defaultClipDuration` | `number` | Default duration for a clip-menu insertion in seconds. Defaults to `1`. |
| `keyboardStepSeconds` | `number` | Keyboard resize step in seconds. Defaults to `0.1`. |
| `addTrackLabel` | `string` | Track creation button label. Defaults to `Add track`. |
| `addTrackIcon` | `string` | Track creation button icon. Defaults to `plus`. |

### `tracks`

`tracks` is an array of track definitions:

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable track identifier. `#` is used as the slot identifier separator. |
| `label` | `string` | Track name shown in the legend. |
| `colorClasses` | `string[]` | Web Awesome color classes. |
| `visible` | `boolean` | Track visibility state. |
| `canHide` | `boolean` | Enables the track visibility action. |
| `editable` | `boolean` | Enables drag, title editing, clip insertion/movement/resizing, and removal for this track. Defaults to `true`. |
| `autoNumbered` | `boolean` | Internal marker preserved on tracks created by the generic add action so numbering can restart after all generated tracks are renamed or removed. |
| `droppable` | `boolean` | Allows clips to be moved or inserted on the track. Defaults to `true`. |
| `accepts` | `string[]` | Clip kinds accepted by the track. An empty value accepts every kind. |
| `collisionPolicy` | `'allow' \| 'prevent' \| 'ripple'` | Collision behavior for clip edits on this track. |
| `resizeCollisionPolicy` | `'allow' \| 'prevent' \| 'ripple'` | Collision behavior for clip resizes on this track. Defaults to `prevent`. |
| `minClipDuration` | `number` | Minimum duration applied to clips on this track, in seconds. |
| `clips` | `array` | Clips displayed on the track. |

The track removal action is displayed only for editable tracks that contain no
clips. A track with clips must be emptied before it can be removed.

The track context menu is available only when `interactive` and the timeline's
`editable` option are enabled, the component is not `readonly`, and the track
itself is editable. It exposes `Edit` when the track is visible, `Hide` or
`Show` when `canHide` is enabled, and `Remove` when the track has no clips. A
hidden track exposes `Show`; `Edit` is available again after the track is
shown. The track list does not display persistent visibility or remove icons.

Each clip supports:

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable clip identifier. `#` is used as the slot identifier separator. |
| `start` | `number` | Clip start position in seconds. |
| `end` | `number` | Clip end position in seconds. |
| `label` | `string` | Default clip label. |
| `name` | `string` | Optional display name when `label` is not supplied. |
| `kind` | `string` | Application-defined clip type, such as `video`, `audio`, or `marker`. |
| `icon` | `string` | Font Awesome icon name. |
| `colorClasses` | `string[]` | Web Awesome color classes. |
| `visible` | `boolean` | Clip visibility state. |
| `enabled` | `boolean` | Whether the clip participates in timeline playback. Defaults to `true`. |
| `editable` | `boolean` | Enables movement and resizing for this clip. Defaults to `true`. |
| `resizable` | `boolean` | Enables the start and end handles. Defaults to `true`. |
| `minDuration` | `number` | Minimum clip duration in seconds. |
| `metadata` | `object` | Optional application metadata. |

### `currentTimeMillis`

The controlled playhead position in milliseconds.

### `playing`

The controlled playback state. The component emits `play` and `pause`; the
host updates this property after applying the requested state.

The component does not advance the application clock. Connect the events to the
host media player and write its clock back to `currentTimeMillis`:

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

### `looping`

The controlled loop state. Clicking the built-in loop button emits one
`loop-change` event with a `looping` boolean. The component does not restart
the host clock by itself.

While `playing` is `true`, the component keeps the playhead visible without
letting it disappear at the edge of a long timeline. During forward playback,
the playhead can move normally until it reaches 75% of the visible surface. If
the selected range end is still outside the viewport, the timeline scrolls
under the stationary playhead. Once the range end is visible, the playhead
moves again. Reverse playback mirrors this behavior at 25% of the viewport
while the selected range start remains outside the viewport.

When enabled, the built-in time slider emits a `seek` event with
`source: 'timeline-slider'`. The built-in zoom slider emits a `zoom-change`
event with `source: 'timeline-zoom-slider'` and a `zoomPercent` value.
The built-in time slider is the fallback content of the `time-slider` slot in
the left side of the playback row. It uses the Studio-compatible
`label-at-start` and `width-auto` layout attributes so its label and track stay
aligned in compact timelines.

The icon transport controls are, in order, go to start, previous frame,
play/pause, stop, next frame, and go to end. The start and end buttons update the
component playhead to the selected range boundaries after the transport request is
accepted; the host still owns the external playback clock. They use the Web Awesome
`brand` variant with `plain` appearance. Previous and
next frame details contain `frameIndex`, `frameCount`,
`frameIntervalMillis`, `timeMillis`, `progress`, `settled`, and a `source`
value of `step-backward` or `step-forward`. The start and end controls use
`restart` or `seek` with `source` set to `go-to-start` or `go-to-end`.
The transport is an accessible toolbar of independent buttons, not a Web
Awesome button group.

The header provides two icon-only view buttons with Web Awesome tooltips while
the timeline is interactive:

- `Fit entire timeline horizontally` toggles between the normal horizontal
  zoom and the lowest zoom that displays the complete duration.
- `Show maximum tracks` toggles with `Maximize track size`, using the minimum
  row height to show as many tracks as possible or the maximum row height.

These commands only change the transient timeline view and do not modify the
controlled projection.

The header places the view tools on the left, an application-owned menu in the
center, and the transport controls on the right. The application-owned menu
must be provided through the `custom-menu` slot. The Web Component only
exposes the controlled `fps` value used for frame navigation; it does not
modify the application's frame rate or emit an FPS-change event.

### `clipOptions`

Options displayed by the clip insertion menu. Each option can contain
`group`, `key`, `label`, `icon`, `kind`, `trackId`, `start`, `end`, `duration`,
and a `clip` object containing application fields to copy to the inserted clip.
When `clipOptions` is null, the menu exposes one generic `Clip` option. Every
option can be dragged from the menu and dropped on a compatible editable track;
the pointer represents the clip center instead of placing its beginning edge at
the pointer. The
component always assigns an unused clip identifier when an insertion option
reuses an existing identifier.

## Slots

Slots customize labels, icons, controls, track actions, and clip content. A
global slot is used for every matching element. A
targeted slot takes the form `{slot}-{id}` and overrides the global slot.
The built-in header and transport controls use compact `s` plain buttons so
slotted actions can sit beside them without an extra frame.

### Layout slots

| Slot | Description |
| --- | --- |
| `additional-content` | Application content displayed in an expandable `wa-drawer` above the header. |
| `additional-content-label` | Accessible label associated with the additional-content drawer. |
| `header` | Header content displayed in the left header area. |
| `custom-menu` | Application-owned menu displayed in the center of the header. |
| `header-actions` | Application actions such as settings, help, or host controls. |
| `timeline-actions` | Application actions such as recording or exporting video. |
| `transport` | Application transport content placed in the right playback control group. The standard transport controls and the built-in loop button are displayed in this area; the loop button is on the right unless `noloopmode` is enabled. |
| `time-slider` | Replacement content for the built-in temporal slider in the left playback area. The fallback is hidden by `noTimeSlider` or `showTimeSlider: false`. |
| `playback-start` | Content before the current time. |
| `playback-current` | Current-time label. |
| `playback-total` | Total-time label. |
| `playback-end` | Content after the total time. |
| `timeline-toolbar` | Toolbar content beside the clip menu. |
| `legend-ruler` | Replacement content for the title-column ruler area. The default fallback contains `timeline-toolbar`, the direct track button, and the optional clip-menu button. |
| `timeline-ruler` | Additional content over the time ruler. |
| `timeline-controls` | Application controls displayed in the timeline footer alongside the built-in zoom controls. |
| `overlay-text` | Initial construction-overlay label. Falls back to `Building...`. |
| `footer` | Application content displayed in the timeline footer. The footer also contains the built-in view tools and optional zoom slider. |
| `empty-state` | Content displayed when the clip menu has no options. |

```html
<lgs1920-timeline>
    <span slot="additional-content-label">Timeline settings</span>
    <div slot="additional-content">
        <wa-badge variant="success">Ready</wa-badge>
    </div>
    <h2 slot="header">Sequence</h2>
    <span slot="overlay-text">Preparing timeline...</span>
    <wa-button slot="custom-menu" variant="brand" appearance="plain" data-additional-content-toggle>Video settings</wa-button>
    <span slot="transport">Playback</span>
    <wa-button slot="header-actions" appearance="plain">Settings</wa-button>
    <wa-button slot="timeline-actions" variant="brand">Record video</wa-button>
    <wa-button slot="timeline-toolbar" appearance="plain">Markers</wa-button>
</lgs1920-timeline>
```

An application can replace the built-in clip menu with a draggable control.
The source can live outside the timeline, for example in a palette or toolbar
above it. If it belongs inside the component header, place it in the
`timeline-toolbar` slot. In both cases, the drag payload must use the exported
`CLIP_OPTION_DRAG_MIME` constant and contain a JSON clip option. The component
uses the pointer as the generated clip's center, then uses the same snap and
collision engine as an internal clip drag. During the native drag, the
placement is previewed only while the pointer is over a track; the host can
show a floating drag representation outside the drop zone. An occupied or
otherwise insufficient track is shown in red. The option is accepted on every
compatible editable track:

```html
<wa-button id="clip-source" draggable="true">Add a clip by dragging it</wa-button>
<lgs1920-timeline id="timeline"></lgs1920-timeline>
```

```js
import {CLIP_OPTION_DRAG_MIME} from '@lgs1920/timeline'

const source = document.querySelector('#clip-source')
source.addEventListener('dragstart', event => {
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
    event.dataTransfer.setData(CLIP_OPTION_DRAG_MIME, JSON.stringify(option))
})
```

If no compatible track accepts the option, the `add-clip` event contains
`detail.clip === null`. The host can append a new empty track to its controlled
`tracks` model and let the user drop the source again.

The additional-content drawer has no built-in close button. Add an application
owned control to `custom-menu` with the `data-additional-content-toggle`
attribute to open and close it from the timeline header. The timeline keeps
that control's `aria-expanded` and `aria-controls` attributes synchronized.

The custom element is its own layout container. When placed in a Web Awesome
drawer or another host panel, size the custom element from the outside:

```css
wa-drawer lgs1920-timeline,
.timeline-panel lgs1920-timeline {
    width: 100%;
    height: 100%;
}
```

### Playback and clip-menu slots

| Slot | Description |
| --- | --- |
| `play-icon` / `pause-icon` | Play or pause icon. |
| `start-icon` | Go-to-start icon. |
| `stop-icon` | Stop icon. |
| `previous-frame-icon` / `next-frame-icon` | Previous or next frame icon. |
| `end-icon` | Go-to-end icon. |
| `add-clip-icon` | Clip-menu icon. |
| `add-clip-label` | Clip-menu label. |
| `add-track-icon` | Track-menu icon. |
| `add-track-label` | Track-menu label. |

```html
<lgs1920-timeline>
    <wa-icon slot="play-icon" name="circle-play" variant="solid" label=""></wa-icon>
    <wa-icon slot="pause-icon" name="circle-pause" variant="solid" label=""></wa-icon>
    <wa-icon slot="start-icon" name="backward-step" variant="solid" label=""></wa-icon>
    <wa-icon slot="stop-icon" name="stop" variant="solid" label=""></wa-icon>
    <wa-icon slot="end-icon" name="forward-step" variant="solid" label=""></wa-icon>
</lgs1920-timeline>
```

### Track slots

Each track has a legend area. Track reordering starts from the legend area
itself. In the normal interactive editable mode, right-clicking a track opens
its context menu; the built-in actions and track-specific custom content are
rendered there.

| Global slot | Targeted slot | Description |
| --- | --- | --- |
| `track-label` or `name` | `track-label-{trackId}` or `name-{trackId}` | Track name content. |
| `visibility` | `visibility-{trackId}` | Visibility action content in the track context menu. |
| `remove` | `remove-{trackId}` | Remove action content in the track context menu. |
| `actions` | `actions-{trackId}` | Track-specific action content appended to the track context menu. |

```html
<lgs1920-timeline>
    <span slot="name-camera#main">Main camera</span>
    <wa-button slot="actions-camera#main" appearance="plain" size="s" aria-label="Track settings">
        <wa-icon name="gear" variant="solid" label=""></wa-icon>
    </wa-button>
</lgs1920-timeline>
```

### Clip slots

| Global slot | Targeted slot | Description |
| --- | --- | --- |
| `clip-icon` | `clip-icon-{clipId}` | Clip icon. |
| `clip-label` | `clip-label-{clipId}` | Clip label. |
| `clip-content` | `clip-content-{clipId}` | Complete clip content. |
| `clip-start-handle` | `clip-start-handle-{clipId}` | Start resize handle content. |
| `clip-end-handle` | `clip-end-handle-{clipId}` | End resize handle content. |

Clip content can be arbitrary HTML or Web Awesome components:

```html
<lgs1920-timeline>
    <template slot="clip-content">
        <span class="clip-card">
            <wa-icon name="film" variant="solid" label=""></wa-icon>
            <strong>Opening clip</strong>
        </span>
    </template>
</lgs1920-timeline>
```

For the clip id `intro#001`, the targeted content slot is
`clip-content-intro#001`. The `#` separator is preserved in slot names.

The video range handles can be customized with the global
`timeline-start-handle` and `timeline-end-handle` slots.

The start and end handles can be dragged along the ruler when the timeline is
interactive and editable and the component is not `readonly`. Double-clicking
the start handle moves it to `0`; double-clicking the end handle moves it to
`durationMillis`. The handles never cross and the playhead keeps its position
while it remains between the handles and moves to the new boundary only when it
would otherwise fall outside the selected range.

The playhead grip can also be dragged within the selected range. When the
playhead has keyboard focus, `ArrowLeft` and `ArrowRight` move it by
`keyboardStepSeconds` (or ten times that amount with `Shift`). `Alt+ArrowRight`
moves it to the range minimum and `Alt+ArrowLeft` moves it to the range
maximum.

When a range handle has keyboard focus, `ArrowLeft` and `ArrowRight` move the
selected boundary by `keyboardStepSeconds`; `Shift` multiplies the step by ten.
When a clip resize handle has focus, the same keys resize the corresponding
clip edge with the same step rules. The split-panel divider is a native
Web Awesome separator: its horizontal arrow keys resize the track legend,
`Shift` changes the step, `Home` and `End` select the minimum and maximum, and
`Enter` collapses or restores the panel.

When the time surface has focus, plain wheel scrolling remains native. `Shift`
or `Alt` plus the wheel changes the track row height by 4 pixels, from 24 to 64 pixels.
`Meta` (Command on macOS, Super/Windows on Linux and Windows) plus the wheel
changes the ruler zoom by 20 percent. Unmodified arrow keys change the row
height vertically and the ruler zoom horizontally. `Ctrl` plus the wheel is
left untouched so the browser can keep its own zoom behavior. The containing
host can also enable these arrow-key shortcuts while selected with
`keyboardZoomActive`. The ruler always renders secondary ticks with at most five
subdivisions per major unit and targets at most twelve major intervals in the
visible surface. The major unit follows a readable progression from 250 ms to
2 h until each major interval has enough space. The minimum horizontal zoom
adapts to the available surface width so the complete timeline can fit without
horizontal scrolling, with a small right safety margin. The Playback integration
places its horizontal zoom control in a dedicated control band at the bottom of
the track viewport, inside the time surface and outside the time ruler and global
timeline footer, with the timeline's vertical and horizontal zoom buttons at the
left, followed by the horizontal icon and an unlabeled branded slider.
Pointer adjustment uses a one-percent step while keyboard and wheel zoom retain
their twenty-percent step.
The track legend reserves an equivalent bottom band so its rows stay aligned
with the time surface.

Ruler labels use `SS.XX` below one minute, `MmSS` from one minute through 59
minutes, and `HhMM` from one hour onward. When the major interval is below one
minute, hour labels include seconds as `HhMM:SS` so adjacent labels remain
distinct.

## Keyboard shortcuts

Keyboard handling is scoped to the focused timeline part. The component ignores
these shortcuts while an input, textarea, select, or editable content control
has focus.

| Focus or context | Shortcut | Action |
| --- | --- | --- |
| Timeline surface | <kbd>Space</kbd> | Toggle local playback. |
| Timeline surface | <kbd>Home</kbd> / <kbd>End</kbd> | Move the playhead to the selected range start or end. |
| Timeline surface | <kbd>Shift</kbd>+<kbd>ArrowLeft</kbd> / <kbd>Shift</kbd>+<kbd>ArrowRight</kbd> | Move the playhead to the selected range boundary. |
| Timeline surface | <kbd>Shift</kbd>+<kbd>ArrowUp</kbd> / <kbd>Shift</kbd>+<kbd>ArrowDown</kbd> | Scroll tracks to the top or bottom. |
| Timeline surface | <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> | Increase or decrease row height. |
| Timeline surface | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Zoom the ruler horizontally when no clip is selected. |
| Scrollbar rail | <kbd>PageUp</kbd> / <kbd>PageDown</kbd> and <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> | Scroll one viewport in the focused direction. |
| Playhead grip | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Move by `keyboardStepSeconds`. |
| Playhead grip | <kbd>Shift</kbd>+<kbd>ArrowLeft</kbd> / <kbd>Shift</kbd>+<kbd>ArrowRight</kbd> | Move by ten keyboard steps. |
| Playhead grip | <kbd>Alt</kbd>+<kbd>ArrowRight</kbd> / <kbd>Alt</kbd>+<kbd>ArrowLeft</kbd> | Move to the range minimum or maximum. |
| Range handle | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Move the focused boundary by one keyboard step. |
| Range handle | <kbd>Shift</kbd>+<kbd>ArrowLeft</kbd> / <kbd>Shift</kbd>+<kbd>ArrowRight</kbd> | Move the focused boundary by ten keyboard steps. |
| Editable clip | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Move the clip by one rendered pixel. |
| Editable clip | <kbd>Alt</kbd>+<kbd>ArrowLeft</kbd> / <kbd>Alt</kbd>+<kbd>ArrowRight</kbd> | Move the clip by ten rendered pixels. |
| Editable clip | <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete the focused clip. |
| Editable clip | <kbd>Mod</kbd>+<kbd>C</kbd> | Start a copy placement ghost; click to place it. |
| Editable clip | <kbd>Mod</kbd>+<kbd>D</kbd> | Duplicate the clip immediately after itself. |
| Editable clip | <kbd>M</kbd> | Mask or reveal the clip. |
| Editable clip | <kbd>V</kbd> | Enable or disable the clip. |
| Non-movable clip | <kbd>Enter</kbd> / <kbd>Space</kbd> | Select the clip. |
| Clip resize handle | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Resize the focused edge by one keyboard step. |
| Clip resize handle | <kbd>Shift</kbd>+<kbd>ArrowLeft</kbd> / <kbd>Shift</kbd>+<kbd>ArrowRight</kbd> | Resize the focused edge by ten keyboard steps. |
| Any active edit | <kbd>Escape</kbd> | Cancel a copy, drag, resize, or context menu; clear clip selection. |
| Legend divider | <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Resize the track legend. |
| Legend divider | <kbd>Shift</kbd> + <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>, <kbd>Enter</kbd> | Change the resize step, select the minimum or maximum, or collapse and restore the legend. |
| Track label editor | <kbd>Enter</kbd> / <kbd>Escape</kbd> | Commit or cancel the label edit. |

`Mod` means `Ctrl` on Windows and Linux, and `Command` on macOS. On the time
surface, `Shift` or `Alt` plus the wheel changes row height by 4 pixels,
`Meta` plus the wheel changes horizontal ruler zoom by 20 percent, and
`Ctrl` plus the wheel remains available to the browser. Set
`keyboardZoomActive` to `true` when the host should accept the surface arrow
shortcuts while the custom element itself is selected.

## Track names and controlled editing

In editable mode (`interactive !== false`, no `readonly` attribute, and both
the timeline and track `editable` flags enabled), double-click a track name to
open the inline Web Awesome input. Native text selection remains available in
the field. Press `Enter` or leave the input to commit the name; press `Escape`
to cancel.

Double-clicking a clip has no default editing behavior. Web Component users can
listen for `lgs1920-timeline-dblclick` to trigger an application action such as
opening clip editing. Use `timeline.on('dblclick', {before, on, after})` when
the action needs validation or completion handling.

The component emits the new name and a serializable public snapshot. The host
stores the updated track definition and passes the new `tracks` array back.

```js
timeline.addEventListener('lgs1920-timeline-track-label-change', event => {
    const {trackId, label} = event.detail
    tracks = tracks.map(track => track.id === trackId ? {...track, label} : track)
    timeline.tracks = tracks
})
```

The same controlled flow applies to track visibility, clip visibility, and
track reordering. Clips belonging to a hidden track remain represented in the
timeline with their original palette muted through grayscale and opacity. A
hidden track keeps its title in a disabled visual state and cannot open title
editing, while its clips remain editable when their `editable` flags allow it.
Set `editable: false` on the track or clip to lock editing. A hidden track also
displays one continuous flat grey tint behind the clips. Read-only tracks use
the corresponding flat branded red tint.

## Clip and track editing

The timeline supports controlled clip editing. The component renders a start
and end handle on every resizable clip, moves clips horizontally when their
body is dragged, and accepts a clip on another compatible track while it is
being dragged. A clip is selected by clicking it or starting its drag, and the
selection stays inside the timeline. Clips on noneditable tracks or clips can
remain selectable, but their editing actions stay disabled. HTML `readonly`
mode disables clip selection. Clicking the selected clip without moving
deselects it, while dragging keeps it selected. The selected clip receives a
normal 2px dashed border in the clip text color and keyboard focus. Clip options from the insertion menu can also be
dragged onto a track. The target track is highlighted during the gesture. The
context menu does not expose `Extend max` when `resizable` is `false`.

Clip movement preserves its duration and shows a diamond centered on each
endpoint of the ruler's lower border while the clip is being moved; each marker
protrudes halfway into the track area. Resizing the start handle changes
`start` while keeping `end` stable. Resizing the end handle changes `end` while
keeping `start` stable. Both handles respect the timeline bounds and the
configured minimum duration.

During a clip move, the source position remains visible as a faint ghost and
the proposed placement follows the pointer. A valid placement uses a
translucent Web Awesome success color; a rejected placement uses the
corresponding danger color.

While a clip edge is being resized, a blue diamond follows the edge's current
time position centered on the ruler's lower border. It is transient and
disappears when the gesture ends or is cancelled.

During pointer movement and resizing, the edited clip edge snaps to the nearest
major ruler unit when it enters the configured magnetic threshold. Nearby clip
boundaries on any track and the playhead take precedence over ruler ticks. Holding
`Shift` while moving or resizing a clip uses the currently rendered secondary
ruler units instead. A clip move uses whichever of its two edges is closest, so
the duration remains unchanged when the clip stays on its current track or is
moved to another compatible track. The moving ghost follows the pointer freely
vertically while its horizontal position follows the magnetic alignment. A
cross-track move also resolves a target edge when one pointer step crosses the
magnetic zone, so a skipped intermediate event does not turn a touching clip
into a rejected overlap. A
vertical alignment guide identifies a clip edge or playhead target during the
gesture and remains visible for two seconds after release. Ruler-unit snapping
remains active without rendering a guide line. Set `snap: false` on the timeline
configuration to disable this behavior. Hold `Alt` during the gesture to bypass
all magnets temporarily. Once a snap is acquired, it remains magnetized until
the clip passes `snapReleaseThresholdPixels`, which prevents jitter at the
boundary. `Escape` cancels an active drag or resize and restores
the original clips, duration, and playback range.

An editable clip can be focused and removed with `Delete` or `Backspace`. A clip
drag starts only after the pointer moves beyond the click tolerance, so holding
a clip without moving it does not start a drag. On touch devices, a stationary
long press can still open the clip context menu. Press
`Mod+C` to create an accentuated copy-placement ghost under the source clip,
shifted half a clip height down and to the left. Move the pointer to the
desired track and time, then press the primary pointer button to commit it;
`Escape`, a click outside the timeline, or a secondary-button/context-menu
gesture cancels the placement. `M` masks the focused
clip. `Mod+D` remains available as an immediate duplicate alias, while `V` toggles
the `enabled` state. Clicking a neutral area, track label, or empty track
deselects the clip; `Escape` also clears the selection. The context
menu provides Copy, Delete, Mask, Extend max, and any
actions configured through `timeline.clipActions`. A disabled clip remains
visible in the editor so it can be identified and re-enabled. `Space` toggles
local playback when the time surface has focus, while `Home` and `End` move the
local playhead to the selected range boundaries. These keyboard actions update
the component projection and emit their normal events; an embedding
application decides whether to connect those events to playback or persistence.

Custom context actions use the following shape:

```js
timeline.options = {
    ...timeline.options,
    clipActions: [
        {key: 'split', label: 'Split', icon: 'scissors'},
        {key: 'open-editor', label: 'Open editor', icon: 'pen-to-square'},
    ],
}

timeline.addEventListener('lgs1920-timeline-clip-action', event => {
    if (event.detail.key === 'split') openClipEditor(event.detail.clip)
})
```

Use `timeline.on('remove-clip', {before, on, after})` when removal needs
validation or completion handling. Calling `event.preventDefault()` in the
`before` callback keeps the clip in place. The `on` callback receives the
removed clip and updated track snapshot after the action is accepted.

Track collision behavior for movement and insertion is selected with
`collisionPolicy`; resize behavior is selected independently with
`resizeCollisionPolicy`. With the default `prevent` policy, clips never
overlap. A moved or inserted clip must fit at its complete duration. A drop into a
smaller gap is rejected without trimming the clip or replacing existing content. A resize
stops at the neighboring clip and leaves that clip in place.

| Policy | Behavior |
| --- | --- |
| `allow` | Legacy alias for `prevent`; committed edits still reject overlaps. |
| `prevent` | Clips cannot overlap. A moved or inserted clip must fit completely in the available gap; a resize stops at the neighboring clip. |
| `ripple` | The inserted or moved clip stays at the requested time. Overlapping clips and subsequent clips shift right while preserving their durations. Read-only clips block ripples that would move them. |

Resize ripple shifts all clips on the same track on the edited side: a start
resize shifts clips to the left of the edited clip, while an end resize shifts
clips to its right. The clips keep their durations and relative spacing. The
`allow` value remains accepted for backwards compatibility and follows the
same no-overlap rule as `prevent`.

While a clip is dragged over an occupied or otherwise invalid drop zone, it
continues following the pointer and displays the `not-allowed` cursor. The
invalid position is not committed on release. Releasing in a forbidden track,
outside the tracks, or in an occupied interval restores the complete pre-gesture
state, even after an earlier valid preview. The final pointer position determines
the drop, and another pointer cannot end the gesture.

An end resize or a move to the right can increase the total duration when it
reaches the current end; the committed event contains the resulting
`durationMillis` and the complete `tracks` snapshot. Set
`resizeExtendsDuration: false` to reject an end-resize extension.
`durationPolicy: 'extend'` is the default. Explicit `durationPolicy: 'fixed'`
prevents extension for every collision policy and insertion. Previously committed
extensions remain available during later edits and cancellations. A playback range
that covered the entire duration follows an extension; a deliberately shorter
range remains unchanged. Placement checks and vetoed insertions or keyboard
resizes never mutate the playback range.

During the resize preview, the ruler and every track surface grow with the
duration. Horizontal edge scrolling creates temporary workspace beyond the last
clip and continues while the pointer stays near the edge. Vertical edge scrolling
reveals tracks above and below the visible area. Scrolling speed depends on edge
proximity and elapsed frame time, with a bounded step after a delayed frame.
Temporary workspace is removed at the end of the gesture and is not included
in the emitted duration.

Track reordering starts from anywhere in the track name area when both
`editable` flags are enabled. Read-only tracks delimit the
editable area: an editable track cannot be dropped above the highest read-only
track, below the lowest read-only track, or into a gap with no editable slot.
The dragged row remains in place while a synchronized legend-and-timeline
ghost follows the pointer; a branded marker shows the proposed insertion
position and its valid or rejected state.
The committed `reorder` event contains the new `tracks` order and `dropIndex`.
Track drags scroll vertically near the viewport edges and resolve insertion
positions in scrolled content coordinates. Horizontal time scrolling is disabled
for track reordering.

The component emits `drag` for tracks and clips while `editable` is enabled.
Use `timeline.on('drag', {before, on, after})` when the gesture needs lifecycle
hooks. Each detail contains a `context` with the requested public shape:
`{type: 'track', trackId}` for a track and
`{type: 'clip', trackId, clipId}` for a clip. The detail also contains the
triggering event and the current serializable `data` snapshot. The final detail
adds `committed`, which is `false` for a cancelled or rejected clip move or
track reorder.

The component emits `clip-change-start` when an edit begins, `clip-changing`
for live previews, and `clip-change` when the pointer or keyboard edit is
committed. Clip drag events include `oldTimeline`, `newTimeline`,
`dragStart`, `drag`, `resizeEdge`, and the complete `tracks` snapshot. The
host applies the resulting `tracks` value to keep the model controlled. The
final `clip-change` detail includes `committed: false` when the gesture is
cancelled or rejected.

Controlled track updates preserve the local ruler zoom. A new explicit
`zoomPercent` value still changes the zoom, while applying the same controlled
configuration after a clip edit does not reset the user's current view.

When deleting clips from a grouped track leaves only one distinct entry, the
group is dissolved and that entry is displayed as a standalone track again.

## Events

The component exposes one canonical event for each action. DOM events are
composed, bubbling `CustomEvent` instances named with the
`lgs1920-timeline-` prefix. Use `addEventListener` when the main event is
enough:

~~~js
timeline.addEventListener('lgs1920-timeline-seek', event => {
    timeline.currentTimeMillis = event.detail.timeMillis
})
~~~

Use on() when an action needs validation before it runs or work after it
finishes:

~~~js
const unsubscribe = timeline.on('seek',
    event => {
        console.log('accepted seek', event.detail)
    },
    {
        before: event => {
            if (event.detail.timeMillis < 0) event.preventDefault()
        },
        after: event => {
            console.log('seek completed', event.detail)
        },
    },
)

unsubscribe()
~~~

The `before` callback receives a cancelable event. Calling `preventDefault()`
cancels the action, so the main handler and after callback do not run. The main
handler receives the canonical DOM event. The after callback runs after the
accepted action. on() also accepts one descriptor:

~~~js
timeline.on('clip-change', {
    before: event => validateClipEdit(event.detail),
    on: event => tracks = event.detail.tracks,
    after: event => persistTracks(event.detail.tracks),
})
~~~

`addEventListener` receives the main event only. The former `before-*` and `after-*`
DOM event names and React callback props have been removed. Continuous
interactions keep their progress events: clip-change-start, clip-changing,
range-change-start, range-changing, and drag.

| Event suffix | DOM event | Typical detail |
| --- | --- | --- |
| play, pause, stop, restart | lgs1920-timeline-<suffix> | Playback request with source, timeMillis, and event. |
| loop-change | lgs1920-timeline-loop-change | Loop request with looping, source, and event. |
| seek | lgs1920-timeline-seek | Position request with timeMillis, progress, settled, source, and event. |
| zoom-change | lgs1920-timeline-zoom-change | Zoom request with zoomPercent, settled, source, and event. |
| range-change-start, range-changing, range-change | lgs1920-timeline-<suffix> | Range values and the originating event. |
| track-label-change, track-visibility-change | lgs1920-timeline-<suffix> | Track identifiers, changed values, and controlled tracks. |
| add-track, remove-track, reorder | lgs1920-timeline-<suffix> | Track changes, snapshots, and reorder information. |
| add-clip, remove-clip, clip-change | lgs1920-timeline-<suffix> | Clip changes and controlled tracks. |
| clip-change-start, clip-changing | lgs1920-timeline-<suffix> | Live clip edit preview. |
| clip-select, clip-enabled-change, clip-visibility-change, clip-color-change | lgs1920-timeline-<suffix> | Clip selection or changed clip state. |
| clip-action, clip-extend, dblclick, drag | lgs1920-timeline-<suffix> | Application action, extension, host intent, or live drag result. |
| vertical-scroll | lgs1920-timeline-vertical-scroll | Synchronized vertical scroll position. |

For actions that support validation, before and after callbacks use the same
suffix as the main event:

~~~js
timeline.on('remove-clip', {
    before: event => {
        if (!canRemove(event.detail.clip)) event.preventDefault()
    },
    on: event => {
        timeline.tracks = event.detail.tracks
    },
})
~~~

## React wrapper

The React adapter uses the same grouped options and event suffixes:

~~~jsx
<LGS1920TimelineReact
    options={{
        mode: 'edit',
        durationMillis: 60_000,
        playback: {loop: 'toggle', timeSlider: 'visible'},
        view: {zoomSlider: true},
    }}
    tracks={tracks}
    currentTimeMillis={currentTimeMillis}
    events={{
        seek: {
            before: (detail, event) => validateSeek(detail, event),
            on: (detail, event) => setCurrentTimeMillis(detail.timeMillis),
            after: (detail, event) => logSeek(detail, event),
        },
        'clip-change': (detail, event) => {
            onTracksChange(detail.tracks)
        },
    }}
/>
~~~

React callbacks receive `(detail, event)`. A `before` callback can cancel by
calling `event.preventDefault()`. Use `options`, `tracks`, and controlled playback
props directly; the old onPlay, onBeforePlay, and onAfterClipChange prop
mapping has been removed.

## CSS customization

The component exposes `--lgs-timeline-*` custom properties and CSS parts. Each
property can be set on the host and can reference Web Awesome design tokens.

```css
lgs1920-timeline {
    --lgs-timeline-padding: 1rem;
    --lgs-timeline-background: color-mix(in oklab, #102033 92%, transparent);
    --lgs-timeline-surface-color: #132941;
    --lgs-timeline-playhead-color: #ffb000;
    --lgs-timeline-row-height: 24px;
}

lgs1920-timeline::part(clip) {
    letter-spacing: 0.02em;
}
```

The track legend and timeline surface are separated by a Web Awesome split
panel. Its `grip-vertical` divider uses fine lateral borders and switches to
the brand background while focused or actively dragged. The grip icon keeps a
small lateral margin so the resize target remains easy to see.

| Custom property | Purpose |
| --- | --- |
| `--lgs-timeline-background` | Outer timeline background. |
| `--lgs-timeline-text-color` | Normal text color. |
| `--lgs-timeline-quiet-text-color` | Ruler and playback text color. |
| `--lgs-timeline-border-color` | Normal border color. |
| `--lgs-timeline-quiet-border-color` | Grid and track border color. |
| `--lgs-timeline-surface-color` | Legend and clip surface color. |
| `--lgs-timeline-padding` | Outer padding. |
| `--lgs-timeline-radius` | Outer corner radius. |
| `--lgs-timeline-shadow` | Outer shadow. |
| `--lgs-timeline-gap` | Header and top-section gap. |
| `--lgs-timeline-building-overlay-gap` | Space between the initial-overlay icon and text. |
| `--lgs-timeline-header-height` | Header and ruler height. |
| `--lgs-timeline-min-width` | Minimum host and layout width. |
| `--lgs-timeline-min-height` | Minimum host and layout height. |
| `--lgs-timeline-layout-min-height` | Minimum inner layout height. |
| `--lgs-timeline-scrollbar-height` | Horizontal scrollbar allowance. |
| `--lgs-timeline-scrollbar-size` | LGS scrollbar rail thickness. |
| `--lgs-timeline-scrollbar-thumb-min-size` | Minimum LGS scrollbar thumb size. |
| `--lgs-timeline-scrollbar-auto-hide-delay` | Inactivity timeout before rails hide. Defaults to `1s`, matching `LGSScrollbars`. |
| `--lgs-timeline-scrollbar-auto-hide-duration` | Fade duration. Defaults to `200ms`, matching `LGSScrollbars`. |
| `--lgs-timeline-scrollbar-track-color` | LGS scrollbar rail color. |
| `--lgs-timeline-scrollbar-thumb-color` | LGS scrollbar thumb color. |
| `--lgs-timeline-resizer-width` | Web Awesome split-panel divider width. |
| `--lgs-timeline-resizer-hit-area` | Web Awesome split-panel divider hit area. |
| `--lgs-timeline-viewport-margin` | Lateral safety gutter at the edges of the scrollable surface. Defaults to `0.5rem`. |
| `--lgs-timeline-row-height` | Minimum track row height. |
| `--lgs-timeline-scale-width` | Ruler pixels per major unit. |
| `--lgs-timeline-min-visible-duration` | Minimum duration represented by the initial timeline viewport. |
| `--lgs-timeline-scale-offset` | Ruler left offset. |
| `--lgs-timeline-major-tick-height` | Major ruler tick height. |
| `--lgs-timeline-minor-tick-height` | Minor ruler tick height. |
| `--lgs-timeline-handle-cap-height` | Height of the start, end, and playhead caps. |
| `--lgs-timeline-handle-cap-top` | Top offset of the caps relative to the ruler. |
| `--lgs-timeline-handle-cap-width` | Width of the start, end, and playhead caps. |
| `--lgs-timeline-handle-point-size` | Size of the rounded bottom point. |
| `--lgs-timeline-handle-icon-color` | Default grip icon color. |
| `--lgs-timeline-playhead-color` | Playhead color. Defaults to the Web Awesome blue 70 palette token. |
| `--lgs-timeline-playhead-width` | Playhead width. |
| `--lgs-timeline-end-marker-color` | End marker color. |
| `--lgs-timeline-range-handle-width` | Video range handle width. |
| `--lgs-timeline-range-handle-color` | Video range handle color. |
| `--lgs-timeline-range-end-color` | Video range end handle color. |
| `--lgs-timeline-range-selection-color` | Light-blue highlight color for the recorded range in the time ruler. |
| `--lgs-timeline-range-selection-height` | Height of the compact recorded-range highlight in the time ruler. |
| `--lgs-timeline-range-selection-overflow` | Horizontal overflow on each side of the recorded-range highlight. |
| `--lgs-timeline-range-handle-focus-ring` | Video range handle focus ring. |
| `--lgs-timeline-clip-padding` | Clip horizontal padding. |
| `--lgs-timeline-clip-min-width` | Minimum clip width. |
| `--lgs-timeline-clip-handle-width` | Clip resize handle width. |
| `--lgs-timeline-clip-resize-grab-color` | Light overlay shown across the full clip height while resizing. |
| `--lgs-timeline-clip-handle-color` | Clip resize handle color. |
| `--lgs-timeline-clip-handle-focus-ring` | Clip resize handle focus ring. |
| `--lgs-timeline-track-drop-indicator-color` | Drag-target accent color used by track and clip feedback. |
| `--lgs-timeline-popup-background` | Popup background. |
| `--lgs-timeline-popup-border-color` | Popup border color. |
| `--lgs-timeline-popup-shadow` | Popup shadow. |

Useful CSS parts include `timeline`, `additional-content`,
`additional-content-panel`, `building-overlay`,
`building-overlay-text`, `top`, `header`, `header-start`,
`custom-menu`, `controls`, `header-actions`, `playback-controls`,
`layout`, `legend`, `legend-viewport`, `legend-rows`,
`legend-row`, `legend-content`, `track-context-menu`, `track-menu`, `split-panel`,
`surface`, `canvas`, `ruler`, `tick`, `minor-tick`, `tracks`, `track`, `clip`,
`tracks-viewport`,
`timeline-scrubber`, `time-slider`, `zoom-control`, `zoom-slider`,
`clip-preview`, `clip-start-handle`, `clip-end-handle`, `timeline-start-handle`,
`timeline-end-handle`, `playhead`, `end-marker`,
`scroll-shell`, `scrollbar-track`, `scrollbar-thumb`,
`popup` and `menu`.

The track surface exposes an LGS-style horizontal rail and a vertical rail for
the tracks viewport. The time ruler remains fixed on the vertical axis. The
title column exposes its own vertical rail, and both vertical views are
synchronized bidirectionally so titles and tracks stay aligned while scrolling.

## Methods

The controlled properties and events cover normal integration. The component
also provides these small imperative helpers:

| Method | Description |
| --- | --- |
| `applyControlledState(state)` | Apply timeline, tracks, clip options, playback, and playhead values in one controlled synchronization. |
| `setTime(timeMillis)` | Move the playhead without emitting `seek`. |
| `advance(durationMillis)` | Move the playhead forward by a duration in milliseconds without emitting `seek`; the active range is respected. |
| `rewind(durationMillis)` | Move the playhead backward by a duration in milliseconds without emitting `seek`; the active range is respected. |
| `setPlayheadTimeMillis(timeMillis)` | Update the playhead and optional time slider without refreshing the current-time label or transport controls. |
| `isCurrentTimeNearViewportEdge(padding)` | Check whether the playhead is close enough to a viewport edge to require following. |
| `ensureCurrentTimeVisible(padding)` | Scroll the horizontal surface just enough to keep the playhead visible. |
| `setZoom(zoomPercent)` | Set the ruler zoom up to `500`; the minimum is calculated from the available surface width, full timeline duration, and right safety margin. |
| `handleResize()` | Recompute surface dimensions after an external resize. |
| `setScrollbarsInteractionActive(active)` | Keep custom rails visible during an external drag or resize gesture. |
| `setExternalInteractionActive(active)` | Preserve an active external mouse, pointer, or touch gesture when it crosses the timeline host. |

## Accessibility

The host is a labelled `region`, playback controls use Web Awesome buttons,
the time surface is keyboard focusable, the Web Awesome split-panel exposes an
accessible divider, and generated tracks and clips expose accessible labels. Decorative
slotted icons should use `label=""` and receive visible or semantic text from
their matching label slot.

## License

MIT. See [`LICENSE.md`](../../LICENSE.md).
