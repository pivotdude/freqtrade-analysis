import type { AnalysisReportPayload } from "../types/report.types";
import type { ReportRenderer } from "./ReportRenderer";

export class JsonReportRenderer implements ReportRenderer {
  render(payload: AnalysisReportPayload): string {
    return JSON.stringify(payload, null, 2);
  }
}

