import { DatabaseService } from "./services/DatabaseService";
import { TradeAnalyzer } from "./analyzers/TradeAnalyzer";
import { MarkdownReportGenerator } from "./generators/MarkdownReportGenerator";
import { DateFormatter } from "./formatters/DateFormatter";

/**
 * Главная функция приложения
 * Координирует работу всех компонентов
 * Следует принципу Dependency Injection - создает зависимости и передает их в классы
 */
async function main() {
  const dbPath = "tradesv3.sqlite";
  const outputPath = "trades_report.md";

  // Создание экземпляров сервисов (Dependency Injection)
  const databaseService = new DatabaseService(dbPath);
  const tradeAnalyzer = new TradeAnalyzer();
  const dateFormatter = new DateFormatter();
  const reportGenerator = new MarkdownReportGenerator(dateFormatter);

  try {
    // Получение данных
    console.log("📊 Загрузка сделок из базы данных...");
    const trades = databaseService.getAllTrades();
    const tradingInfo = databaseService.getTradingInfo();
    const openTrades = trades.filter(t => t.is_open === 1);
    const closedTrades = trades.filter(t => t.is_open === 0);
    console.log(`📊 Найдено сделок: ${trades.length} (открытых: ${openTrades.length}, закрытых: ${closedTrades.length})`);

    if (trades.length === 0) {
      console.log("⚠️  Нет закрытых сделок для анализа");
      return;
    }

    // Анализ данных
    console.log("🔍 Анализ сделок...");
    const statistics = tradeAnalyzer.calculateStatistics(trades);
    const pairStats = tradeAnalyzer.calculatePairStatistics(trades);
    const topProfitable = tradeAnalyzer.getTopProfitable(trades, 3);
    const topLosing = tradeAnalyzer.getTopLosing(trades, 3);

    // Генерация отчета
    console.log("📝 Генерация отчета...");
    const markdown = reportGenerator.generate(
      trades,
      statistics,
      pairStats,
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
