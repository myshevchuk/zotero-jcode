#!/usr/bin/env bash
# Install this repo into a Zotero profile via the proxy-file mechanism
# (Mozilla's AddonManager convention for developer extensions):
#
#   <profile>/extensions/<addon-id>
#
# is a plain text file whose contents are the absolute path to an
# unpacked addon directory (must contain manifest.json at its root).
# Compared to dropping the .xpi into <profile>/extensions/:
#
#   - No reinstall after each build. Run `bash build.sh` to refresh
#     `.build/`, then just restart Zotero.
#   - No hash check. The AddonManager does not audit proxy-pointed
#     installs across restarts, so the extension cannot get silently
#     removed for "external modification."
#
# Usage:
#   bash dev-install.sh [PROFILE_DIR]
#
# If PROFILE_DIR is omitted, the script picks the single *.default
# directory under ~/.zotero/zotero. Pass the path explicitly if you
# have multiple profiles.
set -euo pipefail

cd "$(dirname "$0")"
ADDON_ID="jcode@zotero-jcode.local"

PROFILE_DIR="${1:-}"
if [ -z "$PROFILE_DIR" ]; then
  mapfile -t candidates < <(find "${HOME}/.zotero/zotero" -maxdepth 1 -type d -name '*.default' 2>/dev/null)
  if [ "${#candidates[@]}" -eq 0 ]; then
    echo "No *.default profile under ~/.zotero/zotero. Pass profile path as arg 1." >&2
    exit 1
  fi
  if [ "${#candidates[@]}" -gt 1 ]; then
    echo "Multiple default profiles found; pick one and pass it as arg 1:" >&2
    printf '  %s\n' "${candidates[@]}" >&2
    exit 1
  fi
  PROFILE_DIR="${candidates[0]}"
fi

if [ ! -d "$PROFILE_DIR" ]; then
  echo "Profile directory not found: $PROFILE_DIR" >&2
  exit 1
fi

EXT_DIR="${PROFILE_DIR}/extensions"
mkdir -p "$EXT_DIR"

if [ ! -f ".build/manifest.json" ]; then
  echo "Populating .build/ via build.sh..."
  bash build.sh
fi

ABS_BUILD="$(realpath .build)"
PROXY_PATH="${EXT_DIR}/${ADDON_ID}"
XPI_PATH="${EXT_DIR}/${ADDON_ID}.xpi"

if [ -f "$XPI_PATH" ]; then
  echo "Removing existing .xpi install: $XPI_PATH"
  rm -f "$XPI_PATH"
fi

printf '%s' "$ABS_BUILD" > "$PROXY_PATH"
echo "Wrote proxy file: $PROXY_PATH"
echo "    -> $ABS_BUILD"
echo
echo "Next steps:"
echo "  1. Quit Zotero if it is running."
echo "  2. In the Zotero Plugins window, remove any prior install of"
echo "     'Journal Code' from the UI (if it is still listed)."
echo "  3. Restart Zotero. The plugin loads from .build/ via the proxy."
echo
echo "From here on, the dev loop is:"
echo "  - Edit files under addon/."
echo "  - bash build.sh"
echo "  - Restart Zotero."
