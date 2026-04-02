import { describe, expect, it } from "bun:test";
import { DateFormatter } from "../formatters/DateFormatter";
import { MarkdownReportGenerator } from "../generators/MarkdownReportGenerator";
import { JsonReportRenderer } from "./JsonReportRenderer";
import { MarkdownReportRenderer } from "./MarkdownReportRenderer";
import { ToonReportRenderer } from "./ToonReportRenderer";
import type { AnalysisReportPayload } from "../types/report.types";
import type { Trade } from "../types/trade.types";

function createTrade(overrides: Partial<Trade>): Trade {
  return {
    id: 1,
    pair: "BTC/USDT",
    open_date: "2024-01-01T00:00:00Z",
    close_date: "2024-01-01T01:00:00Z",
    open_rate: 100,
    close_rate: 110,
    stake_amount: 1000,
    amount: 1,
    close_profit: 0.1,
    close_profit_abs: 100,
    exit_reason: "roi",
    enter_tag: "signal",
    strategy: "test-strategy",
    is_short: 0,
    is_open: 0,
    leverage: 1,
    max_rate: null,
    min_rate: null,
    fee_open: null,
    fee_open_cost: 1,
    fee_close: null,
    fee_close_cost: 1,
    orders: [],
    ...overrides,
  };
}

function createPayload(): AnalysisReportPayload {
  const trade = createTrade({});
  return {
    generatedAt: "2026-04-03T00:00:00.000Z",
    language: "en",
    trades: [trade],
    statistics: {
      totalTrades: 1,
      profitableTrades: 1,
      losingTrades: 0,
      totalProfit: 100,
      avgProfit: 100,
      winRate: 100,
      totalFees: 2,
      profitFactor: 10,
      expectancy: 100,
      avgProfitPerHourPct: 10,
      avgFeePct: 2,
      totalSlippage: 0,
      averageSlippage: 0,
      maxOpenTrades: 1,
      maxExposureAmount: 1000,
    },
    pairStats: [{ pair: "BTC/USDT", stats: { count: 1, profit: 100, wins: 1 } }],
    tagStats: [{ tag: "signal", stats: { count: 1, wins: 1, totalProfit: 100 } }],
    topProfitable: [trade],
    topLosing: [trade],
    tradingInfo: {
      strategy: "test-strategy",
      tradingMode: "spot",
      exchange: "binance",
      firstTradeDate: "2024-01-01T00:00:00Z",
      capitalBaseline: 1000,
      capitalBaselineSource: "manual",
    },
  };
}

describe("report renderers", () => {
  it("renders markdown from unified payload", () => {
    const renderer = new MarkdownReportRenderer(
      new MarkdownReportGenerator(new DateFormatter("en"), "en"),
    );
    const result = renderer.render(createPayload());

    expect(result).toContain("# Freqtrade Trades Report");
    expect(result).toContain("## Overall Statistics");
    expect(result).toContain("Trade #1");
  });

  it("renders pretty JSON from unified payload", () => {
    const renderer = new JsonReportRenderer();
    const result = renderer.render(createPayload());

    expect(result).toStartWith("{\n");
    expect(result).toContain('"generatedAt": "2026-04-03T00:00:00.000Z"');
    expect(result).toContain('"statistics": {');
  });

  it("renders toon format from unified payload", () => {
    const renderer = new ToonReportRenderer();
    const result = renderer.render(createPayload());

    expect(result).toContain("generatedAt:");
    expect(result).toContain("language: en");
    expect(result).toContain("statistics:");
  });
});
