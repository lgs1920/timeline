---
name: timeline-component
description: Implement, test, review, or document the generic lgs1920-timeline Web Component and its optional React adapter.
---

# Timeline component

Use this skill for the reusable timeline package. The public custom element is
`<lgs1920-timeline>`, while the NPM package is `@lgs1920/timeline`.

## Boundaries

- The component is controlled by its host and never owns an application clock,
  persistence model, domain store, capture session, or external service.
- All host interaction crosses the public properties and the
  `lgs1920-timeline-*` DOM event namespace.
- Pointer listeners, animation frames, resize observers, timers, and pointer
  capture must be released when the element disconnects or an interaction ends.
- Track and clip data must remain serializable and domain-neutral. Application
  metadata may pass through public data fields without being interpreted by the
  component.
- The Web Component emits clip double-click behavior through its DOM event.
  `onClipDoubleClick` belongs only to the React adapter.
- Host-specific classes can be supplied through `hostNoDragClass`. The
  component must not contain host application class names or integration
  attributes.

## Public contract

- Keep `durationMillis`, `currentTimeMillis`, `rangeStartMillis`, and
  `rangeEndMillis` in milliseconds at the public boundary.
- Keep clip `start` and `end` values in seconds, as documented by the package
  API.
- Preserve controlled updates, local interaction previews, and the complete
  before/action/after event lifecycle.
- Use generic names such as tracks, clips, host, playback, and timeline. Do
  not add application-specific terms to source, tests, CSS, or documentation.
- Preserve the `lgs1920-timeline` element name when changing the package
  implementation.

## Testing

1. Run the smallest affected Vitest file first.
2. Cover controlled state, event cancellation, pointer and keyboard editing,
   drag and drop, resizing, cleanup, and React callback teardown when those
   paths change.
3. Use fake timers only for behavior controlled by animation frames or a
   scheduler. Do not use arbitrary sleeps.
4. Restore fake timers, DOM globals, observers, event listeners, and captured
   pointers in test cleanup.
5. Run `bun run test`, `bun run lint`, `bun run build`, and
   `bun run test:package` before handoff. Run `bun run demo:build` when the
   demonstration site changes.

## Documentation

Keep package and component documentation in English. Document implemented
behavior, public properties, events, slots, and examples. Keep proposed work
outside the package API documentation.
