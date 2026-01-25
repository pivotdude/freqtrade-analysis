/**
 * Интерфейс для ордера
 */
export interface Order {
  id: number;
  ft_trade_id: number;
  ft_order_side: string;
  ft_pair: string;
  ft_is_open: number;
  ft_amount: number;
  ft_price: number;
  order_id: string;
  status: string | null;
  order_type: string | null;
  side: string | null;
  price: number | null;
  average: number | null;
  amount: number | null;
  filled: number | null;
  cost: number | null;
  order_date: string | null;
  order_filled_date: string | null;
  ft_order_tag: string | null;
}

/**
 * Интерфейс для данных сделки из базы данных
 */
export interface Trade {
  id: number;
  pair: string;
  open_date: string;
  close_date: string | null;
  open_rate: number;
  close_rate: number | null;
  stake_amount: number;
  amount: number;
  close_profit: number | null;
  close_profit_abs: number | null;
  exit_reason: string | null;
  enter_tag: string | null;
  strategy: string | null;
  is_short: number;
  is_open: number;
  leverage: number | null;
  max_rate: number | null;
  min_rate: number | null;
  fee_open: number | null;
  fee_open_cost: number | null;
  fee_close: number | null;
  fee_close_cost: number | null;
  orders?: Order[];
}

/**
 * Статистика по торговой паре
 */
export interface PairStatistics {
  count: number;
  profit: number;
  wins: number;
}

/**
 * Результат расчета просадки
 */
export interface Drawdown {
  maxDrawdown: number; // в процентах
  maxDrawdownAbs: number; // в абсолютном значении
  peakBalance: number; // максимальное значение баланса
}

/**
 * Общая статистика по сделкам
 */
export interface TradeStatistics {
  totalTrades: number; // Closed trades
  profitableTrades: number;
  losingTrades:number;
  totalProfit: number;
  avgProfit: number;
  winRate: number;
  totalFees: number;
  profitFactor: number;
  expectancy: number;
  drawdown?: Drawdown;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxOpenTrades?: number;
  maxExposureAmount?: number;
  totalSlippage?: number;
  averageSlippage?: number;
  avgProfitPerHourPct?: number;
  avgFeePct?: number;
}

/**
 * Общая информация о торговле
 */
export interface TradingInfo {
  strategy: string;
  tradingMode: string;
  exchange: string;
  firstTradeDate: string;
}

/**
 * Статистика по парам для отчета
 */
export interface PairStatisticsReport {
  pair: string;
  stats: PairStatistics;
}

/**
 * Статистика по тегам входа
 */
export interface EnterTagStatistics {
  count: number;
  wins: number;
  totalProfit: number;
}

/**
 * Статистика по тегам для отчета
 */
export interface EnterTagStatisticsReport {
  tag: string;
  stats: EnterTagStatistics;
}
