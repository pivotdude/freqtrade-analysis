#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

# Path-based patterns for private trading artifacts.
ARTIFACT_PATTERN='(^|/)(tradesv3\..*|.*\.sqlite(|-shm|-wal)|trades_report\.(md|json|csv)|backtest-result(s)?\.(json|zip)|dry-run-wallet\.(json|sqlite(|-shm|-wal)))$'
REQUIRED_GITIGNORE_RULES=(
  'tradesv3.*'
  '*.sqlite'
  '*.sqlite-shm'
  '*.sqlite-wal'
  'trades_report.md'
)

print_section() {
  printf '\n[%s]\n' "$1"
}

print_ok() {
  printf '%s\n' "$1"
}

print_fail() {
  printf 'ERROR: %s\n' "$1"
}

fail=0

print_section "Tracked files in HEAD"
tracked_matches="$(git ls-files | rg -n "$ARTIFACT_PATTERN" || true)"
if [[ -n "$tracked_matches" ]]; then
  echo "$tracked_matches"
  print_fail "Private trading artifacts are currently tracked in HEAD."
  fail=1
else
  print_ok "No private trading artifacts are tracked in HEAD."
fi

print_section "Artifacts present in git history"
history_paths="$(git rev-list --objects --all | cut -d' ' -f2- | sed '/^$/d' || true)"
history_matches="$(printf '%s\n' "$history_paths" | rg -n "$ARTIFACT_PATTERN" || true)"
if [[ -n "$history_matches" ]]; then
  echo "$history_matches"
  print_fail "Artifact-like paths were found in repository history."
  fail=1
else
  print_ok "No matching artifact paths were found in repository history."
fi

print_section "Ignored-file policy"
missing_rules=0
for rule in "${REQUIRED_GITIGNORE_RULES[@]}"; do
  if rg -n -F -- "$rule" .gitignore >/dev/null 2>&1; then
    printf 'present: %s\n' "$rule"
  else
    print_fail "Missing .gitignore rule: $rule"
    missing_rules=1
    fail=1
  fi
done

if [[ "$missing_rules" -eq 0 ]]; then
  print_ok "All required .gitignore rules are present."
fi

if [[ "$fail" -ne 0 ]]; then
  printf '\nAudit failed: private artifacts detected (or ignore policy incomplete).\n'
  exit 1
fi

printf '\nAudit passed: no private trading artifacts found in HEAD/history and ignore policy is present.\n'
