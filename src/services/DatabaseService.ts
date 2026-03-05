import { Database } from "bun:sqlite";
import type { Trade, Order, TradingInfo } from "../types/trade.types";

/**
 * Freqtrade database access service.
 * Follows Single Responsibility by handling data access only.
 */
export class DatabaseService {
  private db: Database;

  /**
   * @param dbPath Path to SQLite database file
   */
  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Fetches all trades from database (open and closed).
   * @returns Trade list
   */
  getAllTrades(): Trade[] {
    const tradesQuery = this.db.query<Trade, []>(`
      SELECT
        id, pair, open_date, close_date, open_rate, close_rate,
        stake_amount, amount, close_profit, close_profit_abs,
        exit_reason, enter_tag, strategy, is_short, leverage,
        max_rate, min_rate, is_open,
        fee_open, fee_open_cost, fee_close, fee_close_cost
      FROM trades
      ORDER BY open_date DESC
    `);

    const trades = tradesQuery.all();

    // Load orders for each trade
    for (const trade of trades) {
      trade.orders = this.getOrdersForTrade(trade.id);
    }

    return trades;
  }

  /**
   * Fetches high-level trading information.
   * @returns Strategy, trading mode and exchange details
   */
  getTradingInfo(): TradingInfo {
    const infoQuery = this.db.query<{
      strategy: string;
      trading_mode: string;
      exchange: string;
      first_trade_date: string;
    }, []>(`
      SELECT
        strategy,
        trading_mode,
        exchange,
        MIN(open_date) as first_trade_date
      FROM trades
      WHERE strategy IS NOT NULL
      LIMIT 1
    `);

    const result = infoQuery.get();

    return {
      strategy: result?.strategy || 'Unknown',
      tradingMode: result?.trading_mode || 'Unknown',
      exchange: result?.exchange || 'Unknown',
      firstTradeDate: result?.first_trade_date || 'Unknown'
    };
  }

  /**
   * Fetches all orders for a specific trade.
   * @param tradeId Trade ID
   * @returns Order list
   */
  private getOrdersForTrade(tradeId: number): Order[] {
    const ordersQuery = this.db.query<Order, [number]>(`
      SELECT
        id, ft_trade_id, ft_order_side, ft_pair, ft_is_open,
        ft_amount, ft_price, order_id, status, order_type,
        side, price, average, amount, filled, cost,
        order_date, order_filled_date, ft_order_tag
      FROM orders
      WHERE ft_trade_id = ?
      ORDER BY order_date ASC
    `);

    return ordersQuery.all(tradeId);
  }

  /**
   * Closes database connection.
   */
  close(): void {
    this.db.close();
  }
}
