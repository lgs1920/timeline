# Typed timeline tracks

This document describes the model and user interface for typed timeline
tracks. It is the design reference for [GitHub issue #7](https://github.com/lgs1920/timeline/issues/7).

## Goal

Tracks should expose a stable type so the timeline can present video, audio,
text, graphics, markers, and custom tracks with the right icon, controls, and
visual treatment. Each track remains independently selectable, editable,
draggable, and addressable by its existing id.

Media decoding, thumbnails, waveforms, and linked audio/video playback belong
to the separate [audio and video Mediabunny design](./audio-video-mediabunny.md).

## Track model

Tracks gain a `type` field. The existing `kind` field remains available for
clip-level application semantics.

```js
timeline.tracks = [
    {
        id: 'camera-main',
        label: 'Main camera',
        type: 'video',
        icon: 'video',
        groupId: 'camera',
        clips: [],
    },
    {
        id: 'voice-over',
        label: 'Voice-over',
        type: 'audio',
        icon: 'waveform',
        groupId: 'audio',
        clips: [],
    },
    {
        id: 'captions',
        label: 'Captions',
        type: 'text',
        icon: 'subtitles',
        groupId: null,
        clips: [],
    },
]
```

The initial type values are:

| Type | Purpose | Default icon |
| --- | --- | --- |
| `video` | Picture or camera content. | `video` |
| `audio` | Music, speech, or sound effects. | `waveform` |
| `text` | Captions, titles, or subtitles. | `subtitles` |
| `graphics` | Images, logos, and overlays. | `images` |
| `markers` | Timeline markers and annotations. | `flag` |
| `custom` | Host-defined content with a supplied icon and renderer. | `layer-group` |

The public fields are:

| Field | Purpose |
| --- | --- |
| `type` | Rendering and interaction type. |
| `icon` | Optional Font Awesome icon for the track label. |
| `groupId` | Optional id of a visual track group. |
| `clips` | Timeline intervals rendered by the track. |

`groupId` integrates typed tracks with the separate track-group design. A type
does not determine a group and a group does not determine a type.

## Track headers

Every track header displays its type icon next to its label. The icon is an
additional cue and never the only way to communicate the type.

```text
▾  CAMERA
   🎥 Main camera
   〽 Camera audio

   ▣ Captions
   ▰ Logo overlay
```

The existing track actions remain available for every type. A host may provide
a custom icon or label through the track data and slots.

## Add controls

The single `Add track` action becomes a vertical button group containing:

- `Add video track`;
- `Add audio track`;
- `Add text track`;
- `Add graphics track`;
- `Add custom track`, when configured by the host.

Each action can display a type icon. The created track is ungrouped unless the
host supplies a target group or the action is opened from a group context.

In the compact toolbar, the type actions are replaced by one plus button. The
plus button opens the same vertical button group as an anchored menu. The menu
closes after a selection or an outside click.

## Track actions

The track context menu can expose:

1. Edit the track label.
2. Change the track type when the host allows it.
3. Change the track icon.
4. Move the track to a group or to the ungrouped area.
5. Hide or show the track.
6. Reorder the track.
7. Remove the track when the existing track rules allow it.

Changing a track type preserves its stable id, clips, metadata, and group
membership. The host may reject a type change when the existing clips or
renderer are incompatible.

## Events and controlled updates

The typed-track feature follows the existing controlled event lifecycle:

| Event | Purpose |
| --- | --- |
| `add-track` | Request creation of a typed track. |
| `track-type-change` | Request a change to a track type. |
| `track-label-change` | Request a track label change. |
| `reorder` | Request a track order change. |
| `remove-track` | Request track removal. |

Accepted events include the affected track, the previous value where relevant,
and the complete controlled `tracks` snapshot. The host remains the source of
truth and can accept, reject, transform, or persist the result.

## Accessibility

Track type must be exposed through an accessible label as well as an icon. For
example, a video track should be announced as `Main camera, video track`.

The compact plus control needs an accessible label such as `Add timeline
track`. Its opened menu exposes separate labels for each track type. Keyboard
users can reach the type menu, create a track, and use the same track actions
as pointer users.

## Acceptance criteria

- Tracks expose a documented type with at least `video` and `audio` values.
- Video, audio, text, graphics, marker, and custom tracks can show distinct
  icons.
- The Add track control becomes a typed vertical button group.
- The compact plus button opens the same typed button group.
- Existing track selection, editing, slots, drag and drop, and controlled
  updates remain compatible.
- Group membership remains independent from track type.
- Media analysis and linked audio/video playback are documented separately and
  do not become implicit responsibilities of the generic type model.
