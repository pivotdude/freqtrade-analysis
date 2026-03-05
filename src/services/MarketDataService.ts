import type { HistoricalPriceProvider } from "../types/market.types";

/**
 * Service for loading historical prices via CCXT.
 * CCXT is imported lazily so core analysis can run without network dependencies.
 */
export class MarketDataService implements HistoricalPriceProvider {
  constructor(private readonly exchangeId: string = "binance") {}

  private async createExchange(): Promise<any> {
    const ccxtModule = await import("ccxt");
    const ccxt = ccxtModule as Record<string, unknown>;
    const ExchangeCtor = ccxt[this.exchangeId];
    if (typeof ExchangeCtor !== "function") {
      throw new Error(`Exchange '${this.exchangeId}' is not supported by CCXT.`);
    }
    return new (ExchangeCtor as new () => any)();
  }

  /**
   * Returns daily close price for the requested date.
   */
  async getHistoricalPrice(pair: string, date: Date): Promise<number> {
    const exchange = await this.createExchange();
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    try {
      const timeframe = "1d";
      const primaryCandles = await exchange.fetchOHLCV(
        pair,
        timeframe,
        startOfDay.getTime(),
        1,
      );
      const primaryClose = this.extractClosePrice(primaryCandles);
      if (primaryClose !== undefined) {
        return primaryClose;
      }

      const oneDayMs = 24 * 60 * 60 * 1000;
      const nearbyCandles = await exchange.fetchOHLCV(
        pair,
        timeframe,
        startOfDay.getTime() - oneDayMs,
        3,
      );
      const closestClose = this.extractClosestClosePrice(
        nearbyCandles,
        startOfDay.getTime(),
      );
      if (closestClose !== undefined) {
        return closestClose;
      }

      throw new Error(`No OHLCV data found for ${pair} around ${date.toISOString()}`);
    } catch (error) {
      console.error(`Error fetching historical price from ${exchange.id}:`, error);
      throw error;
    } finally {
      if (typeof exchange.close === "function") {
        await exchange.close();
      }
    }
  }

  private extractClosePrice(candles: unknown): number | undefined {
    if (!Array.isArray(candles) || candles.length === 0) {
      return undefined;
    }

    const first = candles[0];
    if (!Array.isArray(first)) {
      return undefined;
    }

    const close = first[4];
    return typeof close === "number" ? close : undefined;
  }

  private extractClosestClosePrice(
    candles: unknown,
    targetTimestamp: number,
  ): number | undefined {
    if (!Array.isArray(candles) || candles.length === 0) {
      return undefined;
    }

    const validCandles = candles.filter(
      (candle): candle is [number, unknown, unknown, unknown, number] =>
        Array.isArray(candle) &&
        typeof candle[0] === "number" &&
        typeof candle[4] === "number",
    );
    if (validCandles.length === 0) {
      return undefined;
    }

    const closest = validCandles.reduce((prev, curr) =>
      Math.abs(curr[0] - targetTimestamp) < Math.abs(prev[0] - targetTimestamp)
        ? curr
        : prev,
    );

    return closest[4];
  }
}
