import type { AnalysisReportPayload } from "../types/report.types";

export interface ReportRenderer {
  render(payload: AnalysisReportPayload): string;
}

