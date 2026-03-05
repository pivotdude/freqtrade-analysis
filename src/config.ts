import type { ReportLanguage } from "./types/i18n.types";

export interface RuntimeConfig {
  dbPath: string;
  reportPath: string;
  initialCapital: number;
  reportLanguage: ReportLanguage;
  benchmarkPair: string;
  enableBenchmark: boolean;
  exchangeId: string;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseLanguage = (value: string | undefined): ReportLanguage => {
  if (value === "ru") return "ru";
  return "en";
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const baseConfig: RuntimeConfig = {
  dbPath: process.env.DB_PATH ?? "tradesv3.sqlite",
  reportPath: process.env.REPORT_PATH ?? "trades_report.md",
  initialCapital: parseNumber(process.env.INITIAL_CAPITAL, 9900),
  reportLanguage: parseLanguage(process.env.REPORT_LANG),
  benchmarkPair: process.env.BENCHMARK_PAIR ?? "BTC/USDT",
  enableBenchmark: parseBoolean(process.env.ENABLE_BENCHMARK, true),
  exchangeId: process.env.EXCHANGE_ID ?? "binance",
};

export function resolveRuntimeConfig(argv: string[]): RuntimeConfig {
  const overrides: Partial<RuntimeConfig> = {};

  const getValue = (flag: string, i: number): string => {
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--db":
        overrides.dbPath = getValue(arg, i);
        i++;
        break;
      case "--out":
        overrides.reportPath = getValue(arg, i);
        i++;
        break;
      case "--capital":
        overrides.initialCapital = parseNumber(getValue(arg, i), baseConfig.initialCapital);
        i++;
        break;
      case "--lang":
        overrides.reportLanguage = parseLanguage(getValue(arg, i));
        i++;
        break;
      case "--exchange":
        overrides.exchangeId = getValue(arg, i);
        i++;
        break;
      case "--benchmark": {
        const next = argv[i + 1];
        overrides.enableBenchmark = true;
        if (next && !next.startsWith("--")) {
          overrides.benchmarkPair = next;
          i++;
        }
        break;
      }
      case "--no-benchmark":
        overrides.enableBenchmark = false;
        break;
      case "--help":
      case "-h":
        printHelpAndExit();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { ...baseConfig, ...overrides };
}

function printHelpAndExit(): never {
  console.log(`Usage: bun src/index.ts [options]

Options:
  --db <path>             Path to sqlite database file
  --out <path>            Path to output markdown report
  --capital <amount>      Initial capital value
  --lang <en|ru>          Report language
  --exchange <id>         Exchange id for benchmark data (default: binance)
  --benchmark [pair]      Enable benchmark (optional pair, default: BTC/USDT)
  --no-benchmark          Disable benchmark calculation
  --help, -h              Show this help

Priority: CLI flags > .env > defaults`);
  process.exit(0);
}
