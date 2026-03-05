import type {
  Trade,
  PairStatistics,
  PairStatisticsReport,
  EnterTagStatistics,
  EnterTagStatisticsReport,
} from "../../types/trade.types";

export function calculatePairStatistics(trades: Trade[]): PairStatisticsReport[] {
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
    stats,
  }));
}

export function calculateEnterTagStatistics(trades: Trade[]): EnterTagStatisticsReport[] {
  const tagStatsMap = new Map<string, EnterTagStatistics>();

  for (const trade of trades) {
    if (!trade.enter_tag) continue;
    const tags = trade.enter_tag.split(" ");

    for (const tag of tags) {
      if (!tag) continue;

      const stats = tagStatsMap.get(tag) || { count: 0, wins: 0, totalProfit: 0 };
      stats.count++;
      stats.totalProfit += trade.close_profit_abs || 0;
      if ((trade.close_profit_abs || 0) > 0) {
        stats.wins++;
      }
      tagStatsMap.set(tag, stats);
    }
  }

  return Array.from(tagStatsMap.entries())
    .map(([tag, stats]) => ({
      tag,
      stats,
    }))
    .sort((a, b) => b.stats.count - a.stats.count);
}

export function sortByProfit(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (b.close_profit_abs || 0) - (a.close_profit_abs || 0));
}

export function getTopProfitable(trades: Trade[], count: number = 3): Trade[] {
  const sorted = sortByProfit(trades);
  return sorted.slice(0, Math.min(count, sorted.length));
}

export function getTopLosing(trades: Trade[], count: number = 3): Trade[] {
  const sorted = sortByProfit(trades);
  const startIndex = Math.max(0, sorted.length - count);
  return sorted.slice(startIndex).reverse();
}
