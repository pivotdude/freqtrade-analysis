import type { ReportLanguage } from "./types/i18n.types";
import type { ReportOutputFormat } from "./types/report.types";

export type CapitalMode = "none" | "manual" | "auto";

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

const DEFAULT_DB_PATH = "tradesv3.sqlite";
const DEFAULT_REPORT_PATH = "trades_report.md";
const DEFAULT_REPORT_FORMAT: ReportOutputFormat = "file";
const DEFAULT_CAPITAL = "auto";
const DEFAULT_REPORT_LANG: ReportLanguage = "en";
const DEFAULT_BENCHMARK_PAIR = "BTC/USDT";
const DEFAULT_ENABLE_BENCHMARK = true;
const DEFAULT_EXCHANGE_ID = "binance";

export interface RuntimeConfig {
  dbPath: string;
  reportPath: string;
  format: ReportOutputFormat;
  initialCapital?: number;
  capitalMode: CapitalMode;
  reportLanguage: ReportLanguage;
  benchmarkPair: string;
  enableBenchmark: boolean;
  exchangeId: string;
}

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseLanguage = (value: string | undefined): ReportLanguage => {
  if (value === "ru") return "ru";
  return "en";
};

const parseFormat = (
  value: string | undefined,
  source = "--format",
): ReportOutputFormat => {
  if (!value) {
    return DEFAULT_REPORT_FORMAT;
  }

  if (value === "file" || value === "md" || value === "json" || value === "toon") {
    return value;
  }

  throw new CliUsageError(
    `Invalid value for ${source}: ${value}. Use one of: file, md, json, toon.`,
  );
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseCapitalSetting = (
  value: string | undefined,
  source = "--capital",
): Pick<RuntimeConfig, "initialCapital" | "capitalMode"> => {
  if (!value) {
    return { capitalMode: "none" };
  }

  if (value.trim().toLowerCase() === "auto") {
    return { capitalMode: "auto" };
  }

  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    return { initialCapital: parsed, capitalMode: "manual" };
  }

  throw new CliUsageError(
    `Invalid value for ${source}: ${value}. Use a positive number or "auto".`,
  );
};

export function getHelpText(): string {
  return `Usage: bun src/index.ts [options]

Options:
  --db <path>             Path to sqlite database file (default: ${DEFAULT_DB_PATH})
  --out <path>            Path to output report file (used by --format file, default: ${DEFAULT_REPORT_PATH})
  --format <file|md|json|toon>
                          Output format and target (default: ${DEFAULT_REPORT_FORMAT})
  --capital <amount|auto> Capital baseline for percent/risk metrics (default: ${DEFAULT_CAPITAL})
  --no-capital            Disable capital-based metrics (default: off)
  --lang <en|ru>          Report language (default: ${DEFAULT_REPORT_LANG})
  --exchange <id>         Exchange id for benchmark data (default: ${DEFAULT_EXCHANGE_ID})
  --benchmark [pair]      Enable benchmark (default: on, pair ${DEFAULT_BENCHMARK_PAIR})
  --no-benchmark          Disable benchmark calculation (default: off)
  --help, -h              Show this help

Priority: CLI flags > .env > defaults`;
}

const getBaseConfig = (): RuntimeConfig => ({
  dbPath: process.env.DB_PATH ?? DEFAULT_DB_PATH,
  reportPath: process.env.REPORT_PATH ?? DEFAULT_REPORT_PATH,
  format: parseFormat(process.env.REPORT_FORMAT ?? DEFAULT_REPORT_FORMAT, "REPORT_FORMAT"),
  ...parseCapitalSetting(process.env.INITIAL_CAPITAL ?? DEFAULT_CAPITAL, "INITIAL_CAPITAL"),
  reportLanguage: parseLanguage(process.env.REPORT_LANG ?? DEFAULT_REPORT_LANG),
  benchmarkPair: process.env.BENCHMARK_PAIR ?? DEFAULT_BENCHMARK_PAIR,
  enableBenchmark: parseBoolean(process.env.ENABLE_BENCHMARK, DEFAULT_ENABLE_BENCHMARK),
  exchangeId: process.env.EXCHANGE_ID ?? DEFAULT_EXCHANGE_ID,
});

export function resolveRuntimeConfig(argv: string[]): RuntimeConfig {
  const overrides: Partial<RuntimeConfig> = {};

  const getValue = (flag: string, i: number): string => {
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CliUsageError(`Missing value for ${flag}`);
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
      case "--format":
        overrides.format = parseFormat(getValue(arg, i));
        i++;
        break;
      case "--capital": {
        Object.assign(overrides, parseCapitalSetting(getValue(arg, i)));
        i++;
        break;
      }
      case "--no-capital":
        overrides.initialCapital = undefined;
        overrides.capitalMode = "none";
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
        throw new CliUsageError(`Unknown option: ${arg}`);
    }
  }

  const baseConfig = getBaseConfig();
  return { ...baseConfig, ...overrides };
}

function printHelpAndExit(): never {
  console.log(getHelpText());
  process.exit(0);
}
