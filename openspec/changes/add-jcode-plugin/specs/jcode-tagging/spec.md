## ADDED Requirements

### Requirement: Tag selected items with journal code

The plugin SHALL, when the user invokes the action via the items-pane context menu or the keyboard shortcut, look up each selected Zotero item's `publicationTitle` in the configured journal table and write `jcode: <abbreviation>` into the item's `Extra` field via `setField('extra', …)` followed by `await item.saveTx()`.

#### Scenario: Single matched item gains a jcode line

- **WHEN** the user selects one item whose `publicationTitle` is `"Amino Acids"` and the loaded table maps that title to abbreviation `"AA"`
- **THEN** after the action completes, the item's `Extra` field contains the line `jcode: AA`

#### Scenario: Batch of matched items all get tagged

- **WHEN** the user selects three items whose publication titles all appear in the table
- **THEN** all three items receive their respective `jcode:` line and are persisted via `saveTx`

### Requirement: Replace existing jcode line in place

The plugin SHALL, when an item's `Extra` field already contains one or more lines starting with `jcode:` (case-sensitive prefix at line start), replace the FIRST such line with the new `jcode: <abbreviation>` value and leave any subsequent `jcode:` lines untouched. All non-`jcode:` lines MUST be preserved verbatim, in order.

#### Scenario: Existing jcode line is overwritten

- **WHEN** an item's `Extra` field is `"DOI: 10.1/x\njcode: OLD\ntex.note: foo"` and the new abbreviation is `"NEW"`
- **THEN** the resulting `Extra` field is `"DOI: 10.1/x\njcode: NEW\ntex.note: foo"`

#### Scenario: No existing jcode line is appended

- **WHEN** an item's `Extra` field is `"DOI: 10.1/x"` and the new abbreviation is `"NEW"`
- **THEN** the resulting `Extra` field is `"DOI: 10.1/x\njcode: NEW"`

#### Scenario: Empty Extra field gets a single jcode line

- **WHEN** an item's `Extra` field is the empty string and the new abbreviation is `"NEW"`
- **THEN** the resulting `Extra` field is `"jcode: NEW"`

### Requirement: Skip unmatched items without aborting the batch

The plugin MUST NOT throw or stop the batch when an item has no `publicationTitle` or when its `publicationTitle` has no row in the loaded table. Such items MUST be left unchanged in the library and counted toward the summary report.

#### Scenario: Item with no publication title

- **WHEN** an item has an empty `publicationTitle`
- **THEN** the plugin classifies it as `no-title`, leaves its `Extra` field unchanged, and does not call `saveTx` for it

#### Scenario: Item with unknown publication title

- **WHEN** an item has `publicationTitle = "Made Up Journal"` and that title is absent from the table
- **THEN** the plugin classifies it as `no-match`, leaves its `Extra` field unchanged, and continues processing the remaining selected items

### Requirement: Bundled journal table with optional file override

The plugin SHALL load its journal table from the bundled file at `data/journal_titles.tsv` inside the `.xpi` by default. When the preference `extensions.zotero.jcode.tsvPath` is set to a non-empty string that points to a readable file, the plugin SHALL load that file instead. When the preference is unset, empty, or points to a missing/unreadable file, the plugin SHALL fall back to the bundled file and log a warning.

#### Scenario: Default table comes from the .xpi

- **WHEN** the preference is unset
- **THEN** the plugin reads `data/journal_titles.tsv` from inside the installed `.xpi`

#### Scenario: User-configured override wins

- **WHEN** the preference points to an existing readable TSV file
- **THEN** the plugin reads that file and ignores the bundled copy for this session

#### Scenario: Missing override file falls back to bundled

- **WHEN** the preference points to a path that does not exist
- **THEN** the plugin loads the bundled file and emits a warning to the Zotero debug log

### Requirement: TSV format contract

