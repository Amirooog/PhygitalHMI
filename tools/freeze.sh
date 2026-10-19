#!/bin/sh
# Freeze a build for data collection: copies the app folder and shared/ into releases/<build>/,
# so the frozen copy keeps working at .../releases/<build>/<app>/ even after the live apps change.
# Usage: tools/freeze.sh tb   |   tools/freeze.sh sk   |   tools/freeze.sh sk2
set -e
app="$1"; id=$(cat "$app/BUILD")
dst="releases/$id"
[ -e "$dst" ] && { echo "$dst exists: bump the version instead of overwriting a frozen build"; exit 1; }
mkdir -p "$dst"
cp -r "$app" "$dst/$app"
cp -r shared "$dst/shared"
echo "frozen $id -> $dst/$app/"
