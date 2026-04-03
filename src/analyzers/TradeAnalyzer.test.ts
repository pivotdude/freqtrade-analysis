import { describe, expect, it } from "bun:test";
import { TradeAnalyzer } from "./TradeAnalyzer";
import type { Order, Trade } from "../types/trade.types";

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

function createOrder(overrides: Partial<Order>): Order {
  return {
    id: 1,
    ft_trade_id: 1,
    ft_order_side: "buy",
    ft_pair: "BTC/USDT",
    ft_is_open: 0,
    ft_amount: 1,
    ft_price: 100,
    order_id: "order-1",
    status: "closed",
    order_type: "limit",
    side: "buy",
    price: 100,
    average: 100,
    amount: 1,
    filled: 1,
    cost: 100,
    order_date: "2024-01-01T00:00:00Z",
    order_filled_date: "2024-01-01T00:00:01Z",
    ft_order_tag: "entry",
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

  it("estimates capital baseline from max concurrent exposure", () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        open_date: "2024-01-01T00:00:00Z",
        close_date: "2024-01-01T03:00:00Z",
        stake_amount: 1000,
      }),
      createTrade({
        id: 2,
        open_date: "2024-01-01T01:00:00Z",
        close_date: "2024-01-01T04:00:00Z",
        stake_amount: 500,
      }),
      createTrade({
        id: 3,
        open_date: "2024-01-01T05:00:00Z",
        close_date: "2024-01-01T06:00:00Z",
        stake_amount: 250,
      }),
    ];

    expect(analyzer.estimateCapitalBaseline(trades)).toBe(1500);
  });

  it("calculates exposure metrics from full trade set when provided", async () => {
    const analyzer = new TradeAnalyzer();
    const closedTrades: Trade[] = [
      createTrade({
        id: 1,
        open_date: "2024-01-01T00:00:00Z",
        close_date: "2024-01-01T02:00:00Z",
        stake_amount: 1000,
      }),
    ];
    const allTrades: Trade[] = [
      ...closedTrades,
      createTrade({
        id: 2,
        open_date: "2024-01-01T01:00:00Z",
        close_date: null,
        close_rate: null,
        close_profit: null,
        close_profit_abs: null,
        exit_reason: null,
        is_open: 1,
        stake_amount: 500,
        fee_close_cost: null,
      }),
    ];

    const stats = await analyzer.calculateStatistics(closedTrades, allTrades);

    expect(stats.totalTrades).toBe(1);
    expect(stats.maxOpenTrades).toBe(2);
    expect(stats.maxExposureAmount).toBe(1500);
  });

  it("keeps closed-trade profit metrics while deriving exposure from open trades", async () => {
    const analyzer = new TradeAnalyzer();
    const closedTrades: Trade[] = [
      createTrade({
        id: 1,
        close_profit_abs: 120,
        open_date: "2024-01-01T00:00:00Z",
        close_date: "2024-01-01T02:00:00Z",
        stake_amount: 1000,
      }),
    ];
    const exposureTrades: Trade[] = [
      ...closedTrades,
      createTrade({
        id: 2,
        open_date: "2024-01-01T01:00:00Z",
        close_date: null,
        close_rate: null,
        close_profit: null,
        close_profit_abs: null,
        exit_reason: null,
        is_open: 1,
        stake_amount: 700,
        fee_close_cost: null,
      }),
    ];

    const stats = await analyzer.calculateStatistics(closedTrades, exposureTrades);

    expect(stats.totalTrades).toBe(1);
    expect(stats.totalProfit).toBe(120);
    expect(stats.maxOpenTrades).toBe(2);
    expect(stats.maxExposureAmount).toBe(1700);
  });

  it("calculates direction-aware slippage for long and short entries", async () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        is_short: 0,
        orders: [createOrder({ ft_order_side: "buy", ft_price: 100, average: 101, filled: 1 })],
      }),
      createTrade({
        id: 2,
        is_short: 1,
        orders: [createOrder({ ft_order_side: "sell", side: "sell", ft_price: 100, average: 99, filled: 1 })],
      }),
    ];

    const stats = await analyzer.calculateStatistics(trades);

    expect(stats.totalSlippage).toBeCloseTo(2, 10);
    expect(stats.averageSlippage).toBeCloseTo(1, 10);
  });

  it("handles partial fills and missing average by using order cost/filled", async () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        is_short: 0,
        orders: [
          createOrder({ id: 11, ft_order_side: "buy", ft_price: 100, average: null, filled: 0.4, cost: 40.4 }),
          createOrder({ id: 12, ft_order_side: "buy", ft_price: 100, average: 101, filled: 0.6, cost: 60.6 }),
          createOrder({ id: 13, ft_order_side: "buy", ft_price: 100, average: null, filled: null, cost: null, amount: null, price: null }),
        ],
      }),
    ];

    const stats = await analyzer.calculateStatistics(trades);

    expect(stats.totalSlippage).toBeCloseTo(1, 10);
    expect(stats.averageSlippage).toBeCloseTo(1, 10);
  });

  it("ignores non-filled orders even when limit price and amount are present", async () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        is_short: 0,
        orders: [
          createOrder({ id: 21, ft_order_side: "buy", ft_price: 100, average: 101, filled: 1 }),
          createOrder({
            id: 22,
            ft_order_side: "buy",
            ft_price: 100,
            average: null,
            filled: null,
            cost: null,
            amount: 5,
            price: 98,
            status: "open",
          }),
        ],
      }),
    ];

    const stats = await analyzer.calculateStatistics(trades);

    expect(stats.totalSlippage).toBeCloseTo(1, 10);
    expect(stats.averageSlippage).toBeCloseTo(1, 10);
  });

  it("ignores non-entry-side fills when calculating slippage", async () => {
    const analyzer = new TradeAnalyzer();
    const trades: Trade[] = [
      createTrade({
        id: 1,
        is_short: 0,
        orders: [
          createOrder({ id: 31, ft_order_side: "buy", ft_price: 100, average: 101, filled: 1 }),
          createOrder({ id: 32, ft_order_side: "sell", side: "sell", ft_price: 120, average: 90, filled: 1 }),
        ],
      }),
    ];

    const stats = await analyzer.calculateStatistics(trades);

    expect(stats.totalSlippage).toBeCloseTo(1, 10);
    expect(stats.averageSlippage).toBeCloseTo(1, 10);
  });
});
