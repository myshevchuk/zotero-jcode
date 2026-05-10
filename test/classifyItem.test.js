import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyItem } from "../addon/content/jcode-core.js";

const SAMPLE_LOOKUP = new Map([
  ["Amino Acids", "AA"],
  ["Astrobiology", "AB"],
]);

test("classifyItem: matched title returns kind 'updated' with nextExtra", () => {
  const result = classifyItem(
    { publicationTitle: "Amino Acids", extra: "DOI: 10.1/x" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "updated");
  assert.equal(result.abbreviation, "AA");
  assert.equal(result.nextExtra, "DOI: 10.1/x\njcode: AA");
});

test("classifyItem: matched title with empty extra still yields nextExtra", () => {
  const result = classifyItem(
    { publicationTitle: "Astrobiology", extra: "" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "updated");
  assert.equal(result.nextExtra, "jcode: AB");
});

test("classifyItem: empty publicationTitle yields kind 'no-title'", () => {
  const result = classifyItem(
    { publicationTitle: "", extra: "DOI: 10.1/x" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "no-title");
  assert.equal(
    result.nextExtra,
    undefined,
    "no-title classification must not produce a write",
  );
});

test("classifyItem: undefined publicationTitle yields kind 'no-title'", () => {
  const result = classifyItem(
    { publicationTitle: undefined, extra: "" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "no-title");
});

test("classifyItem: whitespace-only publicationTitle yields kind 'no-title'", () => {
  const result = classifyItem(
    { publicationTitle: "   ", extra: "" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "no-title");
});

test("classifyItem: unknown publicationTitle yields kind 'no-match'", () => {
  const result = classifyItem(
    { publicationTitle: "Made Up Journal", extra: "DOI: 10.1/x" },
    SAMPLE_LOOKUP,
  );
  assert.equal(result.kind, "no-match");
  assert.equal(
    result.publicationTitle,
    "Made Up Journal",
    "no-match must report the title so the summary can list it",
  );
  assert.equal(result.nextExtra, undefined);
});
