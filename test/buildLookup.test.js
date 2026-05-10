import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLookup } from "../addon/content/jcode-core.js";

test("buildLookup: empty rows yields an empty Map and no warnings", () => {
  const { lookup, warnings } = buildLookup([]);
  assert.ok(lookup instanceof Map);
  assert.equal(lookup.size, 0);
  assert.deepEqual(warnings, []);
});

test("buildLookup: rows produce a title -> abbreviation Map", () => {
  const rows = [
    { abbreviation: "AA", title: "Amino Acids" },
    { abbreviation: "AB", title: "Astrobiology" },
    { abbreviation: "AC", title: "Analytical Chemistry" },
  ];
  const { lookup, warnings } = buildLookup(rows);

  assert.equal(lookup.size, 3);
  assert.equal(lookup.get("Amino Acids"), "AA");
  assert.equal(lookup.get("Astrobiology"), "AB");
  assert.equal(lookup.get("Analytical Chemistry"), "AC");
  assert.deepEqual(warnings, []);
});

test("buildLookup: duplicate titles last-wins with a warning", () => {
  const rows = [
    { abbreviation: "AA", title: "Amino Acids" },
    { abbreviation: "AA-OLD", title: "Amino Acids" },
  ];
  const { lookup, warnings } = buildLookup(rows);

  assert.equal(lookup.size, 1);
  assert.equal(
    lookup.get("Amino Acids"),
    "AA-OLD",
    "later row overrides the earlier abbreviation",
  );
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /duplicate.*Amino Acids/i);
});

test("buildLookup: ignores extra columns on each row", () => {
  const rows = [
    {
      abbreviation: "AA",
      title: "Amino Acids",
      shorttitle: "Amino Acids",
      noise: "ignored",
    },
  ];
  const { lookup } = buildLookup(rows);
  assert.equal(lookup.get("Amino Acids"), "AA");
});
