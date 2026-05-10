## Why

The repo currently ships `journal_code.scrpt`, a 33-line snippet the user must paste into Zotero's Tools → Run JavaScript console every time they want to tag selected items with a journal abbreviation. The path to the lookup TSV is hardcoded for one machine, the script aborts on the first item whose `publicationTitle` is unknown, and there is no way to bind the action to a menu or shortcut. We want a real, distributable Zotero 7+ plugin that does the same job reliably and is verified by an executable test suite.

## What Changes

- Introduce a Zotero 7+ bootstrapped extension (`addon/manifest.json` + `addon/bootstrap.js`) packaged as `zotero-jcode.xpi` via a two-line `build.sh`.
- Add a "Add Journal Code" entry to the items-pane right-click menu and bind a default keyboard shortcut (Ctrl+Alt+J / Cmd+Alt+J on macOS).
- Bundle the existing `journal_titles.tsv` inside the `.xpi`; allow the user to override the lookup file via the `extensions.zotero.jcode.tsvPath` preference, exposed in a one-field preferences pane.
- Make the action survive unknown publication titles: skip the item, keep going, and surface a Zotero `ProgressWindow` summary at the end (`<N> updated, <M> skipped (no match), <K> skipped (no publication title)`).
- Replace existing `jcode:` lines in the Extra field in place rather than risking duplicates; preserve all other Extra content verbatim.
- Split the implementation into a pure-logic core (`addon/content/jcode-core.js`, ESM) and a thin Zotero adapter (`addon/content/jcode.js` + `addon/bootstrap.js`) so every behavior in the spec can be driven by `node --test` unit tests with no Zotero runtime dependency.
- Retire `journal_code.scrpt` and the `old-do-not-use/` directory once the plugin replaces them; move `journal_titles.tsv` into `addon/data/`.

## Capabilities

### New Capabilities

- `jcode-tagging`: tagging Zotero items in the user's library with the journal-code (`jcode:` line in the Extra field) derived from a configurable abbreviation table, including the menu/shortcut surfaces, the lookup-table loading rules, and the user-visible summary feedback.

### Modified Capabilities

(None — greenfield project.)

## Impact

- **New code**: `addon/` (manifest, bootstrap, content scripts, prefs, locale, data), `test/` (Node `--test` suite with fixtures), top-level `package.json`, `build.sh`, `README.md`.
- **Moved**: `journal_titles.tsv` → `addon/data/journal_titles.tsv`.
- **Removed**: `journal_code.scrpt`, `old-do-not-use/`.
- **Tooling**: depends on Node ≥ 18 for the test runner (no `node_modules` — uses `node --test` and `node:assert/strict` from stdlib). `zip` is required for `build.sh`.
- **Runtime dependencies**: Zotero 7+ only; no third-party plugin frameworks (no `zotero-plugin-toolkit`).
