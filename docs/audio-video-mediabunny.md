# Audio and video tracks with Mediabunny

This document describes media analysis, linked audio/video editing, and
Mediabunny playback. It is the design reference for [GitHub issue #8](https://github.com/lgs1920/timeline/issues/8).

The base track type model is described in
[Typed timeline tracks](./track-types.md).

## Goal

Video and audio tracks should represent the same source media when they are
linked. Video clips show source thumbnails, audio clips show a waveform, and
editing either linked member preserves synchronization.

When the timeline enters playback mode, the host uses a Mediabunny-based media
adapter to decode and play the active video and audio clips.

The timeline remains a controlled editing surface. It displays serializable
analysis results and emits editing intent. The host or a separate adapter owns
decoding, playback, buffering, encoding, and persistence.

## Media-aware track model

Typed tracks can provide a serializable media description:

```js
timeline.tracks = [
    {
        id: 'camera-video',
        label: 'Camera video',
        type: 'video',
        icon: 'video',
        linkId: 'camera-av',
        media: {
            assetId: 'camera-rush-001',
            durationSeconds: 184.32,
            thumbnails: {
                type: 'sprite',
                src: '/media/camera-rush-001-thumbnails.webp',
                tileWidth: 160,
                tileHeight: 90,
                intervalSeconds: 2,
            },
        },
        clips: [
            {id: 'camera-video-clip', start: 12, end: 42, sourceStart: 0, sourceEnd: 30},
        ],
    },
    {
        id: 'camera-audio',
        label: 'Camera audio',
        type: 'audio',
        icon: 'waveform',
        linkId: 'camera-av',
        media: {
            assetId: 'camera-rush-001',
            durationSeconds: 184.32,
            waveform: {
                type: 'peaks',
                src: '/media/camera-rush-001-waveform.json',
                channels: 2,
                samplesPerPixel: 512,
            },
        },
        clips: [
            {id: 'camera-audio-clip', start: 12, end: 42, sourceStart: 0, sourceEnd: 30},
        ],
    },
]
```

`sourceStart` and `sourceEnd` describe the selected portion of the source
asset. They are separate from the timeline `start` and `end` positions. This
distinction allows a clip to move, trim, or change duration without losing its
source mapping.

The public media model must remain serializable. It must not contain
`VideoFrame`, `AudioBuffer`, decoder objects, media elements, or other live
media objects.

## Mediabunny analysis

Mediabunny should be used by a host-owned or optional media adapter to produce
the assets consumed by the timeline.

For video, the adapter generates thumbnails or a sprite sheet with a known
source-time interval. The renderer maps each thumbnail to the visible clip
interval.

For audio, the adapter generates normalized waveform peaks. A compact peak
representation or a URL to an analysis file is preferred to passing raw audio
samples through the timeline model.

The adapter provides:

- asset duration and dimensions;
- thumbnail metadata and loading state;
- waveform metadata and loading state;
- source-time mapping;
- analysis errors and retry state.

Analysis is loaded lazily for the visible viewport. Thumbnails and waveform
peaks are cached and reused as the user scrolls or zooms. Pending analysis uses
a neutral placeholder, and failures remain visible to the host.

## Linked track model

The `linkId` field identifies a shared editing relationship. A controlled
`links` collection describes the members and the shared policy:

```js
timeline.links = [
    {
        id: 'camera-av',
        type: 'audio-video',
        trackIds: ['camera-video', 'camera-audio'],
        mode: 'locked',
        resizeMode: 'time-stretch',
        audioMode: 'preserve-pitch',
    },
]
```

The initial supported relationship contains one video track and one audio
track. The model may support more members later for multichannel audio,
captions, or grouped camera channels.

Matching linked clips should share the link membership or a common
`sourceGroupId` when a track contains several independent segments. A linked
edit operates on matching clips rather than every clip on either track.

## Linked editing

When a linked clip is selected, its matching clips receive a linked selection
state. The track headers show a chain indicator and the matching clips receive
a shared highlight.

The default locked behavior is:

- moving one linked clip moves all matching clips by the same timeline delta;
- trimming the start edge changes the start edge of all matching clips;
- trimming the end edge changes the end edge of all matching clips;
- splitting one linked clip splits matching clips at the same timeline time;
- deleting one member treats the linked media as one edit transaction;
- a rejected edit leaves every linked member unchanged;
- undo and redo treat the linked edit as one transaction when history exists.

The host can expose an unlink modifier for an intentional independent edit. The
detached state must be visible before the edit is committed.

## Duration changes and playback speed

When a linked clip is resized while its source interval remains fixed, playback
speed changes to fit the source into the new timeline duration:

```text
playbackRate = sourceDuration / timelineDuration
```

For example, 30 seconds of source media placed in a 24-second timeline
interval plays at `1.25x`. The same source in a 36-second interval plays at
approximately `0.83x`.

Therefore:

- extending the timeline interval slows video and audio together;
- shortening the timeline interval speeds video and audio together;
- both linked members use the same rate;
- the edit detail exposes the resulting duration and playback rate.

The link policy selects the audio behavior:

- `preserve-pitch` keeps the perceived voice pitch stable;
- `varispeed` changes pitch together with playback speed.

The timeline calculates and emits the result. The host media pipeline applies
the rate during playback and export.

## Mediabunny playback

When playback starts, the host receives the timeline's playback request and
resolves the clips active at the requested position. The Mediabunny adapter
then opens the sources, selects the required streams, and decodes the active
video and audio.

The playback flow is:

1. The host receives play, pause, stop, restart, or seek intent.
2. The host resolves active video and audio clips from the controlled tracks.
3. Mediabunny decodes video frames for the host's video surface.
4. Mediabunny decodes audio for the host's audio output.
5. The host writes the current position to `timeline.currentTimeMillis`.

The supported cases are:

| Active media | Playback behavior |
| --- | --- |
| Video track only | Decode and render video frames. |
| Audio track only | Decode and output audio. |
| Linked video and audio | Decode both streams against one clock and use one playback rate. |
| Several independent tracks | Mix or compose streams according to host configuration. |
| No active media | Continue the timeline clock without media output. |

The playback surface belongs to the host and may be a video element, canvas,
or another renderer. The timeline displays the active clip, playhead, and link
state beside that output.

The host releases decoders, audio nodes, frame queues, and object URLs when
playback stops, the timeline disconnects, or the media session changes.

## Media UI

Video and audio clips share the same time ruler but use distinct content:

```text
▾  CAMERA · linked          │────────────────────────────────│
   🎥 Camera video          │ [thumb][thumb][thumb][thumb]   │
   〽 Camera audio          │ 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰  │
```

Video clips show thumbnails at a density appropriate to the current zoom. A
clip without analysis displays a neutral placeholder and its label.

Audio clips show normalized waveform peaks. Stereo sources can show mirrored
channels; mono sources show one centered waveform.

Track headers show the type icon, label, link indicator, visibility, and the
existing track actions. Linked video and audio rows remain adjacent by default
so the relationship is easy to understand.

## Link and unlink actions

The user can link two compatible tracks explicitly:

1. Select a video track and an audio track.
2. Choose `Link tracks` from the track action area or context menu.
3. Confirm the relationship when both tracks already contain clips.
4. The host creates a link object and assigns its `linkId` to both tracks.

Unlinking removes the relationship while keeping both tracks, clips, and
timeline positions. A chain button, context menu action, and keyboard command
can expose the operation.

The UI rejects or explains incompatible links and makes the linked state
visible before any linked edit is performed.

## Events and controlled updates

The existing `clip-change` event remains the canonical edit event. Linked edit
details add the relationship and playback information:

```js
{
    type: 'resize',
    clipId: 'camera-video-clip',
    linked: true,
    linkId: 'camera-av',
    linkedTrackIds: ['camera-video', 'camera-audio'],
    playbackRate: 1.25,
    audioMode: 'preserve-pitch',
    tracks: [...],
    links: [...],
}
```

Additional events can cover explicit relationship and analysis changes:

| Event | Purpose |
| --- | --- |
| `link-tracks` | Request a link between compatible tracks. |
| `unlink-tracks` | Remove a link while keeping the tracks. |
| `linked-track-change` | Report a linked edit transaction. |
| `media-analysis-change` | Report analysis loading, readiness, or failure. |

Events include complete controlled `tracks` and `links` snapshots. The host
remains responsible for applying the update.

## Acceptance criteria

- Video clips can render Mediabunny-produced thumbnail metadata.
- Audio clips can render Mediabunny-produced waveform peak metadata.
- Compatible tracks can be linked and unlinked explicitly.
- Linked move, trim, split, and delete operations preserve synchronization.
- Resizing a linked clip calculates one shared playback rate from source and
  timeline duration.
- Mediabunny can play active video, audio, and linked audio/video clips.
- Analysis and playback resources are released when no longer active.
- Existing typed tracks and controlled timeline behavior remain compatible.
