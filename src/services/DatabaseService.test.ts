import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DatabaseService } from "./DatabaseService";

const tempDirs: string[] = [];

function createDatabaseWithTrades(
  trades: Array<{ id: number; openDate: string; strategy: string | null; tradingMode: string | null; exchange: string | null }>,
): string {
  const tempDir = mkdtempSync(join(tmpdir(), "freqtrade-analys-db-"));
  tempDirs.push(tempDir);

  const dbPath = join(tempDir, "tradesv3.sqlite");
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE trades (
      id INTEGER PRIMARY KEY,
      pair TEXT NOT NULL,
      open_date TEXT NOT NULL,
      close_date TEXT,
      open_rate REAL NOT NULL,
      close_rate REAL,
      stake_amount REAL NOT NULL,
      amount REAL NOT NULL,
      close_profit REAL,
      close_profit_abs REAL,
      exit_reason TEXT,
      enter_tag TEXT,
      strategy TEXT,
      trading_mode TEXT,
      exchange TEXT,
      is_short INTEGER NOT NULL,
      leverage REAL,
      max_rate REAL,
      min_rate REAL,
      is_open INTEGER NOT NULL,
      fee_open REAL,
      fee_open_cost REAL,
      fee_close REAL,
      fee_close_cost REAL
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      ft_trade_id INTEGER NOT NULL,
      ft_order_side TEXT NOT NULL,
      ft_pair TEXT NOT NULL,
      ft_is_open INTEGER NOT NULL,
      ft_amount REAL NOT NULL,
      ft_price REAL NOT NULL,
      order_id TEXT NOT NULL,
      status TEXT,
      order_type TEXT,
      side TEXT,
      price REAL,
      average REAL,
      amount REAL,
      filled REAL,
      cost REAL,
      order_date TEXT,
      order_filled_date TEXT,
      ft_order_tag TEXT
    );
  `);

  const insertTrade = db.query(`
    INSERT INTO trades (
      id, pair, open_date, close_date, open_rate, close_rate,
      stake_amount, amount, close_profit, close_profit_abs,
      exit_reason, enter_tag, strategy, trading_mode, exchange,
      is_short, leverage, max_rate, min_rate, is_open,
      fee_open, fee_open_cost, fee_close, fee_close_cost
    ) VALUES (
      ?, 'BTC/USDT', ?, NULL, 100, NULL,
      1000, 1, NULL, NULL,
      NULL, NULL, ?, ?, ?,
      0, 1, NULL, NULL, 1,
      NULL, NULL, NULL, NULL
    )
  `);

  for (const trade of trades) {
    insertTrade.run(
      trade.id,
      trade.openDate,
      trade.strategy,
      trade.tradingMode,
      trade.exchange,
    );
  }

  db.close();

  return dbPath;
}

function insertOrder(
  dbPath: string,
  order: { id: number; tradeId: number; orderDate: string; side: string },
): void {
  const db = new Database(dbPath);
  const insert = db.query(`
    INSERT INTO orders (
      id, ft_trade_id, ft_order_side, ft_pair, ft_is_open,
      ft_amount, ft_price, order_id, status, order_type,
      side, price, average, amount, filled, cost,
      order_date, order_filled_date, ft_order_tag
    ) VALUES (
      ?, ?, ?, 'BTC/USDT', 0,
      1, 100, ?, 'closed', 'limit',
      ?, 100, 100, 1, 1, 100,
      ?, ?, NULL
    )
  `);

  insert.run(
    order.id,
    order.tradeId,
    order.side,
    `order-${order.id}`,
    order.side,
    order.orderDate,
    order.orderDate,
  );
  db.close();
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("DatabaseService.getTradingInfo", () => {
  it("returns earliest non-null strategy row deterministically", () => {
    const dbPath = createDatabaseWithTrades([
      {
        id: 2,
        openDate: "2024-02-01T00:00:00Z",
        strategy: "late-strategy",
        tradingMode: "futures",
        exchange: "kraken",
      },
      {
        id: 1,
        openDate: "2024-01-01T00:00:00Z",
        strategy: "early-strategy",
        tradingMode: "spot",
        exchange: "binance",
      },
    ]);

    const service = new DatabaseService(dbPath);
    const tradingInfo = service.getTradingInfo();
    service.close();

    expect(tradingInfo.strategy).toBe("early-strategy");
    expect(tradingInfo.tradingMode).toBe("spot");
    expect(tradingInfo.exchange).toBe("binance");
    expect(tradingInfo.firstTradeDate).toBe("2024-01-01T00:00:00Z");
  });

  it("breaks timestamp ties by id for deterministic output", () => {
    const dbPath = createDatabaseWithTrades([
      {
        id: 10,
        openDate: "2024-01-01T00:00:00Z",
        strategy: "same-time-high-id",
        tradingMode: "futures",
        exchange: "okx",
      },
      {
        id: 5,
        openDate: "2024-01-01T00:00:00Z",
        strategy: "same-time-low-id",
        tradingMode: "spot",
        exchange: "binance",
      },
    ]);

    const service = new DatabaseService(dbPath);
    const tradingInfo = service.getTradingInfo();
    service.close();

    expect(tradingInfo.strategy).toBe("same-time-low-id");
    expect(tradingInfo.tradingMode).toBe("spot");
    expect(tradingInfo.exchange).toBe("binance");
    expect(tradingInfo.firstTradeDate).toBe("2024-01-01T00:00:00Z");
  });

  it("returns Unknown fields when there are no rows with strategy", () => {
    const dbPath = createDatabaseWithTrades([
      {
        id: 1,
        openDate: "2024-01-01T00:00:00Z",
        strategy: null,
        tradingMode: "spot",
        exchange: "binance",
      },
    ]);

    const service = new DatabaseService(dbPath);
    const tradingInfo = service.getTradingInfo();
    service.close();

    expect(tradingInfo.strategy).toBe("Unknown");
    expect(tradingInfo.tradingMode).toBe("Unknown");
    expect(tradingInfo.exchange).toBe("Unknown");
    expect(tradingInfo.firstTradeDate).toBe("Unknown");
  });
});

describe("DatabaseService.getAllTrades", () => {
  it("loads orders for all trades in one pass and maps them by trade id", () => {
    const dbPath = createDatabaseWithTrades([
      {
        id: 2,
        openDate: "2024-02-01T00:00:00Z",
        strategy: "strat-2",
        tradingMode: "spot",
        exchange: "binance",
      },
      {
        id: 1,
        openDate: "2024-01-01T00:00:00Z",
        strategy: "strat-1",
        tradingMode: "spot",
        exchange: "binance",
      },
    ]);

    insertOrder(dbPath, {
      id: 100,
      tradeId: 1,
      orderDate: "2024-01-01T00:01:00Z",
      side: "buy",
    });
    insertOrder(dbPath, {
      id: 101,
      tradeId: 1,
      orderDate: "2024-01-01T00:02:00Z",
      side: "sell",
    });
    insertOrder(dbPath, {
      id: 200,
      tradeId: 2,
      orderDate: "2024-02-01T00:01:00Z",
      side: "buy",
    });

    const service = new DatabaseService(dbPath);
    const trades = service.getAllTrades();
    service.close();

    expect(trades.length).toBe(2);
    expect(trades[0]?.id).toBe(2);
    expect(trades[1]?.id).toBe(1);

    expect(trades[0]?.orders?.map((order) => order.id)).toEqual([200]);
    expect(trades[1]?.orders?.map((order) => order.id)).toEqual([100, 101]);
  });

  it("returns empty order arrays when trades have no orders", () => {
    const dbPath = createDatabaseWithTrades([
      {
        id: 1,
        openDate: "2024-01-01T00:00:00Z",
        strategy: "strat-1",
        tradingMode: "spot",
        exchange: "binance",
      },
    ]);

    const service = new DatabaseService(dbPath);
    const trades = service.getAllTrades();
    service.close();

    expect(trades.length).toBe(1);
    expect(trades[0]?.orders).toEqual([]);
  });
});
