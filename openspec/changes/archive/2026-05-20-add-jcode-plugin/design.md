## Context

The starting point is `journal_code.scrpt`, a snippet pasted into Zotero's Run-JavaScript console. Zotero 6 reached end-of-life in February 2024, so the modern plugin model — a bootstrapped extension with `manifest.json` + `bootstrap.js`, no XUL overlays — is the only target we need to consider. The `journal_titles.tsv` file (~700 rows, columns `abbreviation\ttitle\tshorttitle`) is small enough to bundle. The user is the sole author and consumer; the plugin is not aimed at the Zotero plugin gallery.

This change is being executed in TDD style: every behavior the spec pins down is first encoded as a failing `node --test` assertion, then satisfied by the smallest implementation.

## Goals / Non-Goals

**Goals:**

- Replace the paste-the-snippet workflow with a one-click / one-shortcut action.
- Make every spec requirement that can be expressed as a pure function executable as a unit test, with no Zotero runtime needed for the test loop.
- Keep the source readable end-to-end with no transpiler, no `node_modules`, and no third-party plugin frameworks.
- Preserve all non-`jcode:` content in the `Extra` field exactly as the user wrote it.
- Survive bad input (missing publication title, unknown journal, malformed TSV row) without aborting the batch.

**Non-Goals:**

- Zotero 6 support (EOL, not worth the legacy XUL/install.rdf path).
- Localization beyond `en-US` for the first release (the FTL file is wired up, but additional locales aren't promised).
- A custom abbreviation editor inside Zotero — the user maintains the TSV out-of-band; the preference just points the plugin at it.
- Auto-update / Mozilla AMO publishing.

## Decisions

### D1. Bootstrapped extension, not XUL overlay

`manifest.json` + `bootstrap.js` is the only model Zotero 7+ supports for new plugins. No alternative was considered.

### D2. Bundled TSV with optional override preference

The TSV ships in the `.xpi` so the plugin works immediately after install. A single preference (`extensions.zotero.jcode.tsvPath`) lets the user point at a self-maintained file. Rejected alternatives:

- *Bundled-only* — every table edit needs a new `.xpi` build and reinstall.
- *External-only* — plugin is useless until configured; bad first-run UX.

### D3. Vanilla JS + manual DOM injection (no `zotero-plugin-toolkit`)

The plugin needs exactly one menu item, one keyset entry, and one preferences pane. The toolkit's API surface and Node-tooling cost (TypeScript, esbuild, `node_modules`) outweighs its benefit at this scale. The bootstrap glue stays small enough to read in one sitting.

### D4. Skip + summarize unmatched items

The original snippet crashed on the first `.find()` miss and stopped mid-batch. The new behavior:

- Items with empty `publicationTitle` → counted as `no-title`, skipped silently.
- Items with a `publicationTitle` not present in the lookup → counted as `no-match`, the title is captured into a list shown in the summary so the user can extend the TSV.
- Successfully tagged items → counted as `updated`.

The summary is shown via `Zotero.ProgressWindow` so it doesn't block the UI.

### D5. Pure/glue split for TDD

This is the load-bearing decision for the methodology constraint. The pure layer (`addon/content/jcode-core.js`, ESM) holds:

- `parseTsv(text) → { rows, warnings }`
- `buildLookup(rows) → Map<title, abbreviation>`
- `mergeJcodeIntoExtra(extra, abbreviation) → string`
- `classifyItem({ publicationTitle, extra }, lookup) → { kind, ... }`
- `buildSummaryMessage({ updated, noMatch, noTitle, unmatchedTitles }) → { title, body }`
- `shouldShowMenu(selectedCount) → boolean`

The glue layer (`addon/content/jcode.js` + `addon/bootstrap.js`) does only what touches Zotero, Mozilla, or the filesystem: pref reads, `Zotero.File.getContentsAsync` / `fetch(rootURI + …)`, `setField` + `saveTx`, menu/keyset insertion, `ProgressWindow`. Glue is short enough to be reviewed by reading; it is **not** unit-tested in this project.

Per-requirement test mapping (which test file proves which spec requirement):

| Spec requirement | Pure-layer coverage | Glue verified by |
| --- | --- | --- |
| 1. Tag selected items | `classifyItem.test.js`, `mergeJcodeIntoExtra.test.js` | manual happy-path step |
| 2. Replace, don't duplicate | `mergeJcodeIntoExtra.test.js` | manual repeat-run step |
| 3. Skip unmatched | `classifyItem.test.js` | manual no-match + no-title steps |
| 4. Bundled + override | (none — pure code can't observe filesystem) | manual override-pref step |
| 5. TSV format contract | `parseTsv.test.js` | — |
| 6. Context menu | `shouldShowMenu` test in `classifyItem.test.js` | manual menu-visibility step |
| 7. Keyboard shortcut | (none — XUL `<key>` is glue-only) | manual shortcut step |
| 8. Summary feedback | `buildSummaryMessage.test.js` | manual happy/no-match-mix step |
| 9. Preferences pane | (none) | manual settings-pane step |
| 10. Lifecycle hygiene | (none) | manual disable/re-enable step |

### D6. `node --test`, no `node_modules`

Built-in Node test runner (Node ≥ 18) covers everything we need (suites, subtests, `node:assert/strict`, async). `package.json` exists only to set `"type": "module"` and provide `npm test`. There is no install step.

## Risks / Trade-offs

- **Glue is untested in this repo.** Mitigation: keep glue thin and explicitly enumerate its manual checks in `README.md` and the verification section of this change. If the glue grows, introduce a fake-Zotero stub and test it.
- **Bundled TSV becomes stale relative to the user's master copy.** Mitigation: the override preference is the documented escape hatch; the bundled file is treated as a sane default, not the source of truth.
- **Zotero internal APIs change between point releases.** Mitigation: pin a `strict_min_version` in `manifest.json` and keep the surface area tiny (one menu, one keyset, one prefs pane).
- **Keyboard shortcut may collide with another plugin.** Mitigation: the shortcut is delivered in the keyset, which the user can override by editing it post-install; document this in `README.md`.
- **`Map<title, abbreviation>` is exact-match.** Items whose `publicationTitle` differs from the canonical title by even a trailing period or capitalization will be classified `no-match`. We accept this for the first cut — the summary surfacing the unmatched titles makes the gap visible and easy to fix in the TSV.
