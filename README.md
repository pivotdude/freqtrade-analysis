# Freqtrade Analysis Tool

A tool for analyzing Freqtrade trading data from SQLite and generating detailed Markdown reports.

## Features

- Analysis of closed trades from a Freqtrade SQLite database
- Detailed report generation in Markdown format
- Pair-level stats, profitability metrics, and win rate
- SOLID-based architecture
- Built with TypeScript and Bun

## Project Structure

```text
src/
├── analyzers/          # Data analysis
├── formatters/         # Data formatting
├── generators/         # Report generation
├── services/           # Data access services
└── types/              # TypeScript types and interfaces
```

For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Installation

```bash
bun install
```

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Available variables:

- `DB_PATH` - path to SQLite DB (default: `tradesv3.sqlite`)
- `REPORT_PATH` - output report path (default: `trades_report.md`)
- `INITIAL_CAPITAL` - capital baseline for percent/risk metrics, accepts a positive number or `auto` (default: `auto`)
- `REPORT_LANG` - report language: `en` or `ru` (default: `en`)
- `ENABLE_BENCHMARK` - enable Buy & Hold benchmark (`true/false`, default: `true`)
- `BENCHMARK_PAIR` - benchmark pair (default: `BTC/USDT`)
- `EXCHANGE_ID` - exchange id for benchmark via CCXT (default: `binance`)

## CLI Arguments

Configuration priority: `CLI > .env > defaults`.

```bash
bun run start -- \
  --db tradesv3.sqlite \
  --out trades_report.md \
  --capital auto \
  --lang en \
  --exchange binance \
  --benchmark BTC/USDT
```

Flags:

- `--db <path>` - database path (default: `tradesv3.sqlite`)
- `--out <path>` - report path (default: `trades_report.md`)
- `--capital <number|auto>` - capital baseline for percent/risk metrics (default: `auto`)
- `--no-capital` - disable capital-based metrics even if set in env
- `--lang <en|ru>` - report language (default: `en`)
- `--exchange <id>` - exchange id for benchmark (default: `binance`)
- `--benchmark [pair]` - enable benchmark, optionally set pair (default: enabled, `BTC/USDT`)
- `--no-benchmark` - disable benchmark calculation
- `--help` - show help

## Usage

Place your Freqtrade database file and run:

```bash
bun run start
```

Core project commands:

```bash
bun run start
bun run build
bun run build:exe
bun run test
```

Run with hot reload:

```bash
bun run dev:hot
```

Build standalone executable:

```bash
bun run build:exe
```

Type-check:

```bash
bunx tsc --noEmit
```

Full local validation cycle before PR:

```bash
bun install
bunx tsc --noEmit
bun run test
bun run build
bun run build:exe
```

## CI and Release

- CI workflow: `.github/workflows/ci.yml`
- Checks run on `pull_request` and `push` to `main` (Linux/macOS/Windows)
- Release build runs on `release: published`
- Release assets include:
  - `freqtrade-analys-linux-x64`
  - `freqtrade-analys-macos-x64`
  - `freqtrade-analys-macos-arm64`
  - `freqtrade-analys-windows-x64.exe`

Example release flow:

```bash
git tag v1.0.0
git push origin v1.0.0
# Then create a GitHub Release for tag v1.0.0 (Publish release)
```

## Output

After execution, the tool generates `trades_report.md` with:

- Overall statistics (number of trades, win rate, total profit)
- Detailed table of all trades
- Per-pair analysis
- Top-3 profitable and losing trades

## Tech Stack

- [Bun](https://bun.com) - fast all-in-one JavaScript runtime
- TypeScript
- SQLite (built-in `bun:sqlite` module)

## Architecture

The project follows SOLID principles:

- **S** - Single Responsibility: each class has one focused responsibility
- **O** - Open/Closed: easy to extend without modifying existing code
- **L** - Liskov Substitution: classes can be replaced with subtypes
- **I** - Interface Segregation: interfaces are split by purpose
- **D** - Dependency Inversion: dependencies are injected via constructors

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Metrics Limitations

- `capital baseline` defaults to `auto`. Use `--no-capital` if you want to skip percent/risk metrics that depend on account balance.
- `--capital auto` uses the maximum observed concurrent stake exposure as an estimate. This is not true wallet equity and does not include deposits/withdrawals.
- `drawdown` is calculated from **closed** trades only, not a full equity-curve time series.
- `sharpe` and `sortino` are calculated from per-trade returns, not a uniform time-series return stream.
- `slippage` is calculated only from available order data; if some order fields are missing, the metric is incomplete.
- `buy and hold benchmark` depends on external exchange data (CCXT API) and may be unavailable due to network/API limits.

## Public Repo Notes

The repository should not include personal trading artifacts:

- `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`
- `trades_report.md`

If these files were already added to git, remove them from the index (local files stay untouched):

```bash
git rm --cached tradesv3.sqlite tradesv3.sqlite-shm tradesv3.sqlite-wal trades_report.md
```

## License

This project was created using `bun init` in Bun v1.3.6.
