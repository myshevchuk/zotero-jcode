// Pure logic for the zotero-jcode plugin. No references to Zotero, Mozilla
// globals, the filesystem, or the network. Tested by `node --test` under
// `test/`. The Zotero adapter (`addon/content/jcode.js`) imports from here.

const REQUIRED_COLUMNS = ["abbreviation", "title"];
const BOM = "﻿";

function stripBom(text) {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

export function parseTsv(text) {
  const lines = splitLines(stripBom(text));
  const headerLine = lines.find((line) => line.length > 0);

  if (headerLine === undefined) {
    throw new Error(
      "parseTsv: input has no header row (expected tab-separated " +
        REQUIRED_COLUMNS.join(", ") +
        ")",
    );
  }

  const headers = headerLine.split("\t");
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      throw new Error(
        `parseTsv: header is missing required column "${required}"`,
      );
    }
  }

  const rows = [];
  const warnings = [];
  let headerSeen = false;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber += 1;
    if (line.length === 0) continue;
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }

    const values = line.split("\t");
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? "";
    }

    const missing = REQUIRED_COLUMNS.find((col) => !row[col]);
    if (missing) {
      warnings.push(
        `parseTsv: line ${lineNumber} skipped — missing or empty "${missing}"`,
      );
      continue;
    }

    rows.push(row);
  }

  return { rows, warnings };
}

export function buildLookup(rows) {
  const lookup = new Map();
  const warnings = [];

  for (const row of rows) {
    const { title, abbreviation } = row;
    if (lookup.has(title)) {
      warnings.push(
        `buildLookup: duplicate title "${title}" — using "${abbreviation}" ` +
          `and discarding earlier "${lookup.get(title)}"`,
      );
    }
    lookup.set(title, abbreviation);
  }

  return { lookup, warnings };
}
