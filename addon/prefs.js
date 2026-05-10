// Default preferences. Loaded by bootstrap.js at startup so that
// `Zotero.Prefs.get('extensions.zotero.jcode.tsvPath')` returns the empty
// string until the user sets a custom path via the Settings pane.
//
// Per spec requirement 4, an unset / empty / unreadable path falls back to
// the bundled `data/journal_titles.tsv` inside the .xpi.

pref("extensions.zotero.jcode.tsvPath", "");
