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

    if (trades.length === 0) {
      return trades;
    }

    const tradeIds = trades.map((trade) => trade.id);
    const placeholders = tradeIds.map(() => "?").join(", ");
    const ordersQuery = this.db.query<Order, number[]>(`
      SELECT
        id, ft_trade_id, ft_order_side, ft_pair, ft_is_open,
        ft_amount, ft_price, order_id, status, order_type,
        side, price, average, amount, filled, cost,
        order_date, order_filled_date, ft_order_tag
      FROM orders
      WHERE ft_trade_id IN (${placeholders})
      ORDER BY ft_trade_id ASC, order_date ASC
    `);

    const orders = ordersQuery.all(...tradeIds);
    const ordersByTradeId = new Map<number, Order[]>();

    for (const order of orders) {
      const current = ordersByTradeId.get(order.ft_trade_id);
      if (current) {
        current.push(order);
      } else {
        ordersByTradeId.set(order.ft_trade_id, [order]);
      }
    }

    for (const trade of trades) {
      trade.orders = ordersByTradeId.get(trade.id) ?? [];
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
        t.strategy,
        t.trading_mode,
        t.exchange,
        (
          SELECT MIN(open_date)
          FROM trades
          WHERE strategy IS NOT NULL
        ) AS first_trade_date
      FROM trades t
      WHERE t.strategy IS NOT NULL
      ORDER BY t.open_date ASC, t.id ASC
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
   * Closes database connection.
   */
  close(): void {
    this.db.close();
  }
}
