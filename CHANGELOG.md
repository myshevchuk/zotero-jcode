# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-05-20 - Initial release

### Added

- Items-pane right-click entry **Add Journal Code** that writes a
  `jcode: <abbreviation>` line into Zotero's **Extra** field for each
  selected item, looking the abbreviation up from a TSV by
  `publicationTitle`.
- Default keyboard shortcut **Ctrl+Alt+J** (**Cmd+Alt+J** on macOS)
  bound to the same action.
- Bundled `journal_titles.tsv` carrying the journal-abbreviation table
  the original `journal_code.scrpt` snippet shipped with.
- Preferences pane (**Edit → Settings → Journal Code**) with a Browse
  button to select a custom override TSV and a Reset button to revert
  to the bundled table. The override path lives in the
  `extensions.zotero.jcode.tsvPath` preference; the cache invalidates
  immediately on change (no Zotero restart required).
- In-place `jcode:` replacement: re-running the action on the same
  item updates the existing line rather than duplicating; every other
  line in Extra is preserved verbatim.
- Tolerant TSV parser: BOM, CRLF, blank lines, and extra columns
  (`shorttitle`, etc.) are accepted; rows missing required columns
  are skipped with a debug-log warning rather than aborting the load.
- Skip-without-abort semantics: items with no `publicationTitle` or
  no matching row are counted and reported; the batch continues.
- Per-run summary line written to the Zotero debug log:
  `<N> updated, <M> skipped (no match), <K> skipped (no publication
  title)`, including the unmatched titles. Surfacing the summary as a
  user-visible popup is deferred to a future release as an opt-in
  preference.
- Menu visibility hook that hides the entry when nothing is selected.
- Lifecycle hygiene: disabling the plugin removes the menu entry, the
  keyset, the cached lookup, and the pref pane; re-enabling without a
  Zotero restart does not produce duplicate entries.
- MIT license.

[Unreleased]: https://github.com/myshevchuk/zotero-jcode/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/myshevchuk/zotero-jcode/releases/tag/v1.0.0
