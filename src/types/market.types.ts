export interface HistoricalPriceProvider {
  getHistoricalPrice(pair: string, date: Date): Promise<number>;
}
