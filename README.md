# zotero-jcode

A Zotero 7+ plugin that tags selected library items with a `jcode:` line
in the **Extra** field, looking up the abbreviation from a tab-separated
journal table.

## Why

The repo started as a 33-line snippet (`journal_code.scrpt`) pasted into
**Tools → Run JavaScript**. That works once but stops the moment a
journal title isn't in the table — and you lose any unsaved batch.
This plugin does the same job from a menu / shortcut and skips unknowns
gracefully; a per-run summary is written to the Zotero debug log.

## Install

```sh
bash build.sh   # produces zotero-jcode.xpi at the repo root
```

In Zotero: **Tools → Plugins → ⚙ → Install Plugin From File…** and pick
the `.xpi`.

## Use

1. Select one or more items in the items pane.
2. Right-click → **Add Journal Code**, or press **Ctrl+Alt+J**
   (**Cmd+Alt+J** on macOS).
3. Each matched item gains a `jcode:` line in its **Extra** field
   (visible in the right-hand item details pane). Items whose
   `publicationTitle` has no row in the table, or no `publicationTitle`
   at all, are skipped without aborting the batch.

A per-run summary line (`<N> updated, <M> skipped (no match), <K>
skipped (no publication title)` and any unmatched titles) is written
to the Zotero debug log — enable **Help → Debug Output Logging** to
see it. Surfacing the summary as a popup is on the roadmap as an
opt-in preference (see
`openspec/changes/add-jcode-plugin/proposal.md` → Deferred).

The plugin **replaces** an existing `jcode:` line in `Extra` rather than
duplicating it, and preserves every other line verbatim.

## Custom journal table

By default the plugin uses the bundled `data/journal_titles.tsv`. To
override:

1. Open **Edit → Settings → Journal Code**.
2. Browse to your own TSV file.

The TSV must be tab-separated with at least an `abbreviation` column and
a `title` column on the header row. Extra columns (e.g. `shorttitle`)
are ignored. To go back to the bundled table, click **Reset to bundled
default**.

## Develop

This is a TDD project. Pure logic lives in `addon/content/jcode-core.js`
and is unit-tested with the Node stdlib `--test` runner — no
`node_modules`:

```sh
npm test
```

The Zotero glue (`addon/bootstrap.js`, `addon/content/jcode.js`) is
verified by hand against a real Zotero install. For an iteration-fast
loop, `bash dev-install.sh` writes a Mozilla **proxy file** at
`<profile>/extensions/jcode@zotero-jcode.local` that points at this
repo's `.build/` directory. After the one-time setup, each iteration
is `bash build.sh` plus a Zotero restart — no `.xpi` install. The
checklist:

1. `npm test` is green.
2. `openspec validate --specs` passes (validates the live capability
   spec; while a change proposal is in flight, also run
   `openspec validate <change-name> --strict`).
3. `bash build.sh` produces the `.xpi`; `unzip -l zotero-jcode.xpi`
   shows files at the **archive root** (no `addon/` prefix).
4. Install the `.xpi`. The plugin appears as **Journal Code**, enabled.
5. Select an item with `publicationTitle = "Amino Acids"`. Right-click
   → **Add Journal Code**. The Extra field gains `jcode: AA`. Repeat;
   no duplicate appears. Press **Ctrl+Alt+J**; same outcome.
6. Add `DOI: 10.1/x` and `tex.note: foo` to an Extra field, then run
   the action — only the `jcode:` line is modified.
7. Select an item with an unknown `publicationTitle`; its `Extra`
   field is **not** modified and the debug log contains a line
   `0 updated, 1 skipped (no match), 0 skipped (no publication title)`
   together with the unknown title. Mix matched + unmatched items in
   one selection — the batch does **not** abort.
8. Select an item with an empty `publicationTitle`; the debug log
   counts it as `skipped (no publication title)` and the item is
   unchanged.
9. Set the override path to a tiny custom TSV; the plugin uses it.
   Clear it (Reset); the bundled file is used again.
10. Disable + re-enable the plugin from the Plugins window without
    restarting Zotero. The menu entry is present exactly once and the
    shortcut still works. Uninstall — the entry is gone.

## Spec

The behaviour pinned down by the test suite is also documented as an
OpenSpec capability at `openspec/specs/jcode-tagging/spec.md`. The
initial change that introduced it lives archived under
`openspec/changes/archive/2026-05-20-add-jcode-plugin/`. Any future
modification to plugin behaviour should be authored as a new change
proposal against the now-canonical spec
(`openspec change add <name>`, then `openspec archive <name>` once
manual checks pass).
