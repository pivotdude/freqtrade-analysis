import type {
  Trade,
  Order,
  TradeStatistics,
  PairStatisticsReport,
  Drawdown,
  EnterTagStatisticsReport,
} from "../types/trade.types";
import {
  calculatePairStatistics as calculatePairStatisticsMetric,
  calculateEnterTagStatistics as calculateEnterTagStatisticsMetric,
  sortByProfit as sortByProfitMetric,
  getTopProfitable as getTopProfitableMetric,
  getTopLosing as getTopLosingMetric,
} from "./metrics/reportMetrics";
import {
  calculateMaxDrawdown as calculateMaxDrawdownMetric,
  calculateSharpeAndSortinoRatios as calculateSharpeAndSortinoRatiosMetric,
  calculateExposure,
} from "./metrics/riskMetrics";

/**
 * Trade analyzer.
 * Follows Single Responsibility for analytics and metric calculations.
 */
export class TradeAnalyzer {
  /**
   * Computes overall statistics for all trades.
   * @param trades Trade list
   * @returns Statistics object
   */
  async calculateStatistics(
    trades: Trade[],
    exposureTrades: Trade[] = trades,
  ): Promise<TradeStatistics> {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        avgProfit: 0,
        winRate: 0,
        totalFees: 0,
        profitFactor: 1,
        expectancy: 0,
        maxOpenTrades: 0,
        maxExposureAmount: 0,
        totalSlippage: 0,
        averageSlippage: 0,
        avgProfitPerHourPct: 0,
        avgFeePct: 0,
      };
    }
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => (t.close_profit_abs || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.close_profit_abs || 0) < 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.close_profit_abs || 0), 0);
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0;

    const profitableTradesAbs = trades.filter(t => (t.close_profit_abs || 0) > 0);
    const losingTradesAbs = trades.filter(t => (t.close_profit_abs || 0) < 0);

    const avgWin = profitableTrades > 0 ? profitableTradesAbs.reduce((sum, t) => sum + (t.close_profit_abs || 0), 0) / profitableTrades : 0;
    const avgLoss = losingTrades > 0 ? Math.abs(losingTradesAbs.reduce((sum, t) => sum + (t.close_profit_abs || 0), 0)) / losingTrades : 0;

    const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);

    const grossProfit = trades.reduce((sum, t) => sum + Math.max(0, (t.close_profit_abs || 0)), 0);
    const grossLoss = trades.reduce((sum, t) => sum + Math.abs(Math.min(0, (t.close_profit_abs || 0))), 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 1);
    const totalFees = trades.reduce((sum, t) => sum + (t.fee_open_cost || 0) + (t.fee_close_cost || 0), 0);

    let totalSlippage = 0;
    let slippageCount = 0;

    for (const trade of trades) {
      const tradeSlippage = this.calculateEntrySlippage(trade);
      if (tradeSlippage !== undefined) {
        totalSlippage += tradeSlippage;
        slippageCount++;
      }
    }

    const averageSlippage = slippageCount > 0 ? totalSlippage / slippageCount : 0;

    let totalProfitPct = 0;
    let totalDurationMinutes = 0;

    for (const trade of trades) {
        if (trade.close_date && trade.close_profit && trade.open_date) {
            const duration_minutes = (new Date(trade.close_date).getTime() - new Date(trade.open_date).getTime()) / 60000;
            if (duration_minutes > 0) {
                totalProfitPct += trade.close_profit;
                totalDurationMinutes += duration_minutes;
            }
        }
    }

    const avgProfitPerHourPct = totalDurationMinutes > 0 ? (totalProfitPct * 100 / totalDurationMinutes) * 60 : 0;

    const profitableTradesWithProfit = trades.filter(
      (t): t is Trade & { close_profit_abs: number } =>
        typeof t.close_profit_abs === "number" && t.close_profit_abs > 0,
    );
    const totalFeesOnProfitable = profitableTradesWithProfit.reduce((sum, t) => sum + (t.fee_open_cost || 0) + (t.fee_close_cost || 0), 0);
    const totalProfitOnProfitable = profitableTradesWithProfit.reduce((sum, t) => sum + t.close_profit_abs, 0);
    const avgFeePct = totalProfitOnProfitable > 0 ? (totalFeesOnProfitable / totalProfitOnProfitable) * 100 : 0;

    const { maxOpenTrades, maxExposureAmount } = calculateExposure(exposureTrades);

    return {
      totalTrades,
      profitableTrades,
      losingTrades,
      totalProfit,
      avgProfit,
      winRate,
      totalFees,
      profitFactor,
      expectancy,
      maxOpenTrades,
      maxExposureAmount,
      totalSlippage,
      averageSlippage,
      avgProfitPerHourPct,
      avgFeePct,
    };
  }

  private calculateEntrySlippage(trade: Trade): number | undefined {
    if (!trade.orders || trade.orders.length === 0) {
      return undefined;
    }

    const entrySide = trade.is_short === 1 ? "sell" : "buy";
    const entryOrders = trade.orders.filter((order) => order.ft_order_side === entrySide);
    if (entryOrders.length === 0) {
      return undefined;
    }

    let expectedNotional = 0;
    let executedNotional = 0;

    for (const order of entryOrders) {
      const values = this.resolveOrderExecution(order);
      if (!values) {
        continue;
      }

      expectedNotional += values.referencePrice * values.executedAmount;
      executedNotional += values.executedPrice * values.executedAmount;
    }

    if (expectedNotional <= 0) {
      return undefined;
    }

    if (entrySide === "buy") {
      return ((executedNotional - expectedNotional) / expectedNotional) * 100;
    }
    return ((expectedNotional - executedNotional) / expectedNotional) * 100;
  }

  private resolveOrderExecution(order: Order): {
    referencePrice: number;
    executedPrice: number;
    executedAmount: number;
  } | undefined {
    if (!order.ft_price || order.ft_price <= 0) {
      return undefined;
    }

    const executedPrice =
      (order.average && order.average > 0 && order.average)
      || ((order.cost && order.cost > 0 && order.filled && order.filled > 0) ? order.cost / order.filled : undefined);
    if (!executedPrice) {
      return undefined;
    }

    const executedAmount =
      (order.filled && order.filled > 0 && order.filled)
      || ((order.cost && order.cost > 0) ? order.cost / executedPrice : undefined);
    if (!executedAmount) {
      return undefined;
    }

    return {
      referencePrice: order.ft_price,
      executedPrice,
      executedAmount,
    };
  }
  /**
   * Groups statistics by trading pair.
   * @param trades Trade list
   * @returns Pair statistics list
   */
  calculatePairStatistics(trades: Trade[]): PairStatisticsReport[] {
    return calculatePairStatisticsMetric(trades);
  }

  /**
   * Groups statistics by entry tags.
   * @param trades Trade list
   * @returns Entry tag statistics list
   */
  calculateEnterTagStatistics(trades: Trade[]): EnterTagStatisticsReport[] {
    return calculateEnterTagStatisticsMetric(trades);
  }

  /**
   * Estimates a capital baseline from the maximum observed concurrent stake exposure.
   * This is not account equity and does not account for deposits or withdrawals.
   * @param trades Trade list, open and closed.
   * @returns Estimated capital baseline or undefined when it cannot be inferred.
   */
  estimateCapitalBaseline(trades: Trade[]): number | undefined {
    const { maxExposureAmount } = calculateExposure(trades);
    return maxExposureAmount > 0 ? maxExposureAmount : undefined;
  }

  /**
   * Calculates maximum drawdown on balance.
   * @param trades List of **closed** trades.
   * @param initialCapital Initial capital.
   * @returns Drawdown metrics object.
   */
  calculateMaxDrawdown(trades: Trade[], initialCapital: number): Drawdown {
    return calculateMaxDrawdownMetric(trades, initialCapital);
  }

  /**
   * Sorts trades by absolute profit (descending).
   * @param trades Trade list
   * @returns Sorted trade list
   */
  sortByProfit(trades: Trade[]): Trade[] {
    return sortByProfitMetric(trades);
  }

  /**
   * Returns top N profitable trades.
   * @param trades Trade list
   * @param count Number of trades
   * @returns Top profitable trades
   */
  getTopProfitable(trades: Trade[], count: number = 3): Trade[] {
    return getTopProfitableMetric(trades, count);
  }

  /**
   * Returns top N losing trades.
   * @param trades Trade list
   * @param count Number of trades
   * @returns Top losing trades
   */
  getTopLosing(trades: Trade[], count: number = 3): Trade[] {
    return getTopLosingMetric(trades, count);
  }

  /**
   * Calculates Sharpe and Sortino ratios.
   * Uses per-trade returns instead of a full equity time series.
   * @param trades List of closed trades.
   * @param initialCapital Initial capital.
   * @param riskFreeRate Risk-free rate (default: 0).
   * @returns Ratios object.
   */
  calculateSharpeAndSortinoRatios(trades: Trade[], initialCapital: number, riskFreeRate: number = 0): { sharpeRatio: number; sortinoRatio: number; } {
    return calculateSharpeAndSortinoRatiosMetric(trades, initialCapital, riskFreeRate);
  }
}
