# Animated clip motion

This document describes how a clip can move, scale, rotate, and change
opacity during playback. It covers the data model, the keyframe interface, the
preview surface, and the boundary between the timeline and the media renderer.

Motion is a clip-level animation. It is separate from:

- moving a clip along the timeline;
- transitions placed between two clips;
- effects such as chroma key, blur, or distortion.

## Goal

An editor should be able to animate the visual position of a clip while it is
playing. A clip can enter from the left, move across the frame, zoom in,
rotate, fade, or follow a sequence of keyframed positions.

The timeline stores serializable motion data. The media adapter decodes the
source and applies the interpolated transform before displaying the frame.

## Motion model

Motion is stored on the clip in a dedicated `motion` object:

```js
{
    id: 'title-card',
    type: 'video',
    start: 10,
    end: 25,
    motion: {
        timeBase: 'clip',
        interpolation: 'ease-in-out',
        anchor: {x: 0.5, y: 0.5},
        keyframes: [
            {
                timeSeconds: 0,
                position: {x: 0.5, y: 0.5},
                scale: {x: 1, y: 1},
                rotationDegrees: 0,
                opacity: 1,
            },
            {
                timeSeconds: 5,
                position: {x: 0.25, y: 0.5},
                scale: {x: 1.4, y: 1.4},
                rotationDegrees: 0,
                opacity: 1,
            },
        ],
    },
}
```

The motion fields are:

| Field | Purpose |
| --- | --- |
| `timeBase` | Defines whether keyframe time is relative to the clip or the source media. |
| `interpolation` | Default interpolation used between keyframes. |
| `anchor` | Normalized transform origin inside the clip. |
| `timeSeconds` | Keyframe time in the selected time base. |
| `position` | Normalized or composition-space x and y position. |
| `scale` | Independent horizontal and vertical scale. |
| `rotationDegrees` | Rotation around the anchor point. |
| `opacity` | Opacity from `0` to `1`. |

The default `timeBase: 'clip'` makes motion follow the clip. Moving the clip
along the timeline moves its animation with it. A `source` time base can be
used when a motion must follow the original media time through trims and speed
changes.

All values are serializable. The model must not contain DOM elements, canvas
contexts, decoded frames, animation callbacks, or media player objects.

## Keyframe behavior

The editor evaluates the two keyframes surrounding the current time and
interpolates their values. A keyframe at the current time becomes the exact
value used for playback.

The initial interpolation modes are:

- `step`;
- `linear`;
- `ease-in`;
- `ease-out`;
- `ease-in-out`.

Bezier curves can be added later without changing the keyframe shape:

```js
{
    timeSeconds: 5,
    interpolation: {
        type: 'bezier',
        in: {x: 0.2, y: 1},
        out: {x: 0.8, y: 0},
    },
    position: {x: 0.25, y: 0.5},
}
```

When a clip is moved, its clip-relative keyframes move with it. When a clip is
split, each resulting clip inherits the motion that applies to its interval;
keyframe times are shifted into the new local clip time base. When a clip is
trimmed, keyframes outside the visible interval are retained in the source
model when possible and are ignored by the current projection.

## Preview surface

The host playback view should expose a transform overlay when a clip with
motion is selected:

```text
┌─────────────────────────────────────┐
│                                     │
│          ┌──────────────┐           │
│          │  video clip  │           │
│          └──────────────┘           │
│                 ↻                   │
└─────────────────────────────────────┘
```

The overlay provides:

- corner handles for scale;
- a center handle for position;
- a rotation handle;
- an anchor point handle;
- a visible outline while the clip is selected.

Dragging a handle updates the motion value at the current playhead position.
When keyframe recording is enabled, the change creates or updates a keyframe.
When it is disabled, the change edits the selected static value or the active
keyframe according to the inspector state.

The overlay must remain inside the host preview surface and must not become
part of the timeline's shadow DOM contract. The host can provide a custom
preview surface while the timeline provides the motion state and controls.

## Motion inspector

Selecting a clip opens a `Motion` section in the clip inspector:

```text
Motion
  Position       X ─────●────  Y ───●────  ◆
  Scale          X ─────●────  Y ───●────  ◆
  Rotation       ─────────●──              ◆
  Opacity        ─────●─────              ◆
  Anchor         X ─────●────  Y ───●────
  Interpolation  [ Ease in/out          ]
  [Reset motion] [Remove keyframes]
```

