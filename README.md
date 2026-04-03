# freqtrade-analys

`freqtrade-analys` is a Bun + TypeScript CLI that reads a Freqtrade SQLite database and prints a trading performance report to `stdout`.

It is designed for both:

- humans (Markdown / Toon format), and
- automation (JSON output for pipelines, scripts, or downstream tools).

## Why this project

- Analyze closed trades quickly without launching a full dashboard.
- Keep report generation scriptable and CI-friendly.
- Export results in machine-readable or presentation-friendly formats.

## Features

- Closed-trade analysis from Freqtrade SQLite data.
- Output formats: `md`, `json`, `toon`.
- Core metrics: win rate, realized profit, pair-level performance.
- Risk/return metrics: drawdown, Sharpe, Sortino, slippage (when data is available).
- English and Russian report localization.

## Requirements

- [Bun](https://bun.com) 1.3+
- A Freqtrade SQLite database (`tradesv3.sqlite` by default)

## Quick start

```bash
# 1) Install dependencies
bun install

# 2) Prepare env config
cp .env.example .env

# 3) Run analyzer (Markdown output by default)
bun run start
```

## CLI usage

```bash
bun run start -- [options]
```

### Options

- `--db <path>`: path to SQLite database (default: `tradesv3.sqlite`)
- `--format <md|json|toon>`: output format (default: `md`)
- `--capital <number|auto>`: capital baseline for percent/risk metrics (default: `auto`)
- `--no-capital`: disable capital-based metrics
- `--lang <en|ru>`: report language (default: `en`)
- `--help`, `-h`: print help

Configuration priority: **CLI > `.env` > defaults**.

## Configuration (`.env`)

`.env.example`:

```env
DB_PATH=tradesv3.sqlite
REPORT_FORMAT=md
INITIAL_CAPITAL=9900
REPORT_LANG=en
```

Variables:

- `DB_PATH`: path to SQLite database file
- `REPORT_FORMAT`: `md`, `json`, or `toon`
- `INITIAL_CAPITAL`: positive number or `auto`
- `REPORT_LANG`: `en` or `ru`

## Examples

```bash
# Markdown report
bun run start -- --format md

# JSON report for machine consumption
bun run start -- --format json > report.json

# Toon formatted report in Russian
bun run start -- --format toon --lang ru
```

## Output contract

When `--format md|json|toon` is used, the tool prints only the final report to `stdout`.
Diagnostics and errors are written to `stderr`, making `stdout` safe for piping/parsing.

## Project structure

```text
src/
├── analyzers/          # Trade + metric analysis
├── formatters/         # Date/number formatting helpers
├── generators/         # Report generation orchestration
├── renderers/          # md/json/toon renderers
├── services/           # Database access
└── types/              # Shared TypeScript types
```

For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development

Core commands:

```bash
bun run start
bun run dev:hot
bun run test
bunx tsc --noEmit
bun run build
bun run build:exe
```

Suggested local validation before opening a PR:

```bash
bun install
bunx tsc --noEmit
bun run test
bun run build
bun run build:exe
```

Before publishing a public release/tag, run the full local validation cycle:

```bash
bun run validate:local-release
```

## Metrics limitations

- `--capital auto` estimates capital from max observed concurrent stake exposure.
- Drawdown is based on **closed trades**, not a full account equity time series.
- Sharpe/Sortino are calculated from per-trade returns, not time-normalized returns.
- Slippage requires sufficiently complete order fields in source data.

## Public release & data hygiene

Before publishing a release/tag, run:

```bash
bun run validate:local-release
```

This command runs type checks, tests, build targets, and private artifact audit in one pass.
The audit stage checks tracked files, git history paths, and required `.gitignore` rules.

Never commit private trading artifacts such as:

- `*.sqlite`
- `*.sqlite-shm`
- `*.sqlite-wal`

If they were committed previously, untrack them while keeping local copies:

```bash
git rm --cached tradesv3.sqlite tradesv3.sqlite-shm tradesv3.sqlite-wal
```

## CI / release notes

- CI workflow: `.github/workflows/ci.yml`
- CI runs on pull requests, pushes to `main`, and version tags (`v*`)
- CI can be started manually via `workflow_dispatch` for an existing ref (for example `v1.0.0`)
- Release workflow publishes standalone binaries for major OS targets

## License

[MIT](./LICENSE)
