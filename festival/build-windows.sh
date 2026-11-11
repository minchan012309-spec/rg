#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
for track in web/game/audio/bgm{1,2,3}.mp3; do
  test -s "$track" || { echo "Missing soundtrack: $track" >&2; exit 1; }
done
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -H=windowsgui" -o dist/RhythmDuel.exe .
