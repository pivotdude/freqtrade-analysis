import type { Trade, Drawdown } from "../../types/trade.types";

export function calculateMaxDrawdown(trades: Trade[], initialCapital: number): Drawdown {
  const sortedTrades = [...trades].sort((a, b) => {
    if (!a.close_date || !b.close_date) return 0;
    return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();
  });

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
  return { maxDrawdown, maxDrawdownAbs, peakBalance };
}

export function calculateSharpeAndSortinoRatios(
  trades: Trade[],
  initialCapital: number,
  riskFreeRate: number = 0,
): { sharpeRatio: number; sortinoRatio: number } {
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
    const tradeReturn = balance > 0 ? profit / balance : 0;
    returns.push(tradeReturn);
    balance += profit;
  }

  const avgReturn = calculateAverage(returns);
  const stdDev = calculateStdDev(returns, avgReturn);
  const downsideStdDev = calculateDownsideStdDev(returns, riskFreeRate);

  const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  const sortinoRatio =
    downsideStdDev > 0
      ? (avgReturn - riskFreeRate) / downsideStdDev
      : avgReturn - riskFreeRate > 0
        ? Infinity
        : 0;

  return { sharpeRatio, sortinoRatio };
}

export function calculateExposure(
  trades: Trade[],
): { maxOpenTrades: number; maxExposureAmount: number } {
  interface TradeEvent {
    date: Date;
    type: "open" | "close";
    stake: number;
  }

  const events: TradeEvent[] = [];

  for (const trade of trades) {
    events.push({ date: new Date(trade.open_date), type: "open", stake: trade.stake_amount });
    if (trade.close_date) {
      events.push({ date: new Date(trade.close_date), type: "close", stake: trade.stake_amount });
    }
  }

  events.sort((a, b) => {
    if (a.date.getTime() === b.date.getTime()) {
      if (a.type === "close" && b.type === "open") return -1;
      if (a.type === "open" && b.type === "close") return 1;
      return 0;
    }
    return a.date.getTime() - b.date.getTime();
  });

  let currentOpenTrades = 0;
  let currentExposureAmount = 0;
  let maxOpenTrades = 0;
  let maxExposureAmount = 0;

  for (const event of events) {
    if (event.type === "open") {
      currentOpenTrades++;
      currentExposureAmount += event.stake;
    } else {
      currentOpenTrades--;
      currentExposureAmount -= event.stake;
    }

    maxOpenTrades = Math.max(maxOpenTrades, currentOpenTrades);
    maxExposureAmount = Math.max(maxExposureAmount, currentExposureAmount);
  }

  return { maxOpenTrades, maxExposureAmount };
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

function calculateStdDev(numbers: number[], avg: number): number {
  if (numbers.length < 2) return 0;
  const variance =
    numbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (numbers.length - 1);
  return Math.sqrt(variance);
}

function calculateDownsideStdDev(numbers: number[], target: number): number {
  const negativeReturns = numbers.filter((r) => r < target);
  if (negativeReturns.length < 2) return 0;

  const squaredDiffs = negativeReturns.map((r) => Math.pow(r - target, 2));
  const sumOfSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0);
  return Math.sqrt(sumOfSquaredDiffs / (negativeReturns.length - 1));
}
