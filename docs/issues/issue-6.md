# Issue 6: Group timeline tracks

This document describes the proposed product and interaction design for
[GitHub issue #6](https://github.com/lgs1920/timeline/issues/6). It covers the
data model, visual presentation, available actions, and the compact-toolbar
behavior discussed for grouped tracks.

## Goal

The timeline currently presents tracks as one flat list. A production with
several camera, audio, overlay, or auxiliary tracks becomes easier to scan when
related tracks can be collected under a named group.

Grouping is a presentation and organization feature. Each track keeps its own
identity, clips, editing rules, slots, selection state, and events.

## Data model

Groups are controlled data because the timeline is a controlled component. A
host can provide an ordered `groups` collection and assign tracks to a group by
its stable identifier.

```js
timeline.groups = [
    {
        id: 'camera',
        label: 'Camera',
        icon: 'video',
        colorClasses: ['wa-neutral-blue'],
        collapsed: false,
    },
    {
        id: 'audio',
        label: 'Audio',
        icon: 'music',
        colorClasses: ['wa-neutral-green'],
        collapsed: true,
    },
]

timeline.tracks = [
    {
        id: 'camera-main',
        label: 'Main camera',
        icon: 'video',
        groupId: 'camera',
        clips: [],
    },
    {
        id: 'camera-close-up',
        label: 'Close-up',
        icon: 'video',
        groupId: 'camera',
        clips: [],
    },
    {
        id: 'voice',
        label: 'Voice-over',
        icon: 'microphone',
        groupId: 'audio',
        clips: [],
    },
    {
        id: 'markers',
        label: 'Markers',
        icon: 'flag',
        groupId: null,
        clips: [],
    },
]
```

The proposed public fields are:

| Object | Field | Purpose |
| --- | --- | --- |
| Group | `id` | Stable identifier used by tracks and events. |
| Group | `label` | Name displayed in the group header. |
| Group | `icon` | Optional Font Awesome icon displayed beside the label. |
| Group | `colorClasses` | Optional Web Awesome color classes used by the group header and summary row. |
| Group | `collapsed` | Controlled expanded or collapsed state. |
| Track | `groupId` | Group identifier, or `null` for an ungrouped track. |
| Track | `icon` | Optional Font Awesome icon displayed beside the track label. |

Group colors apply to the group header, its collapse control, and its compact
timeline summary. They can also provide a quiet background tint for the
grouped rows. Clip colors remain authoritative for individual clips.

The order of `groups` controls the order of group sections. The order of tracks
with the same `groupId` controls their order inside that group. Ungrouped tracks
remain available and retain their supplied order according to the final layout
policy.

Empty groups are valid. They are useful as drop targets and can be removed by
the user. A group containing one or more tracks cannot be removed until those
tracks have been moved to another group or made ungrouped.

## Expanded UI

An expanded group has one colored header followed by its individual track
rows. The header spans the fixed legend and the timeline surface so that the
hierarchy stays aligned while the timeline scrolls horizontally.

```text
▾  CAMERA · 2 tracks       │────────────────────────────────│
   Main camera             │── Intro ───── Scene ──────────│
   Close-up                │──────── Detail ──────────────│

▾  AUDIO · 1 track         │────────────────────────────────│
   Voice-over              │──── Narration ────────────────│

   Markers                 │──── Marker ───────────────────│
```

The group header contains:

- a collapse or expand button;
- the optional group icon;
- the group label;
- the number of member tracks;
- the group color indicator;
- the group actions menu when editing is enabled.

Track rows keep their existing label, icon, visibility, selection, context
menu, clip handles, and drag behavior. The group header does not replace the
track rows or absorb their track-level actions.

## Collapsed UI

When a group is collapsed, its individual rows are hidden and the group remains
visible as one compact summary row:

```text
▸  CAMERA · 2 tracks       │──▮▮──────▮──────│
```

The summary row shows the time positions of the member clips as small colored
blocks. It also keeps the playhead, selected range, and group color visible.
Clip labels, trim handles, and track-level controls are hidden in this mode.
The summary is an overview and is not a direct clip editing surface; expanding
the group exposes the editable track rows again.

The collapsed header remains a valid drop target for assigning a track to the
group.

## Group actions

The group context menu or action control can expose:

1. Edit the group label.
2. Choose or change the group icon.
3. Choose or change the group color.
4. Collapse or expand the group.
5. Reorder the group when group reordering is enabled.
6. Remove the group when it has no member tracks.

The remove action is hidden or disabled for a non-empty group, with a message
that the group must be emptied first. Removing a group never removes its
tracks. The host must first move those tracks to another group or clear their
`groupId`.

Track actions remain available at track level. A track can be edited, hidden,
removed, reordered, or moved between groups without changing the identity of
its clips.

## Drag and drop between groups

Adding a track to a group is performed by drag and drop:

1. Start dragging a track from its legend area.
2. Drag it over a group header or a collapsed group summary.
3. Show the group color and a drop indicator while the target is valid.
4. Drop the track to assign its `groupId` to the target group.
5. Insert the track at the end of the target group unless a precise insertion
   position is indicated.

Dragging a track out of a group can drop it onto another group or onto the
ungrouped area. The operation changes group membership and preserves the
track's stable id, clips, metadata, and track-level configuration.

The host remains the source of truth. The accepted event contains the complete
controlled groups and tracks snapshots so the host can persist or reject the
assignment.

## Add controls

The current single `Add track` control becomes a vertical button group with:

- `Add track`;
- `Add group`.

Each action can expose an icon through its slot or configured icon name. The
default icons should make the distinction clear, such as `plus` or `film` for
`Add track` and `folder-plus` or `layer-group` for `Add group`.

In the compact toolbar, the two visible buttons are replaced by a single plus
button. Activating the plus button opens the same vertical button group as a
popover or anchored menu. The menu closes after an action is selected or when
the user clicks outside it.

Adding a group creates an empty group and makes it immediately available as a
drop target. Adding a track creates an ungrouped track unless the host supplies
an explicit target group or the action is launched from a group context.

## Events and controlled updates

The grouping feature should follow the existing namespaced event lifecycle and
controlled update model. The proposed event suffixes are:

| Event | Purpose |
| --- | --- |
| `add-group` | Request creation of an empty group. |
| `group-label-change` | Request a group label change. |
| `group-color-change` | Request a group color change. |
| `group-icon-change` | Request a group icon change. |
| `group-collapse-change` | Request an expanded or collapsed state change. |
| `remove-group` | Request removal of an empty group. |
| `track-group-change` | Request assignment of a track to a group or to the ungrouped area. |
| `group-reorder` | Request a change to group order, if group reordering is enabled. |

Events should include the affected identifier, the previous value where
relevant, the resulting `groups` and `tracks` snapshots, and the complete
controlled data snapshot. Cancelable `before` and `after` hooks should use the
same suffixes as other editable actions.

Existing track, clip, drag, selection, and playback events keep their current
meaning. Grouping must not require application-specific track or clip names.

## Accessibility and responsive behavior

Group headers use a button for collapse and expansion with `aria-expanded` and
an accessible label containing the group name. The compact summary has an
accessible name that identifies the group and its track count. Drag targets
must also expose a keyboard path for moving a focused track into a selected
group.

The vertical Add button group must remain usable at narrow widths. Its compact
plus trigger needs an accessible label such as `Add timeline item`, and the
opened menu must expose separate labels for `Add track` and `Add group`.

## Acceptance criteria

- A host can provide ordered groups and assign tracks with `groupId`.
- Group headers have optional icons and a distinct configurable color.
- Expanded groups show their member track rows in the legend and timeline.
- Collapsed groups show a compact clip overview row and remain valid drop
  targets.
- A track can be assigned to a group by dragging it onto the group header.
- A group can be removed only when it has no member tracks.
- The existing Add track action becomes a vertical Add track/Add group button
  group, with a compact plus trigger that opens it.
- Tracks and groups can display optional icons.
- Ungrouped tracks keep the current behavior.
- Existing controlled updates, events, slots, selection, editing, and playback
  behavior remain compatible.
- The README, specification, demo, and regression tests document and cover the
  final implementation.
