import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { CliUsageError, resolveRuntimeConfig } from "./config";

describe("resolveRuntimeConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of [
      "DB_PATH",
      "REPORT_FORMAT",
      "INITIAL_CAPITAL",
      "REPORT_LANG",
      "ENABLE_BENCHMARK",
      "BENCHMARK_PAIR",
      "EXCHANGE_ID",
    ]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("uses markdown format by default", () => {
    const config = resolveRuntimeConfig([]);

    expect(config.format).toBe("md");
  });

  it("uses auto capital baseline by default", () => {
    const config = resolveRuntimeConfig([]);

    expect(config.capitalMode).toBe("auto");
    expect(config.initialCapital).toBeUndefined();
  });

  it("parses --format values from CLI", () => {
    expect(resolveRuntimeConfig(["--format", "md"]).format).toBe("md");
    expect(resolveRuntimeConfig(["--format", "json"]).format).toBe("json");
    expect(resolveRuntimeConfig(["--format", "toon"]).format).toBe("toon");
  });

  it("treats --out as unknown option", () => {
    expect(() => resolveRuntimeConfig(["--out", "report.md"])).toThrow(
      new CliUsageError("Unknown option: --out"),
    );
  });

  it("parses manual capital baseline from CLI", () => {
    const config = resolveRuntimeConfig(["--capital", "12500"]);

    expect(config.capitalMode).toBe("manual");
    expect(config.initialCapital).toBe(12500);
  });

  it("parses auto capital baseline from CLI", () => {
    const config = resolveRuntimeConfig(["--capital", "auto"]);

    expect(config.capitalMode).toBe("auto");
    expect(config.initialCapital).toBeUndefined();
  });

  it("allows explicitly disabling capital metrics", () => {
    const config = resolveRuntimeConfig(["--capital", "12500", "--no-capital"]);

    expect(config.capitalMode).toBe("none");
    expect(config.initialCapital).toBeUndefined();
  });

  it("throws a CLI usage error for unknown arguments", () => {
    expect(() => resolveRuntimeConfig(["-р"])).toThrow(
      new CliUsageError("Unknown option: -р"),
    );
  });

  it("throws a CLI usage error for invalid --format", () => {
    expect(() => resolveRuntimeConfig(["--format", "xml"])).toThrow(
      new CliUsageError(
        "Invalid value for --format: xml. Use one of: md, json, toon.",
      ),
    );
  });

  it("throws a CLI usage error for invalid --capital", () => {
    expect(() => resolveRuntimeConfig(["--capital", "0"])).toThrow(
      new CliUsageError(
        'Invalid value for --capital: 0. Use a positive number or "auto".',
      ),
    );
  });

  it("throws a CLI usage error for invalid --lang", () => {
    expect(() => resolveRuntimeConfig(["--lang", "de"])).toThrow(
      new CliUsageError("Invalid value for --lang: de. Use one of: en, ru."),
    );
  });

  it("throws a CLI usage error for empty string runtime values", () => {
    expect(() => resolveRuntimeConfig(["--db", "   "])).toThrow(
      new CliUsageError("Invalid value for --db: value must not be empty."),
    );
    expect(() => resolveRuntimeConfig(["--exchange", "   "])).toThrow(
      new CliUsageError("Invalid value for --exchange: value must not be empty."),
    );
    expect(() => resolveRuntimeConfig(["--benchmark", "   "])).toThrow(
      new CliUsageError("Invalid value for --benchmark: value must not be empty."),
    );
  });

  it("fails fast for invalid runtime environment values", () => {
    process.env.REPORT_LANG = "de";
    expect(() => resolveRuntimeConfig([])).toThrow(
      new CliUsageError("Invalid value for REPORT_LANG: de. Use one of: en, ru."),
    );

    delete process.env.REPORT_LANG;
    process.env.ENABLE_BENCHMARK = "maybe";
    expect(() => resolveRuntimeConfig([])).toThrow(
      new CliUsageError(
        "Invalid value for ENABLE_BENCHMARK: maybe. Use true/false.",
      ),
    );

    delete process.env.ENABLE_BENCHMARK;
    process.env.DB_PATH = "   ";
    expect(() => resolveRuntimeConfig([])).toThrow(
      new CliUsageError("Invalid value for DB_PATH: value must not be empty."),
    );
  });

  it("throws a CLI usage error when flag values are missing", () => {
    expect(() => resolveRuntimeConfig(["--db"])).toThrow(
      new CliUsageError("Missing value for --db"),
    );
    expect(() => resolveRuntimeConfig(["--format"])).toThrow(
      new CliUsageError("Missing value for --format"),
    );
    expect(() => resolveRuntimeConfig(["--capital"])).toThrow(
      new CliUsageError("Missing value for --capital"),
    );
  });
});
