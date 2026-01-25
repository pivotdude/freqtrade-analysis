import { Database } from "bun:sqlite";
import type { Trade, Order, TradingInfo } from "../types/trade.types";

/**
 * Сервис для работы с базой данных Freqtrade
 * Следует принципу Single Responsibility - отвечает только за доступ к данным
 */
export class DatabaseService {
  private db: Database;

  /**
   * @param dbPath Путь к файлу базы данных SQLite
   */
  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Получает все сделки из базы данных (открытые и закрытые)
   * @returns Массив сделок
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

    // Загружаем ордера для каждой сделки
    for (const trade of trades) {
      trade.orders = this.getOrdersForTrade(trade.id);
    }

    return trades;
  }

  /**
   * Получает общую информацию о торговле
   * @returns Информация о стратегии, режиме торговли и бирже
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
   * Получает все ордера для конкретной сделки
   * @param tradeId ID сделки
   * @returns Массив ордеров
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
   * Закрывает соединение с базой данных
   */
  close(): void {
    this.db.close();
  }
}
