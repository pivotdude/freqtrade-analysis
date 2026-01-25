import { DatabaseService } from "./services/DatabaseService";
import { TradeAnalyzer } from "./analyzers/TradeAnalyzer";
import { MarkdownReportGenerator } from "./generators/MarkdownReportGenerator";
import { DateFormatter } from "./formatters/DateFormatter";
import { config } from "./config";

/**
 * Главная функция приложения
 * Координирует работу всех компонентов
 * Следует принципу Dependency Injection - создает зависимости и передает их в классы
 */
async function main() {
  const { dbPath, reportPath: outputPath, initialCapital } = config;

  // Создание экземпляров сервисов (Dependency Injection)
  const databaseService = new DatabaseService(dbPath);
  const tradeAnalyzer = new TradeAnalyzer();
  const dateFormatter = new DateFormatter();
  const reportGenerator = new MarkdownReportGenerator(dateFormatter);

  try {
    // Получение данных
    console.log("📊 Загрузка сделок из базы данных...");
    const trades = databaseService.getAllTrades();
    const tradingInfoFromDb = databaseService.getTradingInfo();
    const openTrades = trades.filter((t) => t.is_open === 1);
    const closedTrades = trades.filter((t) => t.is_open === 0);
    console.log(
      `📊 Найдено сделок: ${trades.length} (открытых: ${openTrades.length}, закрытых: ${closedTrades.length})`,
    );

    if (closedTrades.length === 0) {
      console.log("⚠️  Нет закрытых сделок для анализа");
      return;
    }

    // Анализ данных
    console.log("🔍 Анализ сделок...");
    const statistics = await tradeAnalyzer.calculateStatistics(closedTrades);
    const pairStats = tradeAnalyzer.calculatePairStatistics(closedTrades);
    const tagStats = tradeAnalyzer.calculateEnterTagStatistics(closedTrades);
    const topProfitable = tradeAnalyzer.getTopProfitable(closedTrades, 3);
    const topLosing = tradeAnalyzer.getTopLosing(closedTrades, 3);
    const drawdown = tradeAnalyzer.calculateMaxDrawdown(
      closedTrades,
      initialCapital,
    );
    const { sharpeRatio, sortinoRatio } = tradeAnalyzer.calculateSharpeAndSortinoRatios(
      closedTrades,
      initialCapital,
    );
    
    // Создаем отдельный объект для отчета, чтобы представить статистику в желаемом формате
    const reportStatistics = {
      ...statistics, // Базовые статистики по закрытым сделкам
      drawdown: drawdown, // Добавляем данные по просадке
      sharpeRatio,
      sortinoRatio,
    };

    // Вывод ключевых метрик в консоль
    console.log('--- Общая статистика ---');
    console.log(`- Всего сделок: ${reportStatistics.totalTrades}`);
    console.log(`- Профитных/Убыточных: ${reportStatistics.profitableTrades}/${reportStatistics.losingTrades}`);
    console.log(`- Винрейт: ${reportStatistics.winRate.toFixed(2)}%`);
    console.log(`- Общий профит: ${reportStatistics.totalProfit.toFixed(2)}`);
    console.log(`- Profit Factor: ${reportStatistics.profitFactor.toFixed(2)}`);
    console.log(`- Expectancy: ${reportStatistics.expectancy.toFixed(2)}`);
    if (reportStatistics.drawdown) {
      console.log(`- Макс. просадка: ${reportStatistics.drawdown.maxDrawdown.toFixed(2)}% (${reportStatistics.drawdown.maxDrawdownAbs.toFixed(2)})`);
    }
    console.log(`- Sharpe Ratio: ${reportStatistics.sharpeRatio.toFixed(3)}`);
    console.log(`- Sortino Ratio: ${reportStatistics.sortinoRatio.toFixed(3)}`);
    if (reportStatistics.buyAndHoldReturn) {
      console.log(`- Доходность Buy & Hold (BTC): ${reportStatistics.buyAndHoldReturn.toFixed(2)}%`);
    }
    console.log(`- Общее проскальзывание: ${reportStatistics.totalSlippage.toFixed(2)}`);
    console.log(`- Среднее проскальзывание: ${reportStatistics.averageSlippage.toFixed(2)}`);
    console.log('------------------------');


    // Формируем полный объект с информацией о торговле
    const tradingInfo = {
      ...tradingInfoFromDb,
      initialCapital,
    };

    // Генерация отчета
    console.log("📝 Генерация отчета...");
    const markdown = reportGenerator.generate(
      trades,
      reportStatistics,
      pairStats,
      tagStats,
      topProfitable,
      topLosing,
      tradingInfo
    );

    // Сохранение отчета
    await Bun.write(outputPath, markdown);
    console.log(`✅ Отчет сохранён в ${outputPath}`);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    throw error;
  } finally {
    // Закрытие соединения с базой данных
    databaseService.close();
  }
}

// Запуск приложения
main().catch(console.error);
