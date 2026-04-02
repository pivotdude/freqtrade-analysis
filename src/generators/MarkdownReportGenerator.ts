import type {
  Trade,
  TradeStatistics,
  PairStatisticsReport,
  EnterTagStatisticsReport,
  TradingInfo,
} from "../types/trade.types";
import type { ReportLanguage } from "../types/i18n.types";
import { DateFormatter } from "../formatters/DateFormatter";

/**
 * Markdown report generator.
 */
export class MarkdownReportGenerator {
  constructor(
    private readonly dateFormatter: DateFormatter,
    private readonly language: ReportLanguage = "en",
  ) {}

  private t(en: string, ru: string): string {
    return this.language === "ru" ? ru : en;
  }

  generate(
    trades: Trade[],
    statistics: TradeStatistics,
    pairStats: PairStatisticsReport[],
    tagStats: EnterTagStatisticsReport[],
    topProfitable: Trade[],
    topLosing: Trade[],
    tradingInfo: TradingInfo,
  ): string {
    let md = `# ${this.t("Freqtrade Trades Report", "Отчет по сделкам Freqtrade")}\n\n`;

    md += this.generateTradingInfoSection(tradingInfo);
    md += this.generateStatisticsSection(statistics, tradingInfo);
    md += this.generateTradesWithOrders(trades);
    md += this.generatePairStatisticsSection(pairStats);
    md += this.generateEnterTagStatisticsSection(tagStats);
    md += this.generateTopTradesSection(topProfitable, topLosing, statistics);

    return md;
  }

  private generateTradingInfoSection(info: TradingInfo): string {
    let md = `## ${this.t("Trading Information", "Информация о торговле")}\n\n`;
    md += `- **${this.t("Strategy", "Стратегия")}:** ${info.strategy}\n`;
    md += `- **${this.t("Exchange", "Биржа")}:** ${info.exchange}\n`;
    md += `- **${this.t("Trading Mode", "Режим торговли")}:** ${info.tradingMode.toUpperCase()}\n`;
    if (info.capitalBaseline) {
      const capitalLabel = info.capitalBaselineSource === "auto"
        ? this.t("Capital Baseline (estimated)", "База капитала (оценка)")
        : this.t("Capital Baseline", "База капитала");
      md += `- **${capitalLabel}:** ${info.capitalBaseline.toFixed(2)} USDT\n`;
      if (info.capitalBaselineSource === "auto") {
        md += `  - *${this.t(
          "Calculated automatically as the maximum concurrent capital exposure observed across trades. This is an estimate, not the actual wallet balance.",
          "Рассчитано автоматически как максимальная одновременно использованная сумма в сделках. Это оценка, а не реальный баланс кошелька.",
        )}*\n`;
      }
    }
    md += `- **${this.t("Trading Start", "Начало торговли")}:** ${this.dateFormatter.formatDate(info.firstTradeDate)}\n\n`;
    return md;
  }

