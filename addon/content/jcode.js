// Zotero adapter for the Journal Code plugin. Bridges the pure helpers in
// jcode-core.js to the Zotero runtime (file I/O, preferences, item I/O,
// progress UI). This file holds every reference to `Zotero.*`; the rest of
// the source tree is testable in plain Node.

import { parseTsv, buildLookup, classifyItem, buildSummaryMessage } from "./jcode-core.js";

const PREF_TSV_PATH = "extensions.zotero.jcode.tsvPath";
const BUNDLED_TSV = "data/journal_titles.tsv";

let cachedLookup = null;

export function invalidateLookupCache() {
  cachedLookup = null;
}

async function readTsvText(rootURI) {
  const overridePath = Zotero.Prefs.get(PREF_TSV_PATH, true) || "";
  if (overridePath) {
    try {
      return await Zotero.File.getContentsAsync(overridePath);
    } catch (err) {
      Zotero.debug(
        `[jcode] override TSV at "${overridePath}" unreadable, ` +
          `falling back to bundled: ${err}`,
      );
    }
  }
  return await Zotero.File.getContentsAsync(rootURI + BUNDLED_TSV);
}

export async function loadLookup(rootURI) {
  if (cachedLookup) return cachedLookup;
  const text = await readTsvText(rootURI);
  const { rows, warnings: parseWarnings } = parseTsv(text);
  const { lookup, warnings: lookupWarnings } = buildLookup(rows);
  for (const w of [...parseWarnings, ...lookupWarnings]) {
    Zotero.debug(`[jcode] ${w}`);
  }
  cachedLookup = lookup;
  return lookup;
}

export async function run(window, rootURI) {
  try {
    const lookup = await loadLookup(rootURI);
    const items = window.ZoteroPane.getSelectedItems();

    let updated = 0;
    let noMatch = 0;
    let noTitle = 0;
    const unmatchedTitles = [];

    for (const item of items) {
      const result = classifyItem(
        {
          publicationTitle: item.getField("publicationTitle"),
          extra: item.getField("extra"),
        },
        lookup,
      );

      switch (result.kind) {
        case "updated":
          item.setField("extra", result.nextExtra);
          await item.saveTx();
          updated += 1;
          break;
        case "no-match":
          noMatch += 1;
          unmatchedTitles.push(result.publicationTitle);
          break;
        case "no-title":
          noTitle += 1;
          break;
      }
    }

    const summary = buildSummaryMessage({
      updated,
      noMatch,
      noTitle,
      unmatchedTitles,
    });
    showProgress(summary);
  } catch (err) {
    Zotero.debug(`[jcode] run() failed: ${err}\n${err.stack ?? ""}`);
    showProgress({
      title: "Journal Code",
      body: `Failed: ${err.message ?? err}`,
    });
  }
}

function showProgress({ title, body }) {
  const pw = new Zotero.ProgressWindow({ closeOnClick: true });
  pw.changeHeadline(title);
  for (const line of body.split("\n")) {
    new pw.ItemProgress(null, line).setProgress(100);
  }
  pw.show();
  pw.startCloseTimer(8000);
}
