#!/usr/bin/env bash
# Package the contents of `addon/` into `zotero-jcode.xpi`. Files land at
# the archive root (no `addon/` prefix), which is what Zotero expects.
set -euo pipefail

cd "$(dirname "$0")/addon"
rm -f ../zotero-jcode.xpi
zip -qr ../zotero-jcode.xpi .
echo "Built: $(realpath ../zotero-jcode.xpi)"
