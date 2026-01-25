import * as ccxt from 'ccxt';

/**
 * A service to fetch market data from cryptocurrency exchanges.
 */
export class MarketDataService {
    // Initialize the exchange. We can make this configurable later.
    private exchange: ccxt.Exchange;

    constructor(exchangeId: string = 'binance') {
        if (!ccxt.pro.exchanges.includes(exchangeId)) {
            throw new Error(`Exchange '${exchangeId}' is not supported by CCXT.`);
        }
        this.exchange = new (ccxt.pro as any)[exchangeId]();
    }

    /**
     * Fetches the closing price of a trading pair for a specific date.
     * It retrieves the daily OHLCV data for the given date and returns the close price.
     * @param pair The trading pair (e.g., 'BTC/USDT').
     * @param date The date for which to fetch the price.
     * @returns The closing price.
     */
    public async getHistoricalPrice(pair: string, date: Date): Promise<number> {
        // CCXT uses a 'since' timestamp in milliseconds.
        // To get the candle for a specific day, we can set the time to the beginning of that day.
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const timeframe = '1d'; // Daily timeframe
        const limit = 1; // We only need one candle

        try {
            console.log(`Fetching historical price for ${pair} on ${startOfDay.toISOString()}...`);
            const ohlcv = await this.exchange.fetchOHLCV(pair, timeframe, startOfDay.getTime(), limit);

            if (ohlcv && ohlcv.length > 0) {
                const closePrice = ohlcv[0][4]; // [timestamp, open, high, low, close, volume]
                console.log(`Found close price: ${closePrice}`);
                return closePrice;
            } else {
                // If no candle was found for the exact start of the day,
                // let's try fetching a range and finding the closest one.
                // This can happen due to timezone differences or exchange data availability.
                console.log(`No candle found at the exact start of the day. Fetching a broader range...`);
                const oneDay = 24 * 60 * 60 * 1000;
                const broaderOhlcv = await this.exchange.fetchOHLCV(pair, timeframe, startOfDay.getTime() - oneDay, 3);
                const targetTimestamp = startOfDay.getTime();

                const closestCandle = broaderOhlcv.reduce((prev, curr) => {
                    return (Math.abs(curr[0] - targetTimestamp) < Math.abs(prev[0] - targetTimestamp) ? curr : prev);
                });

                if (closestCandle) {
                     const closePrice = closestCandle[4];
                     console.log(`Found closest candle price: ${closePrice}`);
                     return closePrice;
                }

                throw new Error(`No OHLCV data found for ${pair} around ${date.toISOString()}`);
            }
        } catch (error) {
            console.error(`Error fetching historical price from ${this.exchange.id}:`, error);
            // Re-throw the error to be handled by the caller
            throw error;
        }
    }
}
