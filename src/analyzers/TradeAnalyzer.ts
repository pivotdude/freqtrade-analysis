import type { Trade, TradeStatistics, PairStatistics, PairStatisticsReport, Drawdown } from "../types/trade.types";

/**
 * Анализатор сделок
 * Следует принципу Single Responsibility - отвечает только за анализ и вычисление статистики
 */
export class TradeAnalyzer {
  /**
   * Вычисляет общую статистику по всем сделкам
   * @param trades Массив сделок
   * @returns Объект со статистикой
   */
  calculateStatistics(trades: Trade[]): TradeStatistics {
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
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const totalFees = trades.reduce((sum, t) => sum + (t.fee_open_cost || 0) + (t.fee_close_cost || 0), 0);

    return {
      totalTrades,
      profitableTrades,
      losingTrades,
      totalProfit,
      avgProfit,
      winRate,
      totalFees,
      profitFactor,
      expectancy
    };
  }

  /**
   * Группирует статистику по торговым парам
   * @param trades Массив сделок
   * @returns Массив статистики по парам
   */
  calculatePairStatistics(trades: Trade[]): PairStatisticsReport[] {
    const pairStatsMap = new Map<string, PairStatistics>();

    for (const trade of trades) {
      const stats = pairStatsMap.get(trade.pair) || { count: 0, profit: 0, wins: 0 };
      stats.count++;
      stats.profit += trade.close_profit_abs || 0;
      if ((trade.close_profit_abs || 0) > 0) {
        stats.wins++;
      }
      pairStatsMap.set(trade.pair, stats);
    }

    return Array.from(pairStatsMap.entries()).map(([pair, stats]) => ({
      pair,
      stats
    }));
  }

  /**
   * Рассчитывает максимальную просадку по балансу.
   * @param trades Массив **закрытых** сделок.
   * @param initialCapital Начальный капитал.
   * @returns Объект с данными о просадке.
   */
  calculateMaxDrawdown(trades: Trade[], initialCapital: number): Drawdown {
    // Сортируем сделки по дате закрытия, так как просадка по балансу считается в момент фиксации прибыли/убытка.
    const sortedTrades = [...trades].sort((a, b) => {
      if (!a.close_date || !b.close_date) return 0;
      return new Date(a.close_date).getTime() - new Date(b.close_date).getTime()
    }
    );

    let balance = initialCapital;
    let peakBalance = initialCapital;
    let maxDrawdownAbs = 0;

    for (const trade of sortedTrades) {
      if (trade.close_profit_abs) {
        balance += trade.close_profit_abs;
      }

      if (balance > peakBalance) {
        peakBalance = balance;
      }

      const drawdown = peakBalance - balance;
      if (drawdown > maxDrawdownAbs) {
        maxDrawdownAbs = drawdown;
      }
    }

    const maxDrawdown = peakBalance > 0 ? (maxDrawdownAbs / peakBalance) * 100 : 0;

    return {
      maxDrawdown,
      maxDrawdownAbs,
      peakBalance
    };
  }

  /**
   * Сортирует сделки по прибыли (от максимальной к минимальной)
   * @param trades Массив сделок
   * @returns Отсортированный массив сделок
   */
  sortByProfit(trades: Trade[]): Trade[] {
    return [...trades].sort((a, b) =>
      (b.close_profit_abs || 0) - (a.close_profit_abs || 0)
    );
  }

  /**
   * Получает топ N прибыльных сделок
   * @param trades Массив сделок
   * @param count Количество сделок
   * @returns Массив топ прибыльных сделок
   */
  getTopProfitable(trades: Trade[], count: number = 3): Trade[] {
    const sorted = this.sortByProfit(trades);
    return sorted.slice(0, Math.min(count, sorted.length));
  }

  /**
   * Получает топ N убыточных сделок
   * @param trades Массив сделок
   * @param count Количество сделок
   * @returns Массив топ убыточных сделок
   */
  getTopLosing(trades: Trade[], count: number = 3): Trade[] {
    const sorted = this.sortByProfit(trades);
    const startIndex = Math.max(0, sorted.length - count);
    return sorted.slice(startIndex).reverse();
  }
}
