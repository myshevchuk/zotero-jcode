import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSummaryMessage } from "../addon/content/jcode-core.js";

test("buildSummaryMessage: mixed-outcome batch reports all three counts", () => {
  const { title, body } = buildSummaryMessage({
    updated: 2,
    noMatch: 1,
    noTitle: 1,
    unmatchedTitles: ["Made Up Journal"],
  });

  assert.match(title, /journal code|jcode/i);
  assert.match(
    body,
    /2 updated.*1 skipped \(no match\).*1 skipped \(no publication title\)/s,
  );
  assert.match(body, /Made Up Journal/, "unmatched title should appear");
});

test("buildSummaryMessage: all-success batch omits skipped clauses", () => {
  const { body } = buildSummaryMessage({
    updated: 3,
    noMatch: 0,
    noTitle: 0,
    unmatchedTitles: [],
  });

  assert.match(body, /3 updated/);
  assert.doesNotMatch(
    body,
    /skipped/i,
    "no skipped items -> no skipped clauses",
  );
});

test("buildSummaryMessage: only no-match skips are reported", () => {
  const { body } = buildSummaryMessage({
    updated: 0,
    noMatch: 2,
    noTitle: 0,
    unmatchedTitles: ["A", "B"],
  });

  assert.match(body, /0 updated/);
  assert.match(body, /2 skipped \(no match\)/);
  assert.doesNotMatch(body, /no publication title/);
  assert.match(body, /A/);
  assert.match(body, /B/);
});

test("buildSummaryMessage: only no-title skips are reported", () => {
  const { body } = buildSummaryMessage({
    updated: 0,
    noMatch: 0,
    noTitle: 4,
    unmatchedTitles: [],
  });

  assert.match(body, /4 skipped \(no publication title\)/);
  assert.doesNotMatch(body, /no match/);
});

test("buildSummaryMessage: empty batch produces a sane message", () => {
  const { body } = buildSummaryMessage({
    updated: 0,
    noMatch: 0,
    noTitle: 0,
    unmatchedTitles: [],
  });

  assert.match(
    body,
    /0 updated|nothing/i,
    "empty selection should produce a message, not an empty string",
  );
  assert.notEqual(body.trim(), "");
});

test("buildSummaryMessage: deduplicates repeated unmatched titles", () => {
  // The summary should not list 'Same Journal' three times if the user has
  // three items pointing at the same unknown title.
  const { body } = buildSummaryMessage({
    updated: 0,
    noMatch: 3,
    noTitle: 0,
    unmatchedTitles: ["Same Journal", "Same Journal", "Other Journal"],
  });

  const sameCount = body.match(/Same Journal/g)?.length ?? 0;
  const otherCount = body.match(/Other Journal/g)?.length ?? 0;
  assert.equal(sameCount, 1, "duplicate unmatched titles collapse to one");
  assert.equal(otherCount, 1);
});
