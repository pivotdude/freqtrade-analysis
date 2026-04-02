import { encode } from "@toon-format/toon";
import type { AnalysisReportPayload } from "../types/report.types";
import type { ReportRenderer } from "./ReportRenderer";

export class ToonReportRenderer implements ReportRenderer {
  render(payload: AnalysisReportPayload): string {
    return encode(payload);
  }
}
