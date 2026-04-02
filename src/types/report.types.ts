import type {
  EnterTagStatisticsReport,
  PairStatisticsReport,
  Trade,
  TradeStatistics,
  TradingInfo,
} from "./trade.types";
import type { ReportLanguage } from "./i18n.types";

export type ReportOutputFormat = "file" | "md" | "json" | "toon";
export type ReportDeliveryChannel = "file" | "stdout";
export type ReportContentFormat = "md" | "json" | "toon";

export interface AnalysisReportPayload {
  generatedAt: string;
  language: ReportLanguage;
  trades: Trade[];
  statistics: TradeStatistics;
  pairStats: PairStatisticsReport[];
  tagStats: EnterTagStatisticsReport[];
  topProfitable: Trade[];
  topLosing: Trade[];
  tradingInfo: TradingInfo;
}

