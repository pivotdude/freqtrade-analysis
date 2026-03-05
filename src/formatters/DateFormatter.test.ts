import { describe, expect, it } from "bun:test";
import { DateFormatter } from "./DateFormatter";

function stripDirectionMarks(value: string): string {
  return value.replace(/\u200e|\u200f/g, "");
}

describe("DateFormatter", () => {
  it("formats duration in english", () => {
    const formatter = new DateFormatter("en");

    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-03T05:30:00Z"),
    ).toBe("2d 5h");
    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-01T02:45:00Z"),
    ).toBe("2h 45m");
    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-01T00:09:00Z"),
    ).toBe("9m");
  });

  it("formats duration in russian", () => {
    const formatter = new DateFormatter("ru");

    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-03T05:30:00Z"),
    ).toBe("2д 5ч");
    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-01T02:45:00Z"),
    ).toBe("2ч 45м");
    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-01T00:09:00Z"),
    ).toBe("9м");
  });

  it("formats date in both locales with stable local-time input", () => {
    const input = "2024-07-01T13:05:00";
    const enFormatter = new DateFormatter("en");
    const ruFormatter = new DateFormatter("ru");

    const enFormatted = stripDirectionMarks(enFormatter.formatDate(input));
    const ruFormatted = stripDirectionMarks(ruFormatter.formatDate(input));

    expect(enFormatted).toContain("2024");
    expect(enFormatted).toContain("/");
    expect(enFormatted).toMatch(/\d{2}:\d{2}/);

    expect(ruFormatted).toContain("2024");
    expect(ruFormatted).toContain(".");
    expect(ruFormatted).toMatch(/\d{2}:\d{2}/);

    expect(enFormatted).not.toBe(ruFormatted);
  });

  it("handles edge-case short and long intervals", () => {
    const formatter = new DateFormatter("en");

    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
    ).toBe("0m");
    expect(
      formatter.formatDuration("2024-01-01T00:00:00Z", "2024-01-15T23:59:00Z"),
    ).toBe("14d 23h");
  });
});
