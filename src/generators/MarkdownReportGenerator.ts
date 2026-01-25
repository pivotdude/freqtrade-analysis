import type {
  Trade,
  TradeStatistics,
  PairStatisticsReport,
  EnterTagStatisticsReport,
  TradingInfo,
} from "../types/trade.types";
import { DateFormatter } from "../formatters/DateFormatter";

/**
 * Генератор markdown отчетов
 * Следует принципу Single Responsibility - отвечает только за генерацию отчета
 * Следует принципу Dependency Inversion - зависит от абстракции (DateFormatter)
 */
export class MarkdownReportGenerator {
  private dateFormatter: DateFormatter;

  constructor(dateFormatter: DateFormatter) {
    this.dateFormatter = dateFormatter;
  }

  /**
   * Генерирует полный markdown отчет
   */
  generate(
    trades: Trade[],
    statistics: TradeStatistics,
    pairStats: PairStatisticsReport[],
    tagStats: EnterTagStatisticsReport[],
    topProfitable: Trade[],
    topLosing: Trade[],
    tradingInfo: TradingInfo,
  ): string {
    let md = "# Отчет по сделкам Freqtrade\n\n";

    md += this.generateTradingInfoSection(tradingInfo);
    md += this.generateStatisticsSection(statistics);
    md += this.generateTradesWithOrders(trades);
    md += this.generatePairStatisticsSection(pairStats);
    md += this.generateEnterTagStatisticsSection(tagStats);
    md += this.generateTopTradesSection(topProfitable, topLosing, statistics);

    return md;
  }

  /**
   * Генерирует секцию с информацией о торговле
   */
  private generateTradingInfoSection(info: TradingInfo): string {
    let md = "## Информация о торговле\n\n";
    md += `- **Стратегия:** ${info.strategy}\n`;
    md += `- **Биржа:** ${info.exchange}\n`;
    md += `- **Режим торговли:** ${info.tradingMode.toUpperCase()}\n`;
    if (info.initialCapital) {
      md += `- **Начальный капитал:** ${info.initialCapital.toFixed(2)} USDT\n`;
    }
    md += `- **Начало торговли:** ${this.dateFormatter.formatDate(info.firstTradeDate)}\n\n`;
    return md;
  }

  /**
   * Генерирует секцию с общей статистикой
   */
  private generateStatisticsSection(stats: TradeStatistics): string {
    let md = "## Общая статистика\n\n";
    md +=
      "*(Метрики прибыльности и производительности рассчитаны только по закрытым сделкам)*\n\n";

    md += `- **Всего сделок:** ${stats.totalTrades}\n`;
    md += `- **Прибыльных:** ${stats.profitableTrades} (${stats.winRate.toFixed(1)}%)\n`;
    md += `- **Убыточных:** ${stats.losingTrades}\n`;
    md += `- **Общая прибыль:** ${stats.totalProfit.toFixed(2)} USDT\n`;
    md += `- **Средняя прибыль:** ${stats.avgProfit.toFixed(2)} USDT\n`;
    md += `- **Комиссии:** ${stats.totalFees.toFixed(2)} USDT\n`;
    md += `- **Чистая прибыль:** ${(stats.totalProfit - stats.totalFees).toFixed(2)} USDT\n`;
    if (stats.avgFeePct !== undefined) {
      md += `- **Комиссия от суммарной прибыли:** ${stats.avgFeePct.toFixed(2)}%\n`;
      md += `    - *(Общая комиссия прибыльных сделок / общая прибыль. Более точный показатель, чем простое среднее.)*\n`;
    }
    md += `- **Profit Factor:** ${stats.profitFactor.toFixed(2)}\n`;
    md += `    - *(Отношение общей прибыли к общему убытку. Значение > 1 обычно говорит о прибыльности)*\n`;
    md += `- **Expectancy:** ${stats.expectancy.toFixed(2)} USDT\n`;
    md += `    - *(Средняя прибыль на сделку с учетом винрейта. Показывает, сколько можно ожидать от одной сделки)*\n`;

    if (stats.buyAndHoldReturn !== undefined) {
      md += `- **Доходность Buy & Hold (BTC):** ${stats.buyAndHoldReturn.toFixed(2)}%\n`;
      md += `    - *(Показывает доходность стратегии "купи и держи" для BTC/USDT за тот же период. Помогает понять, обогнала ли стратегия рынок)*\n`;
    }

    if (stats.avgProfitPerHourPct !== undefined) {
      md += `- **Средняя прибыль в час:** ${stats.avgProfitPerHourPct.toFixed(2)}%\n`;
      md += `    - *(Показывает средневзвешенную по времени доходность. Формула: (SUM(close_profit) * 100 / SUM(duration_minutes)) * 60)*\n`;
    }
    if (stats.maxOpenTrades !== undefined) {
      md += `- **Макс. одновременно открытых сделок:** ${stats.maxOpenTrades}\n`;
    }
    if (stats.maxExposureAmount !== undefined) {
      md += `- **Макс. капитал в сделках:** ${stats.maxExposureAmount.toFixed(2)} USDT\n`;
    }

    if (stats.sharpeRatio !== undefined) {
      md += `- **Sharpe Ratio:** ${stats.sharpeRatio.toFixed(3)}\n`;
      md += `    - *(Отношение средней доходности к её риску (волатильности). Чем выше, тем лучше)*\n`
    }
    if (stats.sortinoRatio !== undefined) {
      md += `- **Sortino Ratio:** ${stats.sortinoRatio.toFixed(3)}\n`;
      md += `    - *(Похож на Sharpe, но учитывает только риск "плохой" волатильности (убытков). Чем выше, тем лучше)*\n`
    }

    if (stats.averageSlippage !== undefined) {
      md += `- **Среднее проскальзывание (Slippage):** ${stats.averageSlippage.toFixed(4)}%\n`;
      md += `    - *(Разница между ценой в заявке и реальной ценой исполнения. Положительное значение - невыгодно.)*\n`;
    }

    if (stats.drawdown) {
      md += `- **Макс. просадка:** ${stats.drawdown.maxDrawdown.toFixed(2)}% (${stats.drawdown.maxDrawdownAbs.toFixed(2)} USDT)\n`;
      md += `    - *(Максимальное падение баланса от его пикового значения. Показывает исторический риск стратегии)*\n\n`;
    } else {
      md += "\n";
    }

    return md;
  }