The plugin SHALL parse tab-separated values where the first non-blank line is a header row whose columns include at least `abbreviation` and `title`. Subsequent rows MUST be parsed as records keyed by those header columns; additional columns (such as `shorttitle`) MUST be tolerated and ignored. Blank lines and a leading byte-order mark MUST be ignored. Both LF and CRLF line endings MUST be accepted. Rows missing either required column MUST be skipped and reported as warnings without aborting the parse.

#### Scenario: Well-formed table parses to lookup map

- **WHEN** the input is a header `abbreviation\ttitle\tshorttitle` followed by one row `AA\tAmino Acids\tAmino Acids`
- **THEN** parsing yields one row record and a lookup `Map` with entry `"Amino Acids" → "AA"`

#### Scenario: BOM and CRLF endings are tolerated

- **WHEN** the input begins with `﻿` and uses CRLF line endings
- **THEN** parsing succeeds and the BOM is not part of the first column name

#### Scenario: Row missing a required column is skipped with a warning

- **WHEN** the input contains a header `abbreviation\ttitle` and a data row `AA` (only one column)
- **THEN** parsing returns zero records and one warning describing the malformed row

### Requirement: Items-pane context-menu integration

The plugin SHALL register a single `<menuitem>` labeled "Add Journal Code" under the items-pane right-click menu (`#zotero-itemmenu`). The entry MUST be visible only when at least one item is selected, and MUST be hidden when zero items are selected.

#### Scenario: Visibility predicate hides menu with zero selection

- **WHEN** zero items are selected
- **THEN** `shouldShowMenu(0)` returns `false`

#### Scenario: Visibility predicate shows menu with non-empty selection

- **WHEN** one or more items are selected
- **THEN** `shouldShowMenu(n)` returns `true` for every `n ≥ 1`

### Requirement: Keyboard shortcut

The plugin SHALL register a `<key>` element on each Zotero main window so that pressing the default shortcut (Ctrl+Alt+J on Linux/Windows, Cmd+Alt+J on macOS) runs the same action as the context-menu entry.

#### Scenario: Default shortcut is wired

- **WHEN** the plugin starts up
- **THEN** the keyset added to the main window contains a `<key>` whose `oncommand` invokes the same handler as the context-menu item

### Requirement: Summary feedback after batch

After the batch completes (whether triggered from the menu or the shortcut), the plugin SHALL write a summary line to the Zotero debug log containing three counts: number of items updated, number of items skipped because no matching row was found, and number of items skipped because they had no `publicationTitle`. The summary MUST also surface any unmatched titles so the user can correct or extend the table by inspecting the debug log. Surfacing the summary through a user-visible popup is deferred to a future change (see proposal.md → Deferred).

#### Scenario: Mixed-outcome batch reports all three counts

- **WHEN** the batch finishes with 2 updates, 1 no-match, and 1 no-title
- **THEN** the summary line contains `"2 updated, 1 skipped (no match), 1 skipped (no publication title)"` and lists the unmatched title

#### Scenario: All-success batch omits skipped sections gracefully

- **WHEN** the batch finishes with 3 updates and zero skips
- **THEN** the summary line reports `"3 updated"` and does not produce confusing zero-count clauses

### Requirement: Preferences pane

The plugin SHALL register a preferences pane (via `Zotero.PreferencePanes.register`) showing one labeled text input bound to `extensions.zotero.jcode.tsvPath`, a "Browse…" button that opens a file picker writing to the same preference, and a "Reset to bundled default" button that clears the preference.

#### Scenario: Preferences pane appears in Zotero settings

- **WHEN** the user opens Zotero → Edit → Settings (or Preferences)
- **THEN** a "Journal Code" pane is listed and renders the three controls described above

### Requirement: Lifecycle hygiene

The plugin's `shutdown` hook MUST remove the registered context-menu item, the registered keyset, the preferences pane registration, and any cached lookup table from every open Zotero window, so that disabling and re-enabling the plugin without restarting Zotero leaves no duplicate entries and no stale data.

#### Scenario: Re-enabling does not duplicate menu entries

- **WHEN** the plugin is disabled and then re-enabled from the Plugins window
- **THEN** the items-pane context menu contains exactly one "Add Journal Code" entry
