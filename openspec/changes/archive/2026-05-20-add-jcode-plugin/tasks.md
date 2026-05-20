## 1. OpenSpec scaffolding

- [ ] 1.1 `openspec init .` and `openspec new change add-jcode-plugin`
- [ ] 1.2 Author `proposal.md`
- [ ] 1.3 Author `specs/jcode-tagging/spec.md` (10 requirements with WHEN/THEN scenarios)
- [ ] 1.4 Author `design.md` (decisions + per-requirement test mapping)
- [ ] 1.5 `openspec validate add-jcode-plugin --strict` exits 0

## 2. Test harness

- [ ] 2.1 Add `package.json` with `"type": "module"` and `"test": "node --test test/*.test.js"`
- [ ] 2.2 Add `test/fixtures/tiny.tsv` (3 well-formed rows)
- [ ] 2.3 Add `test/fixtures/malformed.tsv` (missing column, blank line, BOM, CRLF)
- [ ] 2.4 Add `test/fixtures/extra-samples.js` exporting empty / jcode-only / mixed Extra strings
- [ ] 2.5 Confirm `npm test` runs and reports "no tests found" (harness is wired)

## 3. Pure layer — TDD per requirement (RED → GREEN → REFACTOR)

### 3a. parseTsv (req 5)

- [ ] 3a.1 RED: write `test/parseTsv.test.js` covering well-formed parse, BOM tolerance, CRLF, blank-line skipping, missing-column warnings, header column contract
- [ ] 3a.2 GREEN: implement `parseTsv` in `addon/content/jcode-core.js`
- [ ] 3a.3 REFACTOR

### 3b. buildLookup (supports req 1, 3)

- [ ] 3b.1 RED: write tests for Map<title,abbreviation>, last-wins on duplicate titles + warning emitted
- [ ] 3b.2 GREEN: implement `buildLookup`
- [ ] 3b.3 REFACTOR

### 3c. mergeJcodeIntoExtra (req 2)

- [ ] 3c.1 RED: write `test/mergeJcodeIntoExtra.test.js` covering: replace existing line in place; append when absent; preserve other lines verbatim; empty-input → single line; CRLF input; multiple `jcode:` lines (only first replaced)
- [ ] 3c.2 GREEN: implement `mergeJcodeIntoExtra`
- [ ] 3c.3 REFACTOR

### 3d. classifyItem (reqs 1, 3)

- [ ] 3d.1 RED: write `test/classifyItem.test.js` covering kind ∈ {updated, no-title, no-match}; `updated` returns `nextExtra`
- [ ] 3d.2 GREEN: implement `classifyItem`
- [ ] 3d.3 REFACTOR

### 3e. buildSummaryMessage (req 8)

- [ ] 3e.1 RED: write `test/buildSummaryMessage.test.js` covering: mixed-outcome counts, all-success batch (no zero-count clauses), unmatched-title list inclusion
- [ ] 3e.2 GREEN: implement `buildSummaryMessage`
- [ ] 3e.3 REFACTOR

### 3f. shouldShowMenu (req 6)

- [ ] 3f.1 RED: tests covering count == 0 → false, count ≥ 1 → true (colocated in `classifyItem.test.js` is fine)
- [ ] 3f.2 GREEN: implement `shouldShowMenu`
- [ ] 3f.3 REFACTOR

### 3g. Suite check

- [ ] 3g.1 `npm test` reports all green; suite is silent on stderr

## 4. Glue layer (manually verified — see §6)

- [ ] 4.1 `addon/manifest.json` (Zotero 7 fields: `applications.zotero.id`, `strict_min_version`, `strict_max_version`, browser_specific_settings)
- [ ] 4.2 `addon/prefs.js` registering default `extensions.zotero.jcode.tsvPath = ""`
- [ ] 4.3 `addon/content/jcode.js` `loadTable(rootURI)` — pref → bundled fallback (req 4)
- [ ] 4.4 `addon/content/jcode.js` `run(window)` calling pure helpers + `setField` + `saveTx` + `Zotero.ProgressWindow`
- [ ] 4.5 `addon/bootstrap.js` startup/shutdown + `Services.wm` window listener (req 10)
- [ ] 4.6 Context-menu insertion via `installIntoWindow(window)` (req 6)
- [ ] 4.7 Keyset / keyboard shortcut wiring (req 7)
- [ ] 4.8 Preferences pane registration: `addon/content/prefs.xhtml` + `Zotero.PreferencePanes.register` call (req 9)
- [ ] 4.9 `addon/locale/en-US/jcode.ftl` with every user-facing string
- [ ] 4.10 `build.sh` (`cd addon && zip -qr ../zotero-jcode.xpi .`) and `README.md` (install + usage + manual-verification checklist)

## 5. Repo cleanup

- [ ] 5.1 Move `journal_titles.tsv` → `addon/data/journal_titles.tsv`
- [ ] 5.2 Delete `journal_code.scrpt`
- [ ] 5.3 Delete `old-do-not-use/`

## 6. Verification

- [ ] 6.1 `npm test` exits 0 with all assertions green
- [ ] 6.2 `openspec validate add-jcode-plugin --strict` exits 0
- [ ] 6.3 `bash build.sh` produces `zotero-jcode.xpi`; `unzip -l zotero-jcode.xpi` shows files at the archive root (no `addon/` prefix)
- [ ] 6.4 (Manual) Install in Zotero 7, exercise menu + shortcut on the matched / no-match / no-title item-shapes from §3 of the spec, confirm the summary popup
- [ ] 6.5 (Manual) Set the override preference to a tiny custom TSV, confirm precedence and fallback
- [ ] 6.6 (Manual) Disable + re-enable the plugin without restarting Zotero, confirm no duplicate menu entries

## 7. Archive

- [ ] 7.1 `openspec archive add-jcode-plugin` (after all manual checks pass)
