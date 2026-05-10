import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseTsv } from "../addon/content/jcode-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const tinyTsvPath = join(here, "fixtures", "tiny.tsv");

test("parseTsv: well-formed input yields rows keyed by header", async () => {
  const text = await readFile(tinyTsvPath, "utf8");
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    abbreviation: "AA",
    title: "Amino Acids",
    shorttitle: "Amino Acids",
  });
  assert.deepEqual(rows[2], {
    abbreviation: "AC",
    title: "Analytical Chemistry",
    shorttitle: "Anal. Chem.",
  });
  assert.deepEqual(warnings, []);
});

test("parseTsv: tolerates a leading BOM on the header row", () => {
  const text = "﻿abbreviation\ttitle\nAA\tAmino Acids\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].abbreviation, "AA");
  assert.equal(rows[0].title, "Amino Acids");
  assert.deepEqual(warnings, []);
});

test("parseTsv: accepts CRLF line endings", () => {
  const text = "abbreviation\ttitle\r\nAA\tAmino Acids\r\nAB\tAstrobiology\r\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Amino Acids");
  assert.equal(rows[1].abbreviation, "AB");
  assert.deepEqual(warnings, []);
});

test("parseTsv: skips blank lines without warning", () => {
  const text = "abbreviation\ttitle\n\nAA\tAmino Acids\n\n\nAB\tAstrobiology\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 2);
  assert.deepEqual(warnings, []);
});

test("parseTsv: skips a row missing a required column and emits a warning", () => {
  const text = "abbreviation\ttitle\nAA\nAB\tAstrobiology\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].abbreviation, "AB");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /row 2|line 2|missing/i);
});

test("parseTsv: skips a row whose required column is empty and warns", () => {
  // header line + a row with the abbreviation column but an empty title cell
  const text = "abbreviation\ttitle\nAA\t\nAB\tAstrobiology\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].abbreviation, "AB");
  assert.equal(warnings.length, 1);
});

test("parseTsv: rejects input lacking a required header column", () => {
  const text = "abbreviation\nAA\n";
  assert.throws(
    () => parseTsv(text),
    /title/i,
    "parseTsv must throw when the header is missing the 'title' column",
  );
});

test("parseTsv: empty input yields zero rows and no warnings", () => {
  // A pathological case: no header at all should also throw, since the
  // contract requires `abbreviation` and `title` headers.
  assert.throws(() => parseTsv(""), /header|abbreviation|title/i);
});

test("parseTsv: extra columns beyond required are tolerated", () => {
  const text =
    "abbreviation\ttitle\tshorttitle\textra\nAA\tAmino Acids\tAmino Acids\tnonsense\n";
  const { rows, warnings } = parseTsv(text);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].abbreviation, "AA");
  assert.equal(rows[0].extra, "nonsense");
  assert.deepEqual(warnings, []);
});
