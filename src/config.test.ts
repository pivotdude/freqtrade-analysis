import { describe, expect, it } from "bun:test";
import { resolveRuntimeConfig } from "./config";

describe("resolveRuntimeConfig", () => {
  it("uses auto capital baseline by default", () => {
    const config = resolveRuntimeConfig([]);

    expect(config.capitalMode).toBe("auto");
    expect(config.initialCapital).toBeUndefined();
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
});
