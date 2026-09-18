# LGS1920 Timeline specifications

This document defines the functional, technical, and software specifications
of `@lgs1920/timeline`. It describes the behavior expected from the reusable
timeline component, the public integration contract, and the engineering rules
that keep the component maintainable.

The component is a controlled Web Component. The host application owns the
playback clock, persists timeline edits, and decides which business rules apply
to its media or production workflow. The timeline owns rendering, pointer and
keyboard interaction, local gesture state, and the events that communicate user
intent and editing results.

The specification applies to the package, its optional React adapter, and the
reference demos. Values and names in this document refer to the current public
API. The [package README](../README.md) provides the integration overview, and
the [component reference](../src/README.md) provides the
property, event, slot, method, and CSS details. The [live demos](https://lgs1920.github.io/timeline/)
show the interaction model in a browser.

The terms **must**, **should**, and **may** express the expected level of
requirement. Time values use milliseconds when their name ends in `Millis` and
seconds for clip `start` and `end` values. Frame indexes are zero-based.

## 1. Functional specifications

### 1.1 Product purpose

The timeline must provide a reusable editing surface for a time-based
composition. A host application must be able to:

- display one or more ordered tracks;
- display clips with a start time, end time, label, kind, color, icon, and
  application-defined metadata;
- show a time ruler, current playback position, and selected recording range;
- move and trim clips when editing is enabled;
- add clips and tracks from the built-in controls or external clip sources;
- control playback and seeking from the host application;
- expose a read-only projection for review or playback contexts;
- customize surrounding controls through slots and CSS without forking the
  component.

The timeline must remain usable when the host application controls the state
from outside the component. A gesture is therefore an intent until the host
accepts it and writes the resulting state back to the component.

### 1.2 Initial state and controlled updates

The host supplies grouped `options`, separate `tracks`, and controlled
`currentTimeMillis`, `playing`, and `looping` playback values, together with
optional `clipOptions` properties. The component must render the latest values
provided by the host and must not treat an internal gesture result as durable
application state by itself.

When an interaction produces a new value, the component must:

1. calculate the proposed value from the pointer, keyboard, or control input;
2. apply the configured constraints, snapping, collision policy, and range
   limits;
3. invoke the optional cancelable `before` hook for the operation;
4. stop the operation when the hook cancels its event;
5. emit the one canonical main event and invoke the optional `after` hook;
6. allow the host to accept, reject, transform, or persist the result by
   applying a controlled update.

External updates must preserve the current interaction when possible. Updating
the tracks or timeline during a drag must not create a second drag origin or
cause a visible jump. Re-rendering must keep the pointer position and the
current edit operation coherent.

### 1.3 Timeline surface

The rendered surface consists of the following functional areas:

- a header with playback, range, time, and zoom controls;
- a fixed legend area containing track names and contextual track actions;
- a horizontally scrollable ruler and track area;
- one row for each visible track;
- clip elements positioned against the timeline time axis;
- a current-time playhead;
- start and stop range handles when range selection is available;
- an optional building or loading overlay during initial rendering;
- optional additional content supplied through the documented slots.

The legend must remain stable when the user clicks, right-clicks, edits a track
name, opens a menu, or changes the timeline height. A context-menu interaction
must not shrink the track-title area or cause a layout flash. The native browser
context menu must not replace the component menu where the component handles
the interaction.

The timeline must prevent accidental text selection across the interactive
timeline surface while preserving text editing in editable track labels and
other form controls.

The component must expose these interaction modes:

| Mode | Configuration | Contract |
| --- | --- | --- |
| Passive projection | `interactive: false` | Render controlled content without transport, scrubbing, selection, menus, editing, or drag targets. |
| Interactive review | `interactive: true`, `editable: false` | Keep playback, surface scrubbing, clip selection, and keyboard navigation; disable editing, range-handle editing, insertion, reordering, add-track, and context menus. |
| Editable timeline | `interactive: true`, `editable: true` | Allow playback, navigation, selection, and configured track and clip edits. Expose the track context menu according to row permissions. |
| Readonly playback | `readonly` HTML attribute/property | Keep standard transport and the draggable playhead grip. Fix the range handles and disable ruler/surface scrubbing, range editing, view tools, selection, menus, editing, and drag targets. |

The `readonly` contract is controlled by the element attribute or boolean
property. It is not a member of the `timeline` configuration object. A track
context menu must expose `Edit` only for a visible editable row, `Hide` or
`Show` when `canHide` is enabled, and `Remove` only when the row has no clips.

The legend and time surface must use the native Web Awesome split panel. Its
divider must expose a `grip-vertical` icon, fine lateral borders, and a brand
background while it has focus or is actively being dragged. The scrollable
surface must keep a default lateral safety gutter of `0.5rem`, configurable
through `--lgs-timeline-viewport-margin`.

### 1.4 Time ruler, range, and playhead

The ruler must show a readable time scale for the currently visible interval.
The visible interval may be different from the complete timeline duration and
must follow horizontal scrolling and zooming.

The range selection is defined by `rangeStartMillis` and `rangeEndMillis`.

- The start handle must always use the green semantic color, adapted to the
  active theme.
- The stop handle must always use the red semantic color, adapted to the active
  theme.
- The selected range must be shown as a light-blue rectangle between the two
  handles.
- The range rectangle must have no visible border, may extend a few pixels on
  either side of the axis to avoid gaps, and must remain limited to the ruler
  and indicator area rather than covering the complete timeline height.
- The range indicator must be rendered below the time indicators so that it
  remains legible without obscuring labels or clips.
- The start and stop position controls must move the playhead to the matching
  range boundary as well as moving the visible timeline to that boundary when
  necessary.
- If the stop boundary is outside the current viewport, moving to stop must
  scroll the viewport until the blue playhead is visible at the stop position.

The blue playhead must remain visible whenever the component has a current time,
including when it overlaps a range handle or another indicator. It must render
above the start and stop handles and must not be hidden behind them. A drag must
start from the playhead's actual rendered position; the playhead must not flash
at an old position or jump sideways at the beginning of the gesture.

When playback or seeking moves the current time outside the comfortable part of
the viewport, the timeline should follow the playhead. The host can also call
`ensureCurrentTimeVisible()` to request this behavior explicitly.

The current-time slider, when enabled, must be on one line with its leading
icon. The slider takes the remaining horizontal space, has a rectangular thumb
that is taller than it is wide, uses small corner radii, and fits within the
ruler controls without excessive top or bottom margin. Its thumb must be large
enough to grab reliably and must not overlap the ruler tick labels.

### 1.5 Playback and navigation

The component must expose controls and events for the following playback
intentions:

- play and pause;
- stop;
- restart or return to the beginning of the active range;
- seek to a clicked or dragged time;
- move to the start boundary;
- move to the stop boundary;
- move one frame backward or forward;
- advance by a caller-provided duration;
- rewind by a caller-provided duration.

An accepted play request must position the playhead at the active range start
before playback begins. The host playback clock must stop at the active range
end; when looping is enabled, it must restart from the active range start.

While `playing` is true, the editing surface must enter a temporary readonly
state. Track and clip menus, title editing, drag operations, range changes,
and insertion must be disabled, while playback controls and built-in time and
zoom sliders remain usable. Pausing must restore editing.

The playback controls must expose a loop toggle in the `transport` slot area.
The toggle emits a `loop-change` event with a `looping` boolean;
the host owns the clock and applies the accepted value. The `noloopmode` boolean
attribute must remove the loop toggle while preserving the other transport
controls. The playback time row must expose the `time-slider` slot on the left
and `playback-total` without a `playback-separator` slot. The `noTimeSlider`
option must hide the built-in slider and defaults to `false`. The grouped
`playback.transport: 'hidden'` option hides the built-in transport buttons and
loop toggle, while `playback.time: 'hidden'` hides the current and total time
labels. If both are hidden and no playback slots are provided, the playback row
is omitted.

The public `advance(durationMillis)` and `rewind(durationMillis)` methods must
move the controlled current time by the requested duration while clamping to
the valid timeline limits. They are suitable for external controls such as
ten-second buttons. The host remains responsible for writing the resulting
position back through its controlled state loop when application state is the
source of truth.

The demo controls must use the standard menu slot and the appropriate rotate
arrow icons for ten-second navigation. Playback-only demonstrations must not
show cursor-hover editing icons intended for clip editing.

### 1.6 Tracks and track operations

Each track must have a stable `id`, a user-facing `label`, an ordered `clips`
array, and optional display or editing configuration. Tracks may be visible or
hidden and may define their own collision behavior.

The component must support the following track operations when editing is
enabled and the relevant control is exposed:

- add a track using the configured label and icon;
- remove a track;
- change track visibility;
- edit a track label;
- reorder tracks by drag and drop;
- accept or reject an operation through the `before` hook and main event.

Track labels must remain editable after pointer clicks, context-menu clicks,
height changes, and menu selection. In editable mode, the inline field must
support native text selection, manual replacement, `Enter` to commit, and
`Escape` to cancel. The label editor must receive focus and must not be replaced
by an unrelated layout reset.

The default presentation may include video, audio, text, marker, graphic, and
other tracks. Clip kinds are data-driven; adding a new kind must not require a
change to the timeline rendering contract when the host supplies a compatible
icon, color, or custom rendering slot.

### 1.7 Clip operations

A clip is an interval attached to a track. The component must support the
following operations according to `editable`, `interactive`, and track or
timeline policies:

- select a clip;
- open a clip context menu;
- trigger a configured clip action;
- double-click a clip and report the context to the host;
- move a clip along its track;
- trim the start edge;
- trim the end edge;
- add a clip from a built-in option or external drag source;
- remove a clip;
- enable or disable a clip;
- change the clip color through the configured menu where available;
- reorder clips or tracks when the interaction is configured to allow it.

During clip trimming, the complete clip grab zone must receive a clear,
theme-aware highlight across the full height of the clip. The highlight must
make the active edge understandable without changing the clip's duration until
the interaction is accepted.

Clip changes must obey the configured minimum duration. A clip must not become
negative, zero-length, or shorter than the effective minimum. Dragging must
respect the timeline duration unless `resizeExtendsDuration` and the selected
duration policy allow the duration to grow.

### 1.8 Collision and snapping behavior

The component must support the configured collision policies:

- `allow` permits overlap;
- `prevent` constrains the edited clip so it does not overlap a protected
  neighboring clip;
- `ripple` moves affected neighboring clips to preserve the edit.

Move and trim operations may use separate policies. A track-level policy has
precedence over the timeline-level policy for that track. Snapping must use the
configured threshold and release threshold so that a clip can be grabbed and
released without oscillating between snapped and unsnapped positions.

The editing result must include enough information for the host to understand
the operation: the operation type, affected edge, the immediately previous
timeline, the original timeline retained across a trim chain, the proposed
timeline, drag origin, current drag values, duration, and resulting tracks.

### 1.9 Clip sources and drag and drop

The clip menu must display the configured `clipOptions`. Each option may define
a group, key, label, icon, color, kind, duration, and application metadata.
The host can use the generic default option, an empty option list, or a custom
set of sources.

Clip options must be draggable from the source area into a compatible track.
The component must serialize the option with the public MIME type
`application/x-lgs1920-timeline-clip`. A drop must calculate the target track
and time, create the proposed clip, and go through the `add-clip` event
contract.

The reference demo must include distinct video, audio, text, and other clip
sources. These examples must use different icons and colors so that the type
of a source remains understandable without relying on its label alone.

### 1.10 Slots and visual customization

The component must support the documented slots for application-provided
content, including the `time-slider` and `transport` playback areas, playback
time labels, menu content, additional content, ruler
content, track content, and clip content. Slot content must be rendered in the
correct layout region and must not break the fixed legend or scrolling ruler.

The standard top menu slot must be usable for host playback controls. Empty
neutral areas must not display unnecessary frames around slotted content. The
default controls should use compact plain buttons so that the timeline remains
usable in a small editing panel.

The component must follow the active Web Awesome theme. Semantic colors,
focus indicators, contrast, icons, borders, slider thumbs, and overlays must
adapt through Web Awesome tokens or documented component custom properties.

### 1.11 Accessibility and keyboard use

The timeline must expose an accessible label from the host and must provide
keyboard access to the controls that are also available by pointer. At minimum,
the component must support:

- keyboard activation of playback and range controls;
- keyboard seeking by the documented step size;
- keyboard zoom when enabled;
- the accessible scissors cut tool and its `Ctrl/Cmd+K` shortcut;
- visible focus indicators;
- accessible names for icon-only buttons;
- usable labels for tracks, clips, handles, and sliders;
- a readable state for selected, disabled, hidden, and playing elements.

The component must not make color the only way to distinguish start, stop,
playhead, or clip kind. Icons, labels, position, and accessible names must
provide equivalent information where color is used.

### 1.12 Event behavior

Events must be namespaced with `lgs1920-timeline-`. Each operation exposes one
canonical main event. The Web Component `on(name, main, {before, after})` API
provides optional lifecycle hooks without multiplying public event names. The
`before` hook receives a cancelable event and can call `preventDefault()`;
the main event and `after` hook run only when the operation is accepted.

The event model must cover playback, loop mode, zoom and range changes, track add/remove,
track visibility and label changes, track reorder, clip add/remove/select,
clip enablement, configured clip actions, drag, clip changes, and double-click
host intents.

Continuous interactions must expose a start event, zero or more changing
events, and a final event. The host can use changing events for previews and
the final event for persistence. Canceling a before event must not emit a
committed result.

The editable playback area exposes a scissors tool immediately before the time
slider. Cut mode previews a vertical dashed guide over eligible clips and
splits a clip at the clicked position while preserving its source fields and
metadata. The original clip keeps its identifier and the right segment gets a
unique identifier. A normal click exits cut mode after the cut; `Shift`-click
keeps it active for consecutive cuts. `Escape`, a second scissors activation,
or a hidden/read-only state exits cut mode. `Ctrl+K` and `Command+K` apply the same operation at the
playhead and may split every eligible clip intersecting that time. The operation
uses the normal cancelable `clip-change` lifecycle and reports `type: 'cut'`,
`cutTime`, `rightClipId`, and the resulting `tracks` snapshot.
The cut guide label shows the elapsed position within the clip, the clip
duration, and the timeline position in brackets, all with millisecond
precision. It uses a compact format such as `1s500ms/3s [2s500ms]`, with no
spaces between units and with zero-valued units omitted.

The editing tools also expose per-instance Undo and Redo controls. The history
stores up to 200 accepted editing operations, excludes previews and canceled
interactions, and clears its redo branch after a new edit. Undo and Redo emit
cancelable `undo` and `redo` lifecycles with the resulting `tracks` snapshot;
external controlled updates that replace the current timeline clear the local
history so it cannot diverge from host state.

### 1.13 Reference demo requirements

The reference demos must document the behavior they demonstrate in a
`wa-details` section. Each demo explanation must describe its purpose, the
relevant controls, the data model, the event flow, and the expected host
integration.

The demos must cover, at minimum:

- a basic timeline with multiple colored clip types;
- playback and range selection;
- controlled seeking and visible playhead following;
- clip dragging, trimming, snapping, and collision behavior;
- external clip sources and track operations;
- code examples with real syntax highlighting for HTML and JavaScript.

The demo code must remain aligned with the public API and must build through
the repository demo build command.

## 2. Technical specifications

### 2.1 Package and runtime boundary

The package is distributed as an ES module library with the following public
entry points:

- the default package entry, which registers and exports the timeline Web
  Component and related constants and helpers;
- the `/react` entry, which exports the React adapter;
- the source component reference and demo as the maintained documentation
  surfaces.

The custom element is `<lgs1920-timeline>`. The public class is
`LGS1920Timeline`. The public MIME constant is `CLIP_OPTION_DRAG_MIME`, and
the public time helper is `formatRulerTime`.

The component uses Web Awesome components for buttons, icons, inputs, popups,
sliders, split panels, button groups, and details. The host application must
load the Web Awesome stylesheet. The package registers the Web Awesome
components used by the timeline but does not take ownership of the host's
global stylesheet loading strategy.

The runtime target is a modern browser with ES module and Custom Elements
support. The package does not define a server-side rendering contract. The
React adapter is an integration layer around the same browser component and
does not duplicate timeline behavior.

### 2.2 Public state model

The public state is divided into five controlled values:

| Value | Responsibility | Units or shape |
| --- | --- | --- |
| `options` | Duration, frame clock, range, visibility, zoom, layout, and policies | Configuration object |
| `tracks` | Ordered track and clip data | Array of serializable objects |
| `currentTimeMillis` | Current playhead position | Milliseconds |
| `playing` | Playback state shown by the component | Boolean |
| `looping` | Controlled repeat state for the selected playback range | Boolean |

`clipOptions` supplies add-clip sources and may be null, undefined, empty, or
populated according to the menu contract. The component must preserve unknown
application metadata when it returns track or clip objects through events where
the operation does not replace that data.

The `options` object supports the following public configuration areas:

- duration and frame clock: `durationMillis`, `fps`, `frameCount`,
  `frameIntervalMillis`, and `currentFrameIndex`;
- range: `rangeStartMillis`, `rangeEndMillis`, and
  `initialRangeStartVisible`;
- visibility and interaction: `visible`, `editable`, `interactive`,
  `hostInteraction`, and `hostNoDragClass`;
- zoom and layout: `zoomPercent`, legend width settings, and keyboard zoom;
- overlays and controls: `showBuildingOverlay`, `noTimeSlider`,
  `playback.transport`, `playback.time`,
  `showZoomSlider`, `noZoomControls`, `view.tools`, and
  `showClipMenu`;
- editing policies: `collisionPolicy`, `resizeCollisionPolicy`,
  `snapThresholdPixels`, `snapReleaseThresholdPixels`,
  `resizeExtendsDuration`, and `durationPolicy`;
- clip defaults: `minClipDuration`, `defaultClipDuration`, and
  `defaultTrackId`;
- keyboard and track creation: `keyboardStepSeconds`, `addTrackLabel`, and
  `addTrackIcon`;
- theming and actions: `swatches` and `clipActions`.

The `readonly` attribute/property is a separate interaction setting and must be
documented alongside the `options` configuration without being serialized as
part of that configuration object.

The `noLoopMode` boolean property and its `noloopmode` HTML attribute are a
separate presentation setting. They hide the loop control without disabling
the rest of playback navigation.

New configuration values must be added to the public reference before they are
used by the demos. Internal layout state must not be exposed as a required
controlled property.

### 2.3 Track and clip data

A track has a stable identifier and an ordered clip list. A typical track is
represented as follows:

```js
{
    id: 'camera',
    label: 'Camera',
    kind: 'video',
    visible: true,
    clips: [
        {
            id: 'opening',
            label: 'Opening',
            kind: 'video',
            start: 0,
            end: 8,
            color: 'blue',
            icon: 'film',
            enabled: true,
        },
    ],
}
```

The `id` of a track and clip must be stable and unique in its applicable
scope. Clip `start` and `end` values are seconds because the track model is
designed for editing intervals. Timeline duration, current time, and range
boundaries are milliseconds because they represent the playback clock and
public navigation API.

The implementation must normalize numeric input and clamp values at the public
boundary. It must preserve the distinction between a missing optional value
and an explicit false, zero, empty string, or empty array where that distinction
changes rendering behavior.

### 2.4 Event contract

Events are dispatched as composed, bubbling Custom Events through the public
element. A cancelable before event must be cancelable with
`event.preventDefault()`.

The event detail must contain the operation-specific values documented in the
component reference. Common fields include:

- `source`, identifying whether the operation originated from a control,
  keyboard, pointer, host call, or another documented source;
- `event`, containing the originating browser event where applicable;
- `tracks`, `previousTracks`, and affected track or clip identifiers for data
  changes;
- `timeMillis`, `progress`, and `settled` for playback and seeking;
- `oldTimeline`, `newTimeline`, `dragStart`, and `drag` for clip editing;
- `committed`, `accepted`, or `canceled` where an operation has a final
  outcome.

The React adapter accepts `events` descriptors such as
`{seek: {before, on, after}}` and forwards callbacks as `(detail, event)`
without changing units or semantics. Raw `addEventListener` subscriptions
receive the main event only.

### 2.5 Rendering and layout model

Rendering is split into a fixed legend region and a scrollable timeline region.
The time-to-pixel transform must be shared by the ruler, clips, range, and
playhead so that all visual indicators remain aligned at every zoom level.

The implementation uses dedicated internal responsibilities for rendering,
editing, clip data, controlled-state comparison, DOM caching, pointer
interaction, and clip-scroll behavior. The public element coordinates these
responsibilities and remains the only supported integration boundary.

The DOM cache must index dynamic, clip, track, and scrollbar elements by stable
identifiers. Rendering should update affected elements and layout geometry
without recreating unrelated controls, focused inputs, or active drag handles.

The component must use a single authoritative geometry calculation for:

- ruler labels and ticks;
- clip `left` and `width` positions;
- range start and end positions;
- current-time playhead position;
- pointer-to-time conversion;
- auto-follow and edge scrolling.

### 2.6 Interaction and pointer handling

Pointer interaction must distinguish between selection, scrubbing, clip move,
clip trim, track reorder, scrollbar movement, and host-owned interaction.
Pointer capture must be released on completion, cancellation, lost focus, and
component disconnection.

The drag origin must be recorded from the pointer event and the rendered target
at pointer-down time. The implementation must not recompute the origin from a
stale controlled value after the first move. This prevents the playhead flash
and the initial jump observed when a controlled update arrives during a drag.

Native browser context menus must be suppressed only for interactions owned by
the component. Menu selection must close the menu without resetting the
timeline height or changing unrelated legend geometry. The timeline height
interaction may use the context-menu gesture to reset to its minimum and then
grow to the requested size according to the documented trim behavior.

### 2.7 Range and playhead layering

The range fill and handles are ruler indicators. They must not be implemented
as full-height track overlays. The range fill sits below the ruler time labels,
while the playhead has a higher stacking order than range handles and clip
content whenever their positions coincide.

The playhead must remain present in the DOM and visually represented when the
current time is outside the previous viewport. Viewport scrolling and
indicator positioning must be coordinated so the playhead does not disappear
between the controlled update and the resulting scroll update.

### 2.8 Slots, CSS parts, and custom properties

Slots are part of the public composition contract. The implementation must
retain the documented slot names and preserve their layout semantics. The
component reference is the source of truth for slot-specific attributes and
supported content.

The component must expose documented CSS parts for the host to style stable
regions, including controls, ruler, legend, track rows, clips, handles,
playhead, sliders, overlays, and menus where applicable. CSS selectors that
depend on internal utility classes are not a supported integration contract.

Theme customization must use Web Awesome tokens and the documented custom
properties. Component-local colors must have theme-aware fallbacks so that
start, stop, playhead, selection, disabled, and focus states remain legible in
light and dark themes.

### 2.9 External clip MIME contract

The external drag source contract is:

```text
application/x-lgs1920-timeline-clip
```

The drag payload is JSON representing the selected clip option. The drop target
must validate the payload before using it. Invalid or incomplete payloads must
be ignored without throwing from the event handler or mutating the current
tracks.

The host may use the exported `CLIP_OPTION_DRAG_MIME` constant rather than
duplicating the string. Changes to this MIME type require a migration note and
an update to the package reference.

### 2.10 Public methods

The following methods are public integration points:

- `applyControlledState(state)` applies a host state snapshot;
- `setTime(timeMillis)` changes the internal time position according to the
  method contract;
- `advance(durationMillis)` moves the time forward by a duration;
- `rewind(durationMillis)` moves the time backward by a duration;
- `setPlayheadTimeMillis(timeMillis)` positions the playhead;
- `isCurrentTimeNearViewportEdge()` reports whether auto-follow is needed;
- `ensureCurrentTimeVisible()` brings the playhead into view;
- `setZoom(zoomPercent)` applies a zoom value;
- `handleResize()` recomputes layout after host or viewport changes;
- `setScrollbarsInteractionActive(active)` coordinates custom scrollbar input;
- `setExternalInteractionActive(active)` allows the host to mark an interaction
  as externally owned.

Method names, parameter units, return values, and event side effects must be
documented together. A method that changes controlled state must clearly state
whether it emits a user-facing event or only updates presentation state.

### 2.11 Build and generated output

The package build produces the distributable entry points from `entries/index.js`
and `entries/react.jsx`. The demo build generates the reference site from the
source README and demo templates. Generated files must not be edited manually
when the source template or source documentation is available.

The repository must keep the package README, component reference, source code,
tests, and demo examples aligned. A public API change is incomplete until the
implementation, source documentation, React mapping where applicable, demo
usage, and tests are updated together.

## 3. Software specifications

### 3.1 Architectural responsibilities

The software must keep responsibilities separated as follows:

- **Public element:** owns lifecycle, public properties, event dispatch,
  controlled-state application, and coordination of child responsibilities.
- **Rendering:** builds and updates the visual structure, ruler, tracks, clips,
  handles, playhead, controls, and overlays.
- **Editing:** calculates move, trim, snapping, collision, ripple, and
  duration-extension results.
- **Clip data:** performs serializable clip and track transformations and
  optimized interval checks.
- **State comparison:** detects meaningful controlled changes and prevents
  unnecessary DOM replacement.
- **DOM cache:** indexes reusable elements and keeps lookup work bounded by the
  number of affected entities.
- **Interaction:** translates pointer and keyboard input into editing or
  playback intents.
- **Clip scroll:** handles edge scrolling during clip drag operations.
- **React adapter:** maps React properties and callbacks to the same Web
  Component contract without introducing a second state model.

The repository keeps `src/LGS1920Timeline.js` as the public implementation
coordinator. All other implementation modules are directly under `src/` and
use unprefixed names. The main behavior test remains
`test/LGS1920Timeline.test.js`; secondary tests use the corresponding
unprefixed module names. This naming rule is internal and does not change the
public package entry points.

Internal modules may change, but a change must preserve the public element,
data, event, slot, and method contracts unless it is explicitly treated as a
breaking change.

### 3.2 State invariants

The implementation must preserve these invariants after every controlled update
and every accepted edit:

- timeline duration is finite and non-negative;
- range start is not after range end;
- range boundaries remain within the supported duration policy;
- current time is finite and clamped to the valid time limits;
- frame indexes remain within the configured frame count;
- clip start is not after clip end;
- clip duration meets the effective minimum duration;
- track and clip identifiers remain stable and addressable;
- hidden tracks remain in the data model even when their content is not shown;
- rejected or canceled edits do not leak a partial committed result;
- unknown application metadata is not discarded by unrelated edits.

When the host supplies inconsistent state, the component must fail in a
controlled way: normalize values where the public contract permits it, avoid
throwing during rendering, and expose a result that the host can inspect and
correct. It must not silently invent business data.

### 3.3 Lifecycle and resource management

The component must clean up resources when disconnected or when a controlled
interaction ends. Cleanup includes:

- document and window event listeners;
- pointer capture;
- resize and intersection observers;
- requestAnimationFrame callbacks;
- timers used for delayed interaction or menu behavior;
- temporary drag state and data-transfer references;
- DOM cache entries for removed tracks, clips, and menus.

Repeated property updates must not accumulate listeners, duplicate controls,
duplicate style nodes, or stale observers. Reconnecting the element must produce
one functional set of controls and one event path per interaction.

### 3.4 Editing algorithm requirements

Editing calculations must be deterministic for the same input state, pointer
position, and configuration. The algorithm must:

1. identify the target track, clip, edge, or control;
2. convert the input position into the canonical time unit;
3. apply frame or pixel snapping when configured;
4. apply minimum duration and timeline bounds;
5. evaluate the move or trim collision policy;
6. construct a serializable proposed result;
7. expose the result through the canonical event and optional hooks;
8. commit only after the operation is accepted.

Preview calculations may run for every pointer move, but they must not mutate
the host's source data. The final event must identify whether the operation was
accepted, rejected, canceled, or committed.

### 3.5 Performance requirements

The timeline must remain responsive while scrubbing, dragging, trimming,
scrolling, and updating the current time. Rendering work should be limited to
the affected geometry and controls. High-frequency pointer and playback work
should be coalesced when possible and scheduled consistently with browser
rendering.

The implementation should avoid full shadow-root reconstruction for current
time updates, clip previews, slider movement, or a single track label change.
DOM caches and stable identifiers should be used to update existing elements.
Performance regressions must be assessed with a realistic multi-track,
multi-clip dataset rather than an empty timeline only.

### 3.6 Error handling and cancellation

Public event handlers and drag-and-drop handlers must tolerate missing,
malformed, or stale data. Invalid external payloads, unknown clip actions,
missing target tracks, and disconnected targets must not leave an active drag,
open menu, pointer capture, or partial state mutation.

Cancelable before events are the supported interception mechanism for host
validation. A host that cancels an event must receive the corresponding final
event state needed to close the interaction cleanly, without receiving a
committed data result.

### 3.7 Accessibility engineering requirements

Accessibility is part of the component contract and must be tested at the DOM
boundary. Every icon-only control requires an accessible name. Interactive
handles and sliders require keyboard semantics and a visible focus state.
Editable labels require an input name or associated label and must preserve
focus while the host applies the accepted update.

The shadow DOM must expose meaningful roles, names, states, and relationships
to assistive technology. Decorative icons must not create duplicate names.
Contrast and focus styling must remain valid for the supported Web Awesome
themes.

### 3.8 Testing requirements

The test suite must cover the public behavior at the component boundary. It
should include:

- initial rendering and controlled property updates;
- time conversion, clamping, frame navigation, `advance`, and `rewind`;
- range ordering, handle colors, range visibility, and playhead layering;
- viewport following when the target time is initially off screen;
- pointer drag origin and no-jump behavior;
- clip move and trim calculations;
- minimum duration, snapping, collision, and ripple policies;
- add, remove, select, enable, label, visibility, and reorder events;
- context-menu behavior and preservation of timeline height and labels;
- external clip payload validation and drop handling;
- slot rendering, CSS parts, themes, and keyboard interaction;
- React callback mapping where the adapter is changed.

Validation commands are:

```bash
bun run test
bun run lint
bun run build
bun run test:package
bun run demo:build
```

Documentation-only changes must still pass the documentation-producing demo
build and a repository whitespace check. Component or demo behavior changes
must pass the complete applicable suite before release.

### 3.9 Documentation and demo maintenance

The root README must provide installation, a concise integration example,
controlled playback guidance, and links to the full reference and this
specification. The component reference must describe every public property,
event, slot, method, CSS contract, and accessibility behavior.

Each demo must explain its purpose inside the rendered interface. Code examples
must use real syntax highlighting for their language and must remain executable
against the current package API. Documentation must use a serious tone and
must not contain emojis.

When a public contract changes, the maintainer must update the following in one
change set:

1. implementation and public exports;
2. tests covering the changed behavior;
3. package and component documentation;
4. demo markup, behavior, and explanatory details;
5. generated output through the documented build commands.

### 3.10 Release acceptance criteria

A change is ready for release when:

- the component behavior matches the functional specifications;
- public data, event, slot, method, and CSS contracts are documented;
- controlled updates do not introduce visible jumps, flashes, or stale focus;
- the legend, ruler, range, playhead, sliders, and menus remain usable at the
  supported sizes and themes;
- the package and React entry points build successfully;
- the relevant unit, package, lint, and demo checks pass;
- the reference demos exercise the changed behavior;
- generated documentation is reproducible from source;
- the working tree contains no unexplained generated or temporary artifacts.
