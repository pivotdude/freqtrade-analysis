import { describe, expect, it } from "bun:test";
import { normalizeOutputMode } from "./outputMode";

describe("normalizeOutputMode", () => {
  it("maps file format to file delivery + markdown content", () => {
    expect(normalizeOutputMode("file")).toEqual({ delivery: "file", content: "md" });
  });

  it("maps stdout formats to stdout delivery", () => {
    expect(normalizeOutputMode("md")).toEqual({ delivery: "stdout", content: "md" });
    expect(normalizeOutputMode("json")).toEqual({ delivery: "stdout", content: "json" });
    expect(normalizeOutputMode("toon")).toEqual({ delivery: "stdout", content: "toon" });
  });
});

