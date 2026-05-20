// Guards against data-quality regressions in `addon/data/journal_titles.tsv`.
// The bundled TSV is the lookup source for `loadLookup` at runtime; if a
// row's title differs from Zotero's `publicationTitle` even by an escape
// sequence, the lookup misses silently. These tests fail fast on common
// classes of breakage that aren't behavioural bugs in the pure layer.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseTsv, buildLookup } from "../addon/content/jcode-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundledTsvPath = join(here, "..", "addon", "data", "journal_titles.tsv");

test("bundled TSV: no LaTeX-escaped ampersands", async () => {
  const text = await readFile(bundledTsvPath, "utf8");
  assert.equal(
    text.includes("\\&"),
    false,
    "bundled TSV contains '\\&' — Zotero's publicationTitle uses a bare '&', " +
      "so any escaped row can never match an item in the library",
  );
});

test("bundled TSV: every row has the same column count as the header", async () => {
  const text = await readFile(bundledTsvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const headerCols = lines[0].split("\t").length;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t").length;
    assert.equal(
      cols,
      headerCols,
      `line ${i + 1} has ${cols} tab-separated columns; expected ${headerCols}`,
    );
  }
});

test("bundled TSV: known '&' title resolves via buildLookup", async () => {
  const text = await readFile(bundledTsvPath, "utf8");
  const { rows } = parseTsv(text);
  const { lookup } = buildLookup(rows);
  assert.equal(
    lookup.get("ACS Applied Materials & Interfaces"),
    "ACSAMI",
    "bundled TSV should map the bare-ampersand publicationTitle Zotero would carry",
  );
});
