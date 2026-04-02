import type {
  ReportContentFormat,
  ReportDeliveryChannel,
  ReportOutputFormat,
} from "../types/report.types";

export interface OutputMode {
  delivery: ReportDeliveryChannel;
  content: ReportContentFormat;
}

export function normalizeOutputMode(format: ReportOutputFormat): OutputMode {
  switch (format) {
    case "file":
      return { delivery: "file", content: "md" };
    case "md":
      return { delivery: "stdout", content: "md" };
    case "json":
      return { delivery: "stdout", content: "json" };
    case "toon":
      return { delivery: "stdout", content: "toon" };
  }
}

