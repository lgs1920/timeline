# Project rules

These are the project rules for the standalone LGS1920 Timeline Web Component.

## 1. Core directives

- Conversational responses must be in French.
- Code comments, JSDoc, documentation, and issue content must be in professional English.
- Keep changes focused on the timeline package, its Web Component, React adapter, tests, demo, and release workflow.
- Preserve unrelated uncommitted changes. Never reset, discard, or overwrite user work.
- Do not stage, commit, push, publish, or release unless explicitly requested.
- Do not use semicolons in new or modified source code.
- Use arrow functions for functions, except class constructors.
- Keep new files focused and below 1500 lines.

## 2. Component boundary

- The component is controlled by its host and must not own an application clock, persistence model, domain store, capture session, or external service.
- Keep tracks and clips serializable and domain-neutral. Host metadata may pass through public data fields without being interpreted.
- Preserve the `lgs1920-timeline` custom element name and the `@lgs1920/timeline` package exports.
- Keep public time values in milliseconds and clip `start` and `end` values in seconds as documented.
- Keep Web Component behavior on namespaced DOM events. React-only callbacks belong in the React adapter.
- Release pointer listeners, animation frames, observers, timers, and pointer capture when interaction or connection ends.

## 3. Quality and delivery

- Source files use the LGS1920/timeline copyright header with
  `studio@lgs1920.fr`. The repository pre-commit hook updates headers for
  staged source files and stages those updates automatically.
- Use `bun run headers:check` to verify staged headers without changing files.
- Preserve shebangs and test directives, and never add headers to generated
  output or vendored assets.
- Add deterministic regression coverage for every public behavior change.
- Keep tests isolated and restore timers, DOM globals, observers, event listeners, and captured pointers during cleanup.
- Build generated files from source and never edit `dist/` or generated demo output manually.
- Run focused tests first, then `bun run verify` and `bun run pack:check`.
- Run the demo build when demo behavior or public documentation changes.
- Preview release text before using a release or publication command.
