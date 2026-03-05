import { DatabaseService } from "./services/DatabaseService";
import { TradeAnalyzer } from "./analyzers/TradeAnalyzer";
import { MarkdownReportGenerator } from "./generators/MarkdownReportGenerator";
import { DateFormatter } from "./formatters/DateFormatter";
import { resolveRuntimeConfig } from "./config";

/**
 * Main application function.
 * Coordinates all components.
 * Follows Dependency Injection by creating and wiring dependencies.
 */
async function main() {
  const runtimeConfig = resolveRuntimeConfig(Bun.argv.slice(2));
  const {
    dbPath,
    reportPath: outputPath,
    initialCapital,
    reportLanguage,
    benchmarkPair,
    enableBenchmark,
    exchangeId,
  } = runtimeConfig;

  // Create service instances (Dependency Injection)
  const databaseService = new DatabaseService(dbPath);
  const marketDataProvider = enableBenchmark
    ? new (await import("./services/MarketDataService")).MarketDataService(exchangeId)
    : undefined;
  const tradeAnalyzer = new TradeAnalyzer(marketDataProvider, benchmarkPair);
  const dateFormatter = new DateFormatter(reportLanguage);
  const reportGenerator = new MarkdownReportGenerator(dateFormatter, reportLanguage);

  try {
    // Load data
    console.log("📊 Loading trades from database...");
    const trades = databaseService.getAllTrades();
    const tradingInfoFromDb = databaseService.getTradingInfo();
    const openTrades = trades.filter((t) => t.is_open === 1);
    const closedTrades = trades.filter((t) => t.is_open === 0);
    console.log(
      `📊 Trades found: ${trades.length} (open: ${openTrades.length}, closed: ${closedTrades.length})`,
    );

    if (closedTrades.length === 0) {
      console.log("⚠️  No closed trades available for analysis");
      return;
    }

    // Analyze data
    console.log("🔍 Analyzing trades...");
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
    
    // Compose report statistics payload
    const reportStatistics = {
      ...statistics, // Base metrics from closed trades
      drawdown: drawdown, // Drawdown metrics
      sharpeRatio,
      sortinoRatio,
    };

    // Print key metrics to console
    console.log("--- Overall stats ---");
    console.log(`- Total trades: ${reportStatistics.totalTrades}`);
    console.log(`- Profitable/Losing: ${reportStatistics.profitableTrades}/${reportStatistics.losingTrades}`);
    console.log(`- Win rate: ${reportStatistics.winRate.toFixed(2)}%`);
    console.log(`- Total profit: ${reportStatistics.totalProfit.toFixed(2)}`);
    console.log(`- Profit Factor: ${reportStatistics.profitFactor.toFixed(2)}`);
    console.log(`- Expectancy: ${reportStatistics.expectancy.toFixed(2)}`);
    if (reportStatistics.drawdown) {
      console.log(`- Max drawdown: ${reportStatistics.drawdown.maxDrawdown.toFixed(2)}% (${reportStatistics.drawdown.maxDrawdownAbs.toFixed(2)})`);
    }
    console.log(`- Sharpe Ratio: ${reportStatistics.sharpeRatio.toFixed(3)}`);
    console.log(`- Sortino Ratio: ${reportStatistics.sortinoRatio.toFixed(3)}`);
    if (reportStatistics.buyAndHoldReturn !== undefined) {
      console.log(`- Buy & Hold return (BTC): ${reportStatistics.buyAndHoldReturn.toFixed(2)}%`);
    }
    console.log(`- Total slippage: ${(reportStatistics.totalSlippage ?? 0).toFixed(2)}`);
    console.log(`- Average slippage: ${(reportStatistics.averageSlippage ?? 0).toFixed(2)}`);
    console.log("------------------------");


    // Build complete trading info payload
    const tradingInfo = {
      ...tradingInfoFromDb,
      initialCapital,
    };

    // Generate report
    console.log("📝 Generating report...");
    const markdown = reportGenerator.generate(
      trades,
      reportStatistics,
      pairStats,
      tagStats,
      topProfitable,
      topLosing,
      tradingInfo
    );

    // Save report
    await Bun.write(outputPath, markdown);
    console.log(`✅ Report saved to ${outputPath}`);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    // Close database connection
    databaseService.close();
  }
}

// Run application
main().catch(console.error);
