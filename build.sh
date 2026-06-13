#!/usr/bin/env bash
# Package the contents of `addon/` into `zotero-jcode.xpi`. The pure
# helpers (`addon/content/jcode-core.js`) and the Zotero adapter
# (`addon/content/jcode.js`) are bundled into `bootstrap.js` at build
# time: dynamic `import()` from a `jar:` URI is brittle in Gecko, so the
# whole plugin runs as a single non-module script in Zotero. The source
# tree keeps the ESM split so Node tests stay possible without a
# transpiler.
set -euo pipefail

cd "$(dirname "$0")"
BUILD=".build"
rm -rf "$BUILD"
mkdir -p "$BUILD/content/icons" "$BUILD/data" "$BUILD/locale/en-US"

cp addon/manifest.json "$BUILD/"
cp addon/prefs.js "$BUILD/"
cp addon/content/prefs.xhtml "$BUILD/content/"
cp addon/content/prefs-pane.js "$BUILD/content/"
cp addon/content/icons/jcode.svg "$BUILD/content/icons/"
cp addon/data/journal_titles.tsv "$BUILD/data/"
cp addon/locale/en-US/jcode.ftl "$BUILD/locale/en-US/"

{
  echo "// === content/jcode-core.js (bundled at build time) ==="
  sed -E 's/^export (function|const|let|var) /\1 /' addon/content/jcode-core.js
  echo
  echo "// === content/jcode.js (bundled at build time) ==="
  sed -E -e '/^import\b.*from .*jcode-core.*;[[:space:]]*$/d' \
         -e 's/^export (async function|function|const|let|var) /\1 /' \
         addon/content/jcode.js
  echo
  echo "// === bootstrap.js ==="
  cat addon/bootstrap.js
} > "$BUILD/bootstrap.js"

cd "$BUILD"
rm -f ../zotero-jcode.xpi
zip -qr ../zotero-jcode.xpi .
echo "Built: $(realpath ../zotero-jcode.xpi)"
