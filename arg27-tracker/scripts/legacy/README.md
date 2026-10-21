# Historical import source

`importXlsx.ts` is preserved from the uploaded prototype for one-time migration reference. It depends on the old types and XLSX parser and is intentionally outside the compiled application. Do not reconnect it to the runtime: it emits the removed schema.

The supported compatibility converter is `src/lib/migrate.ts`, exercised against the unchanged original `fixtures/legacy-seed.json` and v2 browser datasets. The original workbook remains in the user-supplied ZIP. No runtime Google Sheets or XLSX integration is included.