  private generateStatisticsSection(stats: TradeStatistics, tradingInfo: TradingInfo): string {
    let md = `## ${this.t("Overall Statistics", "Общая статистика")}\n\n`;
    md += `*(${this.t(
      "Profitability and performance metrics are calculated using closed trades only",
      "Метрики прибыльности и производительности рассчитаны только по закрытым сделкам",
    )})*\n\n`;

    md += `- **${this.t("Total Trades", "Всего сделок")}:** ${stats.totalTrades}\n`;
    md += `- **${this.t("Profitable", "Прибыльных")}:** ${stats.profitableTrades} (${stats.winRate.toFixed(1)}%)\n`;
    md += `- **${this.t("Losing", "Убыточных")}:** ${stats.losingTrades}\n`;

    const capitalBaseline = tradingInfo.capitalBaseline;
    if (capitalBaseline && capitalBaseline > 0) {
      const totalProfitPct = (stats.totalProfit / capitalBaseline) * 100;
      const netProfit = stats.totalProfit - stats.totalFees;
      const netProfitPct = (netProfit / capitalBaseline) * 100;

      md += `- **${this.t("Total Profit", "Общая прибыль")}:** ${stats.totalProfit.toFixed(2)} USDT (${totalProfitPct.toFixed(2)}%)\n`;
      md += `- **${this.t("Average Profit", "Средняя прибыль")}:** ${stats.avgProfit.toFixed(2)} USDT\n`;
      md += `- **${this.t("Fees", "Комиссии")}:** ${stats.totalFees.toFixed(2)} USDT\n`;
      md += `- **${this.t("Net Profit", "Чистая прибыль")}:** ${netProfit.toFixed(2)} USDT (${netProfitPct.toFixed(2)}%)\n`;
    } else {
      md += `- **${this.t("Total Profit", "Общая прибыль")}:** ${stats.totalProfit.toFixed(2)} USDT\n`;
      md += `- **${this.t("Average Profit", "Средняя прибыль")}:** ${stats.avgProfit.toFixed(2)} USDT\n`;
      md += `- **${this.t("Fees", "Комиссии")}:** ${stats.totalFees.toFixed(2)} USDT\n`;
      md += `- **${this.t("Net Profit", "Чистая прибыль")}:** ${(stats.totalProfit - stats.totalFees).toFixed(2)} USDT\n`;
    }

    if (stats.avgFeePct !== undefined) {
      md += `- **${this.t("Fees as % of Total Profit", "Комиссия от суммарной прибыли")}:** ${stats.avgFeePct.toFixed(2)}%\n`;
      md += `    - *${this.t(
        "Total fees from profitable trades / total profit. A more robust metric than simple averaging.",
        "Общая комиссия прибыльных сделок / общая прибыль. Более точный показатель, чем простое среднее.",
      )}*\n`;
    }

    md += `- **Profit Factor:** ${stats.profitFactor.toFixed(2)}\n`;
    md += `    - *${this.t(
      "Gross profit divided by gross loss. Values above 1 usually indicate profitability.",
      "Отношение общей прибыли к общему убытку. Значение > 1 обычно говорит о прибыльности.",
    )}*\n`;
    md += `- **Expectancy:** ${stats.expectancy.toFixed(2)} USDT\n`;
    md += `    - *${this.t(
      "Average expected PnL per trade considering both win rate and average win/loss.",
      "Средняя ожидаемая прибыль на сделку с учетом винрейта и средней прибыли/убытка.",
    )}*\n`;

    if (stats.buyAndHoldReturn !== undefined) {
      md += `- **${this.t("Buy & Hold Return (BTC)", "Доходность Buy & Hold (BTC)")}:** ${stats.buyAndHoldReturn.toFixed(2)}%\n`;
      md += `    - *${this.t(
        "BTC/USDT buy-and-hold return over the same period, used as a benchmark.",
        "Доходность стратегии купи-и-держи BTC/USDT за тот же период как бенчмарк.",
      )}*\n`;
    }

    if (stats.avgProfitPerHourPct !== undefined) {
      md += `- **${this.t("Average Profit per Hour", "Средняя прибыль в час")}:** ${stats.avgProfitPerHourPct.toFixed(2)}%\n`;
      md += `    - *${this.t(
        "Time-weighted profitability estimate: (SUM(close_profit) * 100 / SUM(duration_minutes)) * 60.",
        "Оценка доходности с учетом времени: (SUM(close_profit) * 100 / SUM(duration_minutes)) * 60.",
      )}*\n`;
    }
    if (stats.maxOpenTrades !== undefined) {
      md += `- **${this.t("Max Concurrent Open Trades", "Макс. одновременно открытых сделок")}:** ${stats.maxOpenTrades}\n`;
    }
    if (stats.maxExposureAmount !== undefined) {
      md += `- **${this.t("Max Capital Exposure", "Макс. капитал в сделках")}:** ${stats.maxExposureAmount.toFixed(2)} USDT\n`;
    }

    if (stats.sharpeRatio !== undefined) {
      md += `- **Sharpe Ratio:** ${stats.sharpeRatio.toFixed(3)}\n`;
      md += `    - *${this.t(
        "Risk-adjusted return using total volatility. Higher is generally better.",
        "Доходность с поправкой на общий риск (волатильность). Чем выше, тем лучше.",
      )}*\n`;
    }
    if (stats.sortinoRatio !== undefined) {
      md += `- **Sortino Ratio:** ${stats.sortinoRatio.toFixed(3)}\n`;
      md += `    - *${this.t(
        "Risk-adjusted return using downside volatility only. Higher is generally better.",
        "Доходность с поправкой только на downside-риск (убытки). Чем выше, тем лучше.",
      )}*\n`;
    }

    if (stats.averageSlippage !== undefined) {
      md += `- **${this.t("Average Slippage", "Среднее проскальзывание")}:** ${stats.averageSlippage.toFixed(4)}%\n`;
      md += `    - *${this.t(
        "Difference between requested and executed price. Positive value means worse execution.",
        "Разница между ценой в заявке и реальной ценой исполнения. Положительное значение обычно невыгодно.",
      )}*\n`;
    }

    if (stats.drawdown) {
      md += `- **${this.t("Max Drawdown", "Макс. просадка")}:** ${stats.drawdown.maxDrawdown.toFixed(2)}% (${stats.drawdown.maxDrawdownAbs.toFixed(2)} USDT)\n`;
      md += `    - *${this.t(
        "Maximum drop in balance from its historical peak.",
        "Максимальное падение баланса от его исторического пика.",
      )}*\n\n`;
    } else {
      md += "\n";
    }

    return md;
  }

