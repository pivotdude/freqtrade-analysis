#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

# Path-based patterns for private trading artifacts.
PATTERN='(^|/)(tradesv3\..*|.*\.sqlite(|-shm|-wal)|trades_report\.(md|json|csv)|backtest-result(s)?\.(json|zip)|dry-run-wallet\.(json|sqlite(|-shm|-wal)))$'

print_section() {
  printf '\n[%s]\n' "$1"
}

fail=0

print_section "Tracked files in HEAD"
tracked_matches="$(git ls-files | rg -n "$PATTERN" || true)"
if [[ -n "$tracked_matches" ]]; then
  echo "$tracked_matches"
  fail=1
else
  echo "No private trading artifacts are tracked in HEAD."
fi

print_section "Artifacts present in git history"
history_matches="$(git rev-list --objects --all | awk '{$1=""; sub(/^ /, ""); print}' | rg -n "$PATTERN" || true)"
if [[ -n "$history_matches" ]]; then
  echo "$history_matches"
  fail=1
else
  echo "No matching artifact paths were found in repository history."
fi

print_section "Ignored-file policy"
ignore_matches="$(rg -n "tradesv3\.\*|\*\.sqlite|\*\.sqlite-shm|\*\.sqlite-wal|trades_report\.md" .gitignore || true)"
if [[ -n "$ignore_matches" ]]; then
  echo "$ignore_matches"
else
  echo "Warning: expected ignore rules not found in .gitignore"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "\nAudit failed: private artifacts detected (or ignore policy incomplete)."
  exit 1
fi

echo "\nAudit passed: no private trading artifacts found in HEAD/history and ignore policy is present."
