# ARG27 Program Tracker

React 19, TypeScript, Vite and Tailwind app for Cornell Racing tasks. This version uses a **browser-local mock data adapter**, with no server, authentication or Google Sheets integration.

```bash
npm ci
npm run dev
npm test
npm run build
npm run lint
```

Use Node 22.12+ (validated with Node 24). Run commands from this directory, `arg27-tracker/`.

- **Overview:** task status charts, attention queue, upcoming work, dependency blockers, independent goals and timeline with zoom/print.
- **Tasks:** searchable list with inline edits and a status board with drag/drop. Filters operate on actual task owners.
- **Part Designs:** confirm each design’s default designer. Existing task owners are never reassigned when this changes.
- **Goals:** independent subteam outcomes with declared status, success metric and notes.
- **Team load / Data health:** task assignment and field/reference checks.

The shared **Subteam → Part Design** selector scopes the views. Changing subteam clears the selected design. Selecting a design includes its tasks regardless of owner. Goals remain scoped by subteam because they have no design/task relationship.

**New task** works from the full-team view and from individual subteams/designs. The form preselects the current scope. Selecting a design prefills Owner from its confirmed designer; Owner can be overridden or cleared. Selecting a different design reapplies that design’s default. Opening, typing, Cancel, backdrop dismissal and Escape never write a task or consume an ID. Only **Save task** validates and creates a record.

Task statuses are **Blocked, Not Started, In Progress, In Review, Completed**. Existing task IDs are preserved, and new IDs follow `SUBTEAM_DESIGN_T###`. IDs, subteam and part design are locked after creation. The mock allocates IDs against its latest snapshot and retains high-water marks across deletion, undo and reload. It does not provide shared editing or cross-tab/server concurrency guarantees.

Task dependencies can be edited in the drawer. New missing references and cycles are rejected, and deleting a referenced task is blocked until inbound dependencies are removed.

See [MIGRATION.md](MIGRATION.md) for schema changes, legacy-data recovery and the restored Unsprung subteam.

## Code and validation

`src/lib/adapter.ts` defines the replaceable `DataAdapter` interface and browser-local implementation. `StoreProvider` accepts an adapter for tests. `domain.ts` contains draft creation/defaults and shared filtering; `migrate.ts` is the compatibility boundary for legacy input. Views use canonical data rather than the raw fixture.

`npm test` runs domain and UI regression tests covering all 221 imported IDs and dependency references, owner defaults/overrides, unchanged existing owners, ID allocation/reload/undo/deletion, cascading filters, cancellation, confirmation, list/board/timeline behavior and dashboard rendering.

The original seed is preserved unchanged at `fixtures/legacy-seed.json`; the active `src/data/seed.json` is canonical v3 mock data with no removed records or links. `scripts/build-seed.py` and `scripts/legacy/importXlsx.ts` are historical import references; the latter is excluded from the runtime and no longer installed with the app. Importing workbooks is deliberately absent from this mock workflow.