  /**
   * Генерирует сделки с их ордерами
   */
  private generateTradesWithOrders(trades: Trade[]): string {
    let md = "## Детали сделок\n\n";

    for (const trade of trades) {
      md += this.formatTradeSection(trade);
    }

    return md;
  }

  /**
   * Форматирует секцию для одной сделки с её ордерами
   */
  private formatTradeSection(trade: Trade): string {
    const isOpen = trade.is_open === 1;
    const duration = trade.close_date
      ? this.dateFormatter.formatDuration(trade.open_date, trade.close_date)
      : "-";
    const openDate = this.dateFormatter.formatDate(trade.open_date);
    const closeDate = trade.close_date
      ? this.dateFormatter.formatDate(trade.close_date)
      : "-";
    
    const netProfitAbs = trade.close_profit_abs || 0;
    const netProfitPercent = (trade.close_profit || 0) * 100;
    const totalFee = (trade.fee_open_cost || 0) + (trade.fee_close_cost || 0);
    const grossProfitAbs = netProfitAbs + totalFee;
    const grossProfitPercent = trade.stake_amount > 0 ? (grossProfitAbs / trade.stake_amount) * 100 : 0;
    
    const profitColor = netProfitAbs >= 0 ? "🟢" : "🔴";
    const direction = trade.is_short ? "📉" : "📈";
    const status = isOpen ? "🔵 Открыта" : "✅ Закрыта";

    let md = `### Сделка #${trade.id} - ${direction} ${trade.pair} (${status})\n\n`;

    // Основная информация о сделке
    md += "**Информация о сделке:**\n\n";
    md += `- **Статус:** ${status}\n`;
    md += `- **Вход:** ${openDate}\n`;
    if (!isOpen) {
      md += `- **Выход:** ${closeDate}\n`;
      md += `- **Длительность:** ${duration}\n`;
    }
    md += `- **Цена входа:** ${trade.open_rate.toFixed(6)}\n`;
    if (!isOpen) {
      md += `- **Цена выхода:** ${trade.close_rate?.toFixed(6) || "-"}\n`;
    }
    md += `- **Сумма:** ${trade.stake_amount.toFixed(2)} USDT\n`;
    if (!isOpen) {
      md += `- **Прибыль (брутто):** ${profitColor} ${grossProfitPercent.toFixed(2)}% (${grossProfitAbs.toFixed(2)} USDT)\n`;
      md += `- **Комиссия:** ${totalFee.toFixed(2)} USDT (вход: ${(trade.fee_open_cost || 0).toFixed(2)}, выход: ${(trade.fee_close_cost || 0).toFixed(2)})\n`;
      
      if (grossProfitAbs > 0) {
        const fee_as_pct_of_profit = (totalFee / grossProfitAbs) * 100;
        md += `- **Комиссия от прибыли:** ${fee_as_pct_of_profit.toFixed(2)}%\n`;
      }
      
      md += `- **Прибыль (чистая):** ${profitColor} ${netProfitPercent.toFixed(2)}% (${netProfitAbs.toFixed(2)} USDT)\n`;

      const duration_minutes = trade.close_date ? (new Date(trade.close_date).getTime() - new Date(trade.open_date).getTime()) / 60000 : 0;
      if (duration_minutes > 0) {
        const profit_per_hour_pct = ((trade.close_profit || 0) * 100 / duration_minutes) * 60;
        md += `- **Эффективность (Профит в час):** ${profit_per_hour_pct.toFixed(2)}%\n`;
      }

      md += `- **Причина выхода:** ${trade.exit_reason || "-"}\n`;
    } else {
      const openFee = trade.fee_open_cost || 0;
      md += `- **Комиссия входа:** ${openFee.toFixed(2)} USDT\n`;
    }
    md += `- **Тег входа:** ${trade.enter_tag || "-"}\n\n`;

    // Таблица ордеров
    if (trade.orders && trade.orders.length > 0) {
      md += "**Ордера:**\n\n";
      md +=
        "| Сторона | Тип | Цена | Средняя | Объем | Исполнено | Стоимость | Дата | Тег |\n";
      md +=
        "|:--------|:----|:-----|:--------|:------|:----------|:----------|:-----|:----|\n";

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

  /**
   * Генерирует секцию со статистикой по парам
   */
  private generatePairStatisticsSection(
    pairStats: PairStatisticsReport[],
  ): string {
    let md = "## Анализ по торговым парам\n\n";
    md += "| Пара | Сделок | Прибыльных | Win Rate | Прибыль |\n";
    md += "|:-----|:-------|:-----------|:---------|:--------|\n";

    for (const { pair, stats } of pairStats) {
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      md += `| ${pair} | ${stats.count} | ${stats.wins} | ${winRate.toFixed(1)}% | ${stats.profit.toFixed(2)} USDT |\n`;
    }

    return md + "\n";
  }

  /**
   * Генерирует секцию со статистикой по тегам входа
   */
  private generateEnterTagStatisticsSection(
    tagStats: EnterTagStatisticsReport[],
  ): string {
    if (tagStats.length === 0) {
      return "";
    }

    let md = "## Анализ по тегам входа\n\n";
    md += "| Тег | Сделок | Прибыльных | Win Rate | Прибыль |\n";
    md += "|:----|:-------|:-----------|:---------|:--------|\n";

    for (const { tag, stats } of tagStats) {
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      md += `| ${tag} | ${stats.count} | ${stats.wins} | ${winRate.toFixed(1)}% | ${stats.totalProfit.toFixed(2)} USDT |\n`;
    }

    return md + "\n";
  }


  /**
   * Генерирует секцию с лучшими и худшими сделками
   */
  private generateTopTradesSection(
    topProfitable: Trade[],
    topLosing: Trade[],
    statistics: TradeStatistics,
  ): string {
    const hasLosingTrades = statistics.losingTrades > 0;
    const mainTitle = hasLosingTrades ? "## Лучшие и худшие сделки" : "## Лучшие и наименее прибыльные сделки";
    let md = `${mainTitle}\n\n`;

    md += "### 🏆 Топ-3 прибыльных сделок\n\n";
    if (topProfitable.length === 0) {
      md += "Нет прибыльных сделок для отображения.\n";
    } else {
      for (let i = 0; i < topProfitable.length; i++) {
        const t = topProfitable[i];
        if (t) {
          md += `${i + 1}. **${t.pair}** - ${(t.close_profit_abs || 0).toFixed(2)} USDT (${((t.close_profit || 0) * 100).toFixed(2)}%)\n`;
        }
      }
    }
    
    const losingTitle = hasLosingTrades ? '📉 Топ-3 убыточных сделок' : '📉 Топ-3 наименее прибыльных сделок';

    md += `\n${losingTitle}\n\n`;
    
    if (topLosing.length === 0) {
        md += "Нет сделок для отображения в этой категории.\n"
    } else {
        for (let i = 0; i < topLosing.length; i++) {
          const t = topLosing[i];
          if (t) {
            md += `${i + 1}. **${t.pair}** - ${(t.close_profit_abs || 0).toFixed(2)} USDT (${((t.close_profit || 0) * 100).toFixed(2)}%)\n`;
          }
        }
    }

    return md;
  }
}
