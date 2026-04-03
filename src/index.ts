import { DatabaseService } from "./services/DatabaseService";
import { TradeAnalyzer } from "./analyzers/TradeAnalyzer";
import { MarkdownReportGenerator } from "./generators/MarkdownReportGenerator";
import { DateFormatter } from "./formatters/DateFormatter";
import { CliUsageError, getHelpText, resolveRuntimeConfig } from "./config";
import { MarkdownReportRenderer } from "./renderers/MarkdownReportRenderer";
import { JsonReportRenderer } from "./renderers/JsonReportRenderer";
import { ToonReportRenderer } from "./renderers/ToonReportRenderer";
import type {
  AnalysisReportPayload,
  ReportOutputFormat,
} from "./types/report.types";
import type { TradeStatistics } from "./types/trade.types";

function logInfo(message: string): void {
  console.error(message);
}

function getRenderer(format: ReportOutputFormat, language: "en" | "ru") {
  switch (format) {
    case "md": {
      const dateFormatter = new DateFormatter(language);
      const markdownGenerator = new MarkdownReportGenerator(dateFormatter, language);
      return new MarkdownReportRenderer(markdownGenerator);
    }
    case "json":
      return new JsonReportRenderer();
    case "toon":
      return new ToonReportRenderer();
  }
}

/**
 * Main application function.
 * Coordinates all components.
 * Follows Dependency Injection by creating and wiring dependencies.
 */
async function main() {
  const runtimeConfig = resolveRuntimeConfig(Bun.argv.slice(2));
  const {
    dbPath,
    format,
    initialCapital,
    capitalMode,
    reportLanguage,
  } = runtimeConfig;

  // Create service instances (Dependency Injection)
  const databaseService = new DatabaseService(dbPath);
  const tradeAnalyzer = new TradeAnalyzer();

  try {
    // Load data
    logInfo("📊 Loading trades from database...");
    const trades = databaseService.getAllTrades();
    const tradingInfoFromDb = databaseService.getTradingInfo();
    const openTrades = trades.filter((t) => t.is_open === 1);
    const closedTrades = trades.filter((t) => t.is_open === 0);
    logInfo(
      `📊 Trades found: ${trades.length} (open: ${openTrades.length}, closed: ${closedTrades.length})`,
    );

    if (closedTrades.length === 0) {
      logInfo("⚠️  No closed trades available for analysis");
      return;
    }

    // Analyze data
    logInfo("🔍 Analyzing trades...");
    const statistics = await tradeAnalyzer.calculateStatistics(closedTrades);
    const pairStats = tradeAnalyzer.calculatePairStatistics(closedTrades);
    const tagStats = tradeAnalyzer.calculateEnterTagStatistics(closedTrades);
    const topProfitable = tradeAnalyzer.getTopProfitable(closedTrades, 3);
    const topLosing = tradeAnalyzer.getTopLosing(closedTrades, 3);
    const resolvedCapital = capitalMode === "manual"
      ? initialCapital
      : capitalMode === "auto"
        ? tradeAnalyzer.estimateCapitalBaseline(trades)
        : undefined;

    // Compose report statistics payload
    const reportStatistics: TradeStatistics = {
      ...statistics, // Base metrics from closed trades
    };

    if (resolvedCapital && resolvedCapital > 0) {
      const drawdown = tradeAnalyzer.calculateMaxDrawdown(
        closedTrades,
        resolvedCapital,
      );
      const { sharpeRatio, sortinoRatio } = tradeAnalyzer.calculateSharpeAndSortinoRatios(
        closedTrades,
        resolvedCapital,
      );
      Object.assign(reportStatistics, {
        drawdown,
        sharpeRatio,
        sortinoRatio,
      });
    }

    // Print key metrics to console
    logInfo("--- Overall stats ---");
    logInfo(`- Total trades: ${reportStatistics.totalTrades}`);
    logInfo(`- Profitable/Losing: ${reportStatistics.profitableTrades}/${reportStatistics.losingTrades}`);
    logInfo(`- Win rate: ${reportStatistics.winRate.toFixed(2)}%`);
    logInfo(`- Total profit: ${reportStatistics.totalProfit.toFixed(2)}`);
    logInfo(`- Profit Factor: ${reportStatistics.profitFactor.toFixed(2)}`);
    logInfo(`- Expectancy: ${reportStatistics.expectancy.toFixed(2)}`);
    if (resolvedCapital && resolvedCapital > 0) {
      const capitalLabel = capitalMode === "auto" ? "Capital baseline (auto)" : "Capital baseline";
      logInfo(`- ${capitalLabel}: ${resolvedCapital.toFixed(2)}`);
      if (capitalMode === "auto") {
        logInfo("- Capital baseline note: estimated from the maximum concurrent stake exposure across trades");
      }
    } else {
      logInfo("- Capital-based risk metrics: skipped (use --capital <amount> or --capital auto)");
    }
    if (reportStatistics.drawdown) {
      logInfo(`- Max drawdown: ${reportStatistics.drawdown.maxDrawdown.toFixed(2)}% (${reportStatistics.drawdown.maxDrawdownAbs.toFixed(2)})`);
    }
    if (reportStatistics.sharpeRatio !== undefined) {
      logInfo(`- Sharpe Ratio: ${reportStatistics.sharpeRatio.toFixed(3)}`);
    }
    if (reportStatistics.sortinoRatio !== undefined) {
      logInfo(`- Sortino Ratio: ${reportStatistics.sortinoRatio.toFixed(3)}`);
    }
    logInfo(`- Total slippage: ${(reportStatistics.totalSlippage ?? 0).toFixed(2)}`);
    logInfo(`- Average slippage: ${(reportStatistics.averageSlippage ?? 0).toFixed(2)}`);
    logInfo("------------------------");

    // Build complete trading info payload
    const tradingInfo = {
      ...tradingInfoFromDb,
      capitalBaseline: resolvedCapital,
      capitalBaselineSource: capitalMode === "manual" || capitalMode === "auto"
        ? capitalMode
        : undefined,
    };

    const reportPayload: AnalysisReportPayload = {
      generatedAt: new Date().toISOString(),
      language: reportLanguage,
      trades,
      pairStats,
      tagStats,
      topProfitable,
      topLosing,
      statistics: reportStatistics,
      tradingInfo,
    };

    // Generate report
    logInfo("📝 Rendering report...");
    const renderer = getRenderer(format, reportLanguage);
    const renderedContent = renderer.render(reportPayload);
    const finalContent = renderedContent.endsWith("\n") ? renderedContent : `${renderedContent}\n`;
    process.stdout.write(finalContent);
  } finally {
    // Close database connection
    databaseService.close();
  }
}

function handleFatalError(error: unknown): never {
  if (error instanceof CliUsageError) {
    console.error(`Error: ${error.message}\n`);
    console.error(getHelpText());
    process.exit(1);
  }

  console.error("❌ Error:", error);
  process.exit(1);
}

// Run application
main().catch(handleFatalError);
