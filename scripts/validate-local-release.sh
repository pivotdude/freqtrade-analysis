#!/usr/bin/env bash
set -euo pipefail

steps=(
  "bunx tsc --noEmit"
  "bun run test"
  "bun run build"
  "bun run build:exe"
  "bun run audit:private-artifacts"
)

echo "[validate:local-release] Running full local validation cycle..."

for step in "${steps[@]}"; do
  echo
  echo "[validate:local-release] >>> ${step}"
  eval "${step}"
done

echo

echo "[validate:local-release] ✅ Full local validation cycle completed successfully."