  private generateTradesWithOrders(trades: Trade[]): string {
    let md = `## ${this.t("Trade Details", "Детали сделок")}\n\n`;
    for (const trade of trades) {
      md += this.formatTradeSection(trade);
    }
    return md;
  }

  private formatTradeSection(trade: Trade): string {
    const isOpen = trade.is_open === 1;
    const duration = trade.close_date
      ? this.dateFormatter.formatDuration(trade.open_date, trade.close_date)
      : "-";
    const openDate = this.dateFormatter.formatDate(trade.open_date);
    const closeDate = trade.close_date ? this.dateFormatter.formatDate(trade.close_date) : "-";

    const netProfitAbs = trade.close_profit_abs || 0;
    const netProfitPercent = (trade.close_profit || 0) * 100;
    const totalFee = (trade.fee_open_cost || 0) + (trade.fee_close_cost || 0);
    const grossProfitAbs = netProfitAbs + totalFee;
    const grossProfitPercent = trade.stake_amount > 0 ? (grossProfitAbs / trade.stake_amount) * 100 : 0;

    const profitColor = netProfitAbs >= 0 ? "🟢" : "🔴";
    const direction = trade.is_short ? "📉" : "📈";
    const status = isOpen
      ? this.t("🔵 Open", "🔵 Открыта")
      : this.t("✅ Closed", "✅ Закрыта");

    let md = `### ${this.t("Trade", "Сделка")} #${trade.id} - ${direction} ${trade.pair} (${status})\n\n`;

    md += `**${this.t("Trade Information", "Информация о сделке")}:**\n\n`;
    md += `- **${this.t("Status", "Статус")}:** ${status}\n`;
    md += `- **${this.t("Entry", "Вход")}:** ${openDate}\n`;
    if (!isOpen) {
      md += `- **${this.t("Exit", "Выход")}:** ${closeDate}\n`;
      md += `- **${this.t("Duration", "Длительность")}:** ${duration}\n`;
    }
    md += `- **${this.t("Entry Price", "Цена входа")}:** ${trade.open_rate.toFixed(6)}\n`;
    if (!isOpen) {
      md += `- **${this.t("Exit Price", "Цена выхода")}:** ${trade.close_rate?.toFixed(6) || "-"}\n`;
    }
    md += `- **${this.t("Stake", "Сумма")}:** ${trade.stake_amount.toFixed(2)} USDT\n`;

    if (!isOpen) {
      md += `- **${this.t("Gross Profit", "Прибыль (брутто)")}:** ${profitColor} ${grossProfitPercent.toFixed(2)}% (${grossProfitAbs.toFixed(2)} USDT)\n`;
      md += `- **${this.t("Fees", "Комиссия")}:** ${totalFee.toFixed(2)} USDT (${this.t("entry", "вход")}: ${(trade.fee_open_cost || 0).toFixed(2)}, ${this.t("exit", "выход")}: ${(trade.fee_close_cost || 0).toFixed(2)})\n`;

      if (grossProfitAbs > 0) {
        const feeAsPctOfProfit = (totalFee / grossProfitAbs) * 100;
        md += `- **${this.t("Fees as % of Gross Profit", "Комиссия от прибыли")}:** ${feeAsPctOfProfit.toFixed(2)}%\n`;
      }

      md += `- **${this.t("Net Profit", "Прибыль (чистая)")}:** ${profitColor} ${netProfitPercent.toFixed(2)}% (${netProfitAbs.toFixed(2)} USDT)\n`;

      const durationMinutes = trade.close_date
        ? (new Date(trade.close_date).getTime() - new Date(trade.open_date).getTime()) / 60000
        : 0;
      if (durationMinutes > 0) {
        const profitPerHourPct = ((trade.close_profit || 0) * 100 / durationMinutes) * 60;
        md += `- **${this.t("Efficiency (Profit per Hour)", "Эффективность (Профит в час)")}:** ${profitPerHourPct.toFixed(2)}%\n`;
      }

      md += `- **${this.t("Exit Reason", "Причина выхода")}:** ${trade.exit_reason || "-"}\n`;
    } else {
      md += `- **${this.t("Entry Fee", "Комиссия входа")}:** ${(trade.fee_open_cost || 0).toFixed(2)} USDT\n`;
    }

    md += `- **${this.t("Entry Tag", "Тег входа")}:** ${trade.enter_tag || "-"}\n\n`;

    if (trade.orders && trade.orders.length > 0) {
      md += `**${this.t("Orders", "Ордера")}:**\n\n`;
      md += `| ${this.t("Side", "Сторона")} | ${this.t("Type", "Тип")} | ${this.t("Price", "Цена")} | ${this.t("Average", "Средняя")} | ${this.t("Amount", "Объем")} | ${this.t("Filled", "Исполнено")} | ${this.t("Cost", "Стоимость")} | ${this.t("Date", "Дата")} | ${this.t("Tag", "Тег")} |\n`;
      md += "|:-----|:-----|:------|:--------|:-------|:-------|:-----|:-----|:----|\n";

      for (const order of trade.orders) {
        const side = order.ft_order_side === "buy" ? "🟢 Buy" : "🔴 Sell";
        const orderType = order.order_type || "-";
        const price = order.price?.toFixed(6) || order.ft_price.toFixed(6);
        const average = order.average?.toFixed(6) || "-";
        const amount = order.amount?.toFixed(2) || order.ft_amount.toFixed(2);
        const filled = order.filled?.toFixed(2) || "-";
        const cost = order.cost?.toFixed(2) || "-";
        const date = order.order_filled_date
          ? this.dateFormatter.formatDate(order.order_filled_date)
          : order.order_date
            ? this.dateFormatter.formatDate(order.order_date)
            : "-";
        const tag = order.ft_order_tag || "-";

        md += `| ${side} | ${orderType} | ${price} | ${average} | ${amount} | ${filled} | ${cost} | ${date} | ${tag} |\n`;
      }
    }

    md += "\n---\n\n";
    return md;
  }

