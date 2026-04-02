import { MarkdownReportGenerator } from "../generators/MarkdownReportGenerator";
import type { AnalysisReportPayload } from "../types/report.types";
import type { ReportRenderer } from "./ReportRenderer";

export class MarkdownReportRenderer implements ReportRenderer {
  constructor(private readonly generator: MarkdownReportGenerator) {}

  render(payload: AnalysisReportPayload): string {
    return this.generator.generate(
      payload.trades,
      payload.statistics,
      payload.pairStats,
      payload.tagStats,
      payload.topProfitable,
      payload.topLosing,
      payload.tradingInfo,
    );
  }
}

