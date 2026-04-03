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
});
