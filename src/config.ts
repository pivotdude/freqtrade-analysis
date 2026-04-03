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
const DEFAULT_REPORT_FORMAT: ReportOutputFormat = "md";
const DEFAULT_CAPITAL = "auto";
const DEFAULT_REPORT_LANG: ReportLanguage = "en";

export interface RuntimeConfig {
  dbPath: string;
  format: ReportOutputFormat;
  initialCapital?: number;
  capitalMode: CapitalMode;
  reportLanguage: ReportLanguage;
}

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseNonEmptyString = (value: string, source: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new CliUsageError(`Invalid value for ${source}: value must not be empty.`);
  }
  return trimmed;
};

const parseLanguage = (
  value: string | undefined,
  source = "--lang",
): ReportLanguage => {
  if (!value) {
    return DEFAULT_REPORT_LANG;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "en" || normalized === "ru") {
    return normalized;
  }

  throw new CliUsageError(
    `Invalid value for ${source}: ${value}. Use one of: en, ru.`,
  );
};

const parseFormat = (
  value: string | undefined,
  source = "--format",
): ReportOutputFormat => {
  if (!value) {
    return DEFAULT_REPORT_FORMAT;
  }

  if (value === "md" || value === "json" || value === "toon") {
    return value;
  }

  throw new CliUsageError(
    `Invalid value for ${source}: ${value}. Use one of: md, json, toon.`,
  );
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
  --format <md|json|toon> Output format to stdout (default: ${DEFAULT_REPORT_FORMAT})
  --capital <amount|auto> Capital baseline for percent/risk metrics (default: ${DEFAULT_CAPITAL})
  --no-capital            Disable capital-based metrics (default: off)
  --lang <en|ru>          Report language (default: ${DEFAULT_REPORT_LANG})
  --help, -h              Show this help

Priority: CLI flags > .env > defaults`;
}

const getBaseConfig = (): RuntimeConfig => ({
  dbPath: parseNonEmptyString(
    process.env.DB_PATH ?? DEFAULT_DB_PATH,
    "DB_PATH",
  ),
  format: parseFormat(process.env.REPORT_FORMAT ?? DEFAULT_REPORT_FORMAT, "REPORT_FORMAT"),
  ...parseCapitalSetting(process.env.INITIAL_CAPITAL ?? DEFAULT_CAPITAL, "INITIAL_CAPITAL"),
  reportLanguage: parseLanguage(
    process.env.REPORT_LANG ?? DEFAULT_REPORT_LANG,
    "REPORT_LANG",
  ),
});

const validateResolvedConfig = (config: RuntimeConfig): RuntimeConfig => {
  const dbPath = parseNonEmptyString(config.dbPath, "--db");
  return {
    ...config,
    dbPath,
  };
};

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
        overrides.dbPath = parseNonEmptyString(getValue(arg, i), arg);
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
        overrides.reportLanguage = parseLanguage(getValue(arg, i), arg);
        i++;
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
  return validateResolvedConfig({ ...baseConfig, ...overrides });
}

function printHelpAndExit(): never {
  console.log(getHelpText());
  process.exit(0);
}