  private generatePairStatisticsSection(pairStats: PairStatisticsReport[]): string {
    let md = `## ${this.t("Pair Analysis", "Анализ по торговым парам")}\n\n`;
    md += `| ${this.t("Pair", "Пара")} | ${this.t("Trades", "Сделок")} | ${this.t("Winning", "Прибыльных")} | Win Rate | ${this.t("Profit", "Прибыль")} |\n`;
    md += "|:-----|:-------|:--------|:---------|:--------|\n";

    for (const { pair, stats } of pairStats) {
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      md += `| ${pair} | ${stats.count} | ${stats.wins} | ${winRate.toFixed(1)}% | ${stats.profit.toFixed(2)} USDT |\n`;
    }

    return md + "\n";
  }

  private generateEnterTagStatisticsSection(tagStats: EnterTagStatisticsReport[]): string {
    if (tagStats.length === 0) {
      return "";
    }

    let md = `## ${this.t("Entry Tag Analysis", "Анализ по тегам входа")}\n\n`;
    md += `| ${this.t("Tag", "Тег")} | ${this.t("Trades", "Сделок")} | ${this.t("Winning", "Прибыльных")} | Win Rate | ${this.t("Profit", "Прибыль")} |\n`;
    md += "|:----|:-------|:--------|:---------|:--------|\n";

    for (const { tag, stats } of tagStats) {
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      md += `| ${tag} | ${stats.count} | ${stats.wins} | ${winRate.toFixed(1)}% | ${stats.totalProfit.toFixed(2)} USDT |\n`;
    }

    return md + "\n";
  }

  private generateTopTradesSection(
    topProfitable: Trade[],
    topLosing: Trade[],
    statistics: TradeStatistics,
  ): string {
    const hasLosingTrades = statistics.losingTrades > 0;
    const mainTitle = hasLosingTrades
      ? this.t("## Best and Worst Trades", "## Лучшие и худшие сделки")
      : this.t("## Best and Least Profitable Trades", "## Лучшие и наименее прибыльные сделки");

    let md = `${mainTitle}\n\n`;
    md += `### 🏆 ${this.t("Top 3 Profitable Trades", "Топ-3 прибыльных сделок")}\n\n`;

    if (topProfitable.length === 0) {
      md += `${this.t("No profitable trades to display.", "Нет прибыльных сделок для отображения.")}\n`;
    } else {
      for (let i = 0; i < topProfitable.length; i++) {
        const trade = topProfitable[i];
        if (!trade) continue;
        md += `${i + 1}. **${trade.pair}** - ${(trade.close_profit_abs || 0).toFixed(2)} USDT (${((trade.close_profit || 0) * 100).toFixed(2)}%)\n`;
      }
    }

    md += `\n### 📉 ${hasLosingTrades
      ? this.t("Top 3 Losing Trades", "Топ-3 убыточных сделок")
      : this.t("Top 3 Least Profitable Trades", "Топ-3 наименее прибыльных сделок")}\n\n`;

    if (topLosing.length === 0) {
      md += `${this.t("No trades to display in this category.", "Нет сделок для отображения в этой категории.")}\n`;
    } else {
      for (let i = 0; i < topLosing.length; i++) {
        const trade = topLosing[i];
        if (!trade) continue;
        md += `${i + 1}. **${trade.pair}** - ${(trade.close_profit_abs || 0).toFixed(2)} USDT (${((trade.close_profit || 0) * 100).toFixed(2)}%)\n`;
      }
    }

    return md;
  }
}
