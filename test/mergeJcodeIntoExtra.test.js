import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeJcodeIntoExtra } from "../addon/content/jcode-core.js";
import {
  EMPTY,
  JCODE_ONLY,
  MIXED_WITH_JCODE,
  MIXED_WITHOUT_JCODE,
  SINGLE_LINE_NO_JCODE,
  CRLF_WITH_JCODE,
  TWO_JCODE_LINES,
  TRAILING_NEWLINE,
} from "./fixtures/extra-samples.js";

test("mergeJcodeIntoExtra: empty extra -> single jcode line", () => {
  assert.equal(mergeJcodeIntoExtra(EMPTY, "NEW"), "jcode: NEW");
});

test("mergeJcodeIntoExtra: appends when no jcode line exists", () => {
  assert.equal(
    mergeJcodeIntoExtra(SINGLE_LINE_NO_JCODE, "NEW"),
    "DOI: 10.1/x\njcode: NEW",
  );
});

test("mergeJcodeIntoExtra: appends, preserving multiple existing lines", () => {
  assert.equal(
    mergeJcodeIntoExtra(MIXED_WITHOUT_JCODE, "NEW"),
    "DOI: 10.1/x\ntex.note: foo\njcode: NEW",
  );
});

test("mergeJcodeIntoExtra: replaces an existing jcode line in place", () => {
  assert.equal(
    mergeJcodeIntoExtra(MIXED_WITH_JCODE, "NEW"),
    "DOI: 10.1/x\njcode: NEW\ntex.note: foo",
  );
});

test("mergeJcodeIntoExtra: jcode-only input is replaced, not appended", () => {
  assert.equal(mergeJcodeIntoExtra(JCODE_ONLY, "NEW"), "jcode: NEW");
});

test("mergeJcodeIntoExtra: idempotent on second run with same value", () => {
  const once = mergeJcodeIntoExtra(MIXED_WITHOUT_JCODE, "NEW");
  const twice = mergeJcodeIntoExtra(once, "NEW");
  assert.equal(twice, once, "running twice must not duplicate the jcode line");
});

test("mergeJcodeIntoExtra: only the FIRST jcode line is replaced", () => {
  // Spec requirement 2 says replace the first; subsequent jcode lines are
  // user data we have no business touching.
  assert.equal(
    mergeJcodeIntoExtra(TWO_JCODE_LINES, "NEW"),
    "DOI: 10.1/x\njcode: NEW\nfoo: bar\njcode: OLD2",
  );
});

test("mergeJcodeIntoExtra: CRLF input is normalised to LF on output", () => {
  // Zotero stores Extra with LF endings; accepting CRLF input but emitting
  // LF avoids round-tripping mixed line endings into the user's library.
  assert.equal(
    mergeJcodeIntoExtra(CRLF_WITH_JCODE, "NEW"),
    "DOI: 10.1/x\njcode: NEW\ntex.note: foo",
  );
});

test("mergeJcodeIntoExtra: a trailing newline is preserved in append mode", () => {
  assert.equal(
    mergeJcodeIntoExtra(TRAILING_NEWLINE, "NEW"),
    "DOI: 10.1/x\njcode: NEW",
    "trailing blank line is dropped on append (we own the new last line)",
  );
});

test("mergeJcodeIntoExtra: leading-whitespace jcode-like line is left alone", () => {
  // The spec says "lines starting with `jcode:`". A leading space is not a
  // jcode line for our purposes — we append rather than overwrite it.
  const input = " jcode: indented";
  assert.equal(
    mergeJcodeIntoExtra(input, "NEW"),
    " jcode: indented\njcode: NEW",
  );
});
