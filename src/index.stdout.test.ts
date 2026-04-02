import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PROJECT_ROOT = join(import.meta.dir, "..");
const decoder = new TextDecoder();
const tempDirs: string[] = [];

function createFixtureDatabase(): string {
  const tmpDir = mkdtempSync(join(tmpdir(), "freqtrade-analys-"));
  tempDirs.push(tmpDir);
  const dbPath = join(tmpDir, "tradesv3.sqlite");
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

  db.query(`
    INSERT INTO trades (
      id, pair, open_date, close_date, open_rate, close_rate, stake_amount, amount,
      close_profit, close_profit_abs, exit_reason, enter_tag, strategy, trading_mode,
      exchange, is_short, leverage, max_rate, min_rate, is_open, fee_open, fee_open_cost,
      fee_close, fee_close_cost
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    1,
    "BTC/USDT",
    "2024-01-01T00:00:00Z",
    "2024-01-01T01:00:00Z",
    100,
    110,
    1000,
    1,
    0.1,
    100,
    "roi",
    "signal",
    "fixture-strategy",
    "spot",
    "binance",
    0,
    1,
    null,
    null,
    0,
    0.001,
    1,
    0.001,
    1,
  );

  db.close();
  return dbPath;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("CLI stdout contract", () => {
  it("writes only report payload to stdout in json mode", () => {
    const dbPath = createFixtureDatabase();
    const proc = Bun.spawnSync(
      ["bun", "src/index.ts", "--db", dbPath, "--format", "json", "--no-benchmark"],
      {
        cwd: PROJECT_ROOT,
        stdout: "pipe",
        stderr: "pipe",
        env: process.env,
      },
    );

    const stdout = decoder.decode(proc.stdout);
    const stderr = decoder.decode(proc.stderr);

    expect(proc.exitCode).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(stderr).toContain("Loading trades from database");
    expect(stdout).not.toContain("Loading trades from database");
    expect(stdout).not.toContain("Analyzing trades");
    expect(stdout).not.toContain("Rendering report");
  });
});

