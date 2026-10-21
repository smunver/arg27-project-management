# Canonical mock schema (v3)

Removal of the obsolete feature and its data links was reported before removing its view. The uploaded ZIP remains the original source archive; `fixtures/legacy-seed.json` is retained unchanged as the original imported-data fixture. The active `src/data/seed.json` uses the canonical v3 schema.

## Changes and preservation

- Remove the Milestones entity, route, navigation, creation/editing, health rules, import/export UI, timeline lanes and goal/task rollups. Canonical datasets and exports omit milestone records and task links. Their source data remains in the original fixture and the old browser key for recovery.
- Convert each Assembly to a `PartDesign` with a globally unique `id` (`SU_A01`), `subteam`, `subteamCode`, `code`, `name`, `defaultDesigner` and `active`. Tasks reference `partDesignId`; `partDesign` and `designCode` are resolved display fields. Task association is locked after creation.
- Keep **every existing task ID, task owner array, dependency ID, task field and goal ID**. Preserve duplicate-source metadata and goal `sheetId`. Keep imported multi-owner arrays instead of collapsing them to one person or splitting ambiguous name strings.
- Never infer a default designer from imported task owners. All 83 imported designs start Unassigned until confirmed. Use Part Designs to assign defaults; changing a default never changes existing task owners.
- Normalize task `Complete` → `Completed`, and `Planned` or blank → `Not Started`. Other task states retain their names. Goals retain their independent status vocabulary and have no computed task progress.
- The old seed has 13 selectable subteams and 83 design records. Five designs belong to Unsprung, which the old importer excluded because it has no populated tasks/goals. The uploaded workbook’s **References!A14:B14** confirms **Unsprung / UN**. Migration restores this fourteenth subteam and all five `UN_A##` design records. The 221 tasks and 17 goals are unchanged in count.

## Browser storage and recovery

The mock reads `arg27-tracker:v3` when present; otherwise it migrates `arg27-tracker:v2`, or the original seed when neither exists. Migration is idempotent. Writes use the v3 key and **never overwrite/delete the v2 key**. Opening/canceling a task draft does not persist a dataset or reserve an ID. Preferences use a separate subteam key.

The v3 schema is not readable by the old prototype. Export all subteams to JSON before resetting or moving between versions. Existing v2 data can be recovered by backing up v3 and using the old prototype with its untouched v2 key. A fresh browser without v2 still has the original seed fixture; new v3 edits cannot be automatically represented in the old schema.

New task IDs are allocated only on confirmation, after validation. Persisted high-water marks prevent reusing deleted or undone IDs. Explicit **Reset mock data** discards local changes and counters; Undo can restore the previous snapshot. There is no safe Move task operation in this version. Reassignment of existing actual owners remains explicit.

## Scope limits

This is a mock adapter running in one browser context. There is no Sheets write path, backend ID allocator, authenticated sharing, conflict/version handling or framework migration. Multi-user concurrency remains a separate backend task. Runtime imports of the historical XLSX parser are removed, along with its CDN dependency. Its archived source uses the old schema and is provided for migration reference, not as a maintained v3 importer.
