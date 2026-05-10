import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldShowMenu } from "../addon/content/jcode-core.js";

test("shouldShowMenu: zero selected items hides the entry", () => {
  assert.equal(shouldShowMenu(0), false);
});

test("shouldShowMenu: one or more selected items shows the entry", () => {
  for (const n of [1, 2, 5, 100]) {
    assert.equal(
      shouldShowMenu(n),
      true,
      `selectedCount = ${n} should show the menu`,
    );
  }
});

test("shouldShowMenu: defensive against negative or non-integer counts", () => {
  // Defensive: nothing in Zotero's API should give us a negative count, but
  // we'd rather hide the menu than crash if it ever happens.
  assert.equal(shouldShowMenu(-1), false);
  assert.equal(shouldShowMenu(0.5), false);
});
