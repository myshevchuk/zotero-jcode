// Sample `Extra` field strings used across mergeJcodeIntoExtra and classifyItem
// tests. Kept in one place so test cases stay readable.

export const EMPTY = "";

export const JCODE_ONLY = "jcode: OLD";

export const MIXED_WITH_JCODE =
  "DOI: 10.1/x\njcode: OLD\ntex.note: foo";

export const MIXED_WITHOUT_JCODE = "DOI: 10.1/x\ntex.note: foo";

export const SINGLE_LINE_NO_JCODE = "DOI: 10.1/x";

export const CRLF_WITH_JCODE = "DOI: 10.1/x\r\njcode: OLD\r\ntex.note: foo";

export const TWO_JCODE_LINES =
  "DOI: 10.1/x\njcode: OLD1\nfoo: bar\njcode: OLD2";

// Trailing newlines are common when users edit Extra in the Zotero UI.
export const TRAILING_NEWLINE = "DOI: 10.1/x\n";
