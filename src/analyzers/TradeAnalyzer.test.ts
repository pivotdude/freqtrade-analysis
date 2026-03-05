import { describe, expect, it } from "bun:test";
import { TradeAnalyzer } from "./TradeAnalyzer";
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
    ...overrides,
  };
}

describe("TradeAnalyzer", () => {
  it("handles empty trades", async () => {
    const analyzer = new TradeAnalyzer();
    const stats = await analyzer.calculateStatistics([]);

    expect(stats.totalTrades).toBe(0);
    expect(stats.profitableTrades).toBe(0);
    expect(stats.losingTrades).toBe(0);
    expect(stats.totalProfit).toBe(0);
    expect(stats.avgProfit).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(1);
    expect(stats.expectancy).toBe(0);
    expect(stats.maxOpenTrades).toBe(0);
    expect(stats.maxExposureAmount).toBe(0);
    expect(stats.buyAndHoldReturn).toBeUndefined();
  });

  it("calculates mixed wins and losses metrics", async () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        open_date: "2024-01-01T00:00:00Z",
        close_date: "2024-01-01T01:00:00Z",
        close_profit: 0.1,
        close_profit_abs: 100,
      }),
      createTrade({
        id: 2,
        open_date: "2024-01-01T01:00:00Z",
        close_date: "2024-01-01T02:00:00Z",
        close_profit: -0.04,
        close_profit_abs: -40,
      }),
      createTrade({
        id: 3,
        open_date: "2024-01-01T02:00:00Z",
        close_date: "2024-01-01T03:00:00Z",
        close_profit: 0.06,
        close_profit_abs: 60,
      }),
      createTrade({
        id: 4,
        open_date: "2024-01-01T03:00:00Z",
        close_date: "2024-01-01T04:00:00Z",
        close_profit: -0.02,
        close_profit_abs: -20,
      }),
    ];

    const stats = await analyzer.calculateStatistics(trades);

    expect(stats.totalTrades).toBe(4);
    expect(stats.profitableTrades).toBe(2);
    expect(stats.losingTrades).toBe(2);
    expect(stats.totalProfit).toBe(100);
    expect(stats.avgProfit).toBe(25);
    expect(stats.winRate).toBe(50);
    expect(stats.expectancy).toBe(25);
    expect(stats.totalFees).toBe(8);
    expect(stats.profitFactor).toBeCloseTo(160 / 60, 10);
    expect(stats.avgProfitPerHourPct).toBeCloseTo(2.5, 10);
  });

  it("returns top profitable and losing trades", () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({ id: 1, close_profit_abs: 100 }),
      createTrade({ id: 2, close_profit_abs: -40 }),
      createTrade({ id: 3, close_profit_abs: 60 }),
      createTrade({ id: 4, close_profit_abs: -20 }),
    ];

    const topProfitable = analyzer.getTopProfitable(trades, 2);
    const topLosing = analyzer.getTopLosing(trades, 2);

    expect(topProfitable.map((trade) => trade.id)).toEqual([1, 3]);
    expect(topLosing.map((trade) => trade.id)).toEqual([2, 4]);
  });

  it("calculates drawdown based on closed trades", () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        close_date: "2024-01-01T04:00:00Z",
        close_profit_abs: -100,
      }),
      createTrade({
        id: 2,
        close_date: "2024-01-01T01:00:00Z",
        close_profit_abs: 100,
      }),
      createTrade({
        id: 3,
        close_date: "2024-01-01T02:00:00Z",
        close_profit_abs: -50,
      }),
      createTrade({
        id: 4,
        close_date: "2024-01-01T05:00:00Z",
        close_profit_abs: 80,
      }),
    ];

    const drawdown = analyzer.calculateMaxDrawdown(trades, 1000);

    expect(drawdown.peakBalance).toBe(1100);
    expect(drawdown.maxDrawdownAbs).toBe(150);
    expect(drawdown.maxDrawdown).toBeCloseTo((150 / 1100) * 100, 10);
  });

  it("calculates valid sharpe and sortino ratios", () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({ id: 1, close_profit_abs: 50 }),
      createTrade({ id: 2, close_profit_abs: -20 }),
      createTrade({ id: 3, close_profit_abs: 30 }),
      createTrade({ id: 4, close_profit_abs: -10 }),
    ];

    const ratios = analyzer.calculateSharpeAndSortinoRatios(trades, 1000);

    expect(Number.isFinite(ratios.sharpeRatio)).toBe(true);
    expect(Number.isFinite(ratios.sortinoRatio)).toBe(true);
  });
});
