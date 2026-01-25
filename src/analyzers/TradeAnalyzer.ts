import type { Trade, TradeStatistics, PairStatistics, PairStatisticsReport, Drawdown, EnterTagStatistics, EnterTagStatisticsReport } from "../types/trade.types";
import { MarketDataService } from "../services/MarketDataService";

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
  async calculateStatistics(trades: Trade[]): Promise<TradeStatistics> {
    if (trades.length === 0) {
      return { /* return empty/default stats */ };
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
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const totalFees = trades.reduce((sum, t) => sum + (t.fee_open_cost || 0) + (t.fee_close_cost || 0), 0);

    let totalSlippage = 0;
    let slippageCount = 0;

    for (const trade of trades) {
      if (trade.orders) {
        for (const order of trade.orders) {
          // Assuming 'buy' orders are relevant for slippage on entry
          // ft_order_side could be 'buy' or 'sell'
          // We are interested in the slippage when opening a position, so 'buy' for long, 'sell' for short (if applicable)
          // For simplicity, let's consider 'buy' for now as typical entry
          if (order.ft_order_side === 'buy' && order.ft_price && order.average && order.ft_price > 0) {
            const slippage = ((order.average - order.ft_price) / order.ft_price) * 100;
            totalSlippage += slippage;
            slippageCount++;
          }
        }
      }
    }

    const averageSlippage = slippageCount > 0 ? totalSlippage / slippageCount : 0;

    let totalProfitPerHourPct = 0;
    let tradesWithDuration = 0;

    for (const trade of trades) {
        if (trade.close_date && trade.close_profit) {
            const duration_minutes = (new Date(trade.close_date).getTime() - new Date(trade.open_date).getTime()) / 60000;
            if (duration_minutes > 0) {
                const profit_per_hour_pct = (trade.close_profit * 100 / duration_minutes) * 60;
                totalProfitPerHourPct += profit_per_hour_pct;
                tradesWithDuration++;
            }
        }
    }

    const avgProfitPerHourPct = tradesWithDuration > 0 ? totalProfitPerHourPct / tradesWithDuration : 0;

    let totalFeePct = 0;
    let profitableTradesWithProfit = 0;
    for (const trade of trades) {
        if (trade.close_profit_abs && trade.close_profit_abs > 0) {
            const total_fee = (trade.fee_open_cost || 0) + (trade.fee_close_cost || 0);
            const fee_as_pct_of_profit = (total_fee / trade.close_profit_abs) * 100;
            totalFeePct += fee_as_pct_of_profit;
            profitableTradesWithProfit++;
        }
    }
    const avgFeePct = profitableTradesWithProfit > 0 ? totalFeePct / profitableTradesWithProfit : 0;

    const { maxOpenTrades, maxExposureAmount } = this._calculateExposure(trades);

    // Calculate Buy & Hold return
    let buyAndHoldReturn = 0;
    const sortedByOpenDate = [...trades].sort((a, b) => new Date(a.open_date).getTime() - new Date(b.open_date).getTime());
    const firstTradeDate = new Date(sortedByOpenDate[0].open_date);
    const lastTrade = [...trades].sort((a,b) => new Date(a.close_date).getTime() - new Date(b.close_date).getTime()).pop();
    
    if (lastTrade && lastTrade.close_date) {
        const lastTradeDate = new Date(lastTrade.close_date);
        const marketDataService = new MarketDataService();
        const benchmarkPair = 'BTC/USDT'; // Hardcoded for now

        try {
            const startPrice = await marketDataService.getHistoricalPrice(benchmarkPair, firstTradeDate);
            const endPrice = await marketDataService.getHistoricalPrice(benchmarkPair, lastTradeDate);

            if (startPrice > 0) {
                buyAndHoldReturn = ((endPrice - startPrice) / startPrice) * 100;
            }
        } catch (error) {
            console.warn(`\n⚠️ Could not calculate Buy & Hold return: ${(error as Error).message}`);
            buyAndHoldReturn = 0; // Gracefully handle error
        }
    }


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
      buyAndHoldReturn,
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
   * Группирует статистику по тегам входа
   * @param trades Массив сделок
   * @returns Массив статистики по тегам
   */
  calculateEnterTagStatistics(trades: Trade[]): EnterTagStatisticsReport[] {
    const tagStatsMap = new Map<string, EnterTagStatistics>();

    for (const trade of trades) {
      if (!trade.enter_tag) continue;

      // Freqtrade может иметь несколько тегов, разделенных пробелом
      const tags = trade.enter_tag.split(' ');

      for (const tag of tags) {
        if (!tag) continue; // Пропускаем пустые теги, если есть двойные пробелы

        const stats = tagStatsMap.get(tag) || { count: 0, wins: 0, totalProfit: 0 };
        stats.count++;
        stats.totalProfit += trade.close_profit_abs || 0;
        if ((trade.close_profit_abs || 0) > 0) {
          stats.wins++;
        }
        tagStatsMap.set(tag, stats);
      }
    }

    return Array.from(tagStatsMap.entries()).map(([tag, stats]) => ({
      tag,
      stats
    })).sort((a, b) => b.stats.count - a.stats.count); // Сортируем по количеству сделок
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

  /**
   * Рассчитывает коэффициенты Шарпа и Сортино.
   * Расчет основан на доходности каждой отдельной сделки, а не на временном ряде эквити.
   * @param trades Массив закрытых сделок.
   * @param initialCapital Начальный капитал.
   * @param riskFreeRate Безрисковая ставка для расчета. По умолчанию 0.
   * @returns Объект с коэффициентами.
   */
  calculateSharpeAndSortinoRatios(trades: Trade[], initialCapital: number, riskFreeRate: number = 0): { sharpeRatio: number; sortinoRatio: number; } {
    if (trades.length < 2) {
      return { sharpeRatio: 0, sortinoRatio: 0 };
    }

    const sortedTrades = [...trades].sort((a, b) => {
      if (!a.close_date || !b.close_date) return 0;
      return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();
    });

    const returns: number[] = [];
    let balance = initialCapital;

    for (const trade of sortedTrades) {
      const profit = trade.close_profit_abs || 0;
      // Доходность считаем относительно баланса *перед* закрытием этой сделки
      const tradeReturn = balance > 0 ? profit / balance : 0;
      returns.push(tradeReturn);
      // Обновляем баланс
      balance += profit;
    }

    const avgReturn = this._calculateAverage(returns);
    const stdDev = this._calculateStdDev(returns, avgReturn);
    const downsideStdDev = this._calculateDownsideStdDev(returns, riskFreeRate);

    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn - riskFreeRate) / downsideStdDev : 0;

    return { sharpeRatio, sortinoRatio };
  }

  private _calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return sum / numbers.length;
  }

  private _calculateStdDev(numbers: number[], avg: number): number {
    if (numbers.length < 2) return 0;
    const variance = numbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (numbers.length -1);
    return Math.sqrt(variance);
  }

  private _calculateDownsideStdDev(numbers: number[], target: number): number {
    const negativeReturns = numbers.filter(r => r < target);
    if (negativeReturns.length < 2) return 0;

    const squaredDiffs = negativeReturns.map(r => Math.pow(r - target, 2));
    const sumOfSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0);

    // Используем N-1 для несмещенной оценки, как и в общем стандартном отклонении
    return Math.sqrt(sumOfSquaredDiffs / (negativeReturns.length - 1));
  }

  /**
   * Рассчитывает максимальное количество одновременно открытых сделок
   * и максимальную сумму задействованного капитала (exposure).
   * @param trades Массив сделок.
   * @returns Объект с максимальным количеством открытых сделок и максимальным капиталом.
   */
  private _calculateExposure(trades: Trade[]): { maxOpenTrades: number; maxExposureAmount: number } {
    interface TradeEvent {
      date: Date;
      type: 'open' | 'close';
      stake: number;
    }

    const events: TradeEvent[] = [];

    for (const trade of trades) {
      events.push({ date: new Date(trade.open_date), type: 'open', stake: trade.stake_amount });
      if (trade.close_date) {
        events.push({ date: new Date(trade.close_date), type: 'close', stake: trade.stake_amount });
      }
    }

    // Сортируем события. Сначала по дате. Если даты равны, "close" идет раньше "open".
    events.sort((a, b) => {
      if (a.date.getTime() === b.date.getTime()) {
        if (a.type === 'close' && b.type === 'open') return -1; // close before open
        if (a.type === 'open' && b.type === 'close') return 1;  // open after close
        return 0;
      }
      return a.date.getTime() - b.date.getTime();
    });

    let currentOpenTrades = 0;
    let currentExposureAmount = 0;
    let maxOpenTrades = 0;
    let maxExposureAmount = 0;

    for (const event of events) {
      if (event.type === 'open') {
        currentOpenTrades++;
        currentExposureAmount += event.stake;
      } else { // event.type === 'close'
        currentOpenTrades--;
        currentExposureAmount -= event.stake;
      }

      maxOpenTrades = Math.max(maxOpenTrades, currentOpenTrades);
      maxExposureAmount = Math.max(maxExposureAmount, currentExposureAmount);
    }

    return { maxOpenTrades, maxExposureAmount };
  }
}