The diamond beside a parameter enables keyframing for that parameter. With
keyframing enabled, changing the parameter at the current playhead creates a
keyframe. Clicking an existing diamond selects that keyframe.

The inspector should also provide:

- reset one parameter;
- reset all motion;
- copy and paste motion;
- apply the same motion to another clip;
- enable or disable the motion without deleting it;
- choose the interpolation mode.

## Keyframe lane

The selected clip can expand to show a compact keyframe lane beneath it:

```text
Clip       ─────────────────────────────────────
Position       ◆──────────────◆──────────────◆
Scale                  ◆────────────◆
Rotation       ◆──────────────────────────────
```

Keyframes can be selected, moved, copied, and deleted. Moving a keyframe
changes its local time without changing the clip's timeline bounds. The active
keyframe uses the same selection color as the clip.

The lane should remain compact by default. It expands only for a selected clip
or when the user chooses `Show keyframes`, so a timeline with many clips does
not become permanently tall.

## Recording motion during playback

Structural timeline edits and motion recording are separate modes.

While normal playback is active, moving a clip to another timeline position or
trimming its boundaries remains locked to avoid changing the application clock
under the playhead.

The transport can expose a `Record motion` control. When it is enabled:

1. Playback continues through the host media clock.
2. The current playhead time is displayed in the motion inspector.
3. Changes in the preview surface or inspector create keyframes at that time.
4. The host receives live motion changes through the normal controlled event
   flow.
5. Stopping playback closes the recording transaction.

The record button needs a clear active state and an accessible label. A change
made while recording should be undoable as one motion transaction when the
host provides history.

## Playback evaluation

During playback, the host or media adapter evaluates motion for the active
clip:

1. Resolve the clip-relative or source-relative time.
2. Find the surrounding keyframes.
3. Interpolate position, scale, rotation, and opacity.
4. Decode the source frame through the selected media pipeline.
5. Apply the transform and effects in the rendering layer.
6. Display the resulting frame in the host preview surface.

The timeline receives the host's current position through
`currentTimeMillis`. It does not create a second application clock.

The visual pipeline is:

```text
Source media
    ↓
Mediabunny decode
    ↓
Clip effects such as chroma key or distortion
    ↓
Motion transform
    ↓
Transition compositing
    ↓
Preview or export output
```

The exact order between an effect and the motion transform can be configured
by the rendering adapter for advanced effects. The default order keeps
source-level effects before the final clip transform.

## Linked audio and video

Motion applies to the video member of a linked audio/video pair. It does not
change the audio track's volume or waveform.

If the linked clip duration changes and the pair uses time-stretch, motion
keyframes need a defined time base:

- clip-relative keyframes stretch with the new timeline duration;
- source-relative keyframes remain attached to source media time.

The link policy should expose this choice when a duration change affects the
playback rate. Audio and video keep the same playback rate even though only the
video member has visible motion.

## Controlled events

Motion changes should use the existing clip-change lifecycle with a motion
operation type:

```js
{
    type: 'motion-change',
    clipId: 'title-card',
    parameter: 'position',
    timeSeconds: 5,
    motion: {...},
    tracks: [...],
    event,
}
```

Continuous recording can emit `clip-motion-changing` events. The committed
`clip-motion-change` event contains the complete updated track snapshot so the
host can apply it as controlled state.

## Accessibility and performance

Motion controls must have accessible names that include the parameter and
current value. The transform overlay needs keyboard alternatives for moving,
scaling, rotating, and selecting keyframes.

The renderer should evaluate only clips visible at the current playhead and
cache interpolated values for the current frame. It should avoid creating one
DOM element per keyframe for the entire project. Large keyframe collections
should be represented with a bounded canvas or virtualized lane.

## Acceptance criteria

- A clip can store serializable position, scale, rotation, opacity, and anchor
  keyframes.
- The selected clip exposes a transform overlay in the host preview surface.
- Motion parameters can be edited through the inspector and keyframe lane.
- Motion can be recorded while playback is active through an explicit mode.
- Moving, splitting, and trimming clips preserve the documented keyframe time
  behavior.
- Mediabunny playback evaluates the current motion before displaying a frame.
- Motion remains separate from transitions and clip effects.
- Linked audio/video keeps one playback rate while video motion remains on the
  video member.
- Keyboard and accessible alternatives exist for all motion controls.
