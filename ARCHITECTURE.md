# Freqtrade Analysis Project Architecture

The project is built using **SOLID** principles to keep the code clean, scalable, and easy to test.

## Project Structure

```text
src/
├── analyzers/          # Data analysis
│   ├── TradeAnalyzer.ts
│   └── metrics/
│       ├── reportMetrics.ts
│       └── riskMetrics.ts
├── formatters/         # Data formatting
│   └── DateFormatter.ts
├── generators/         # Report generation
│   └── MarkdownReportGenerator.ts
├── output/             # Delivery mode normalization and result writing
│   ├── outputMode.ts
│   └── ResultWriter.ts
├── renderers/          # Content renderers
│   ├── MarkdownReportRenderer.ts
│   ├── JsonReportRenderer.ts
│   └── ToonReportRenderer.ts
├── services/           # Data access services
│   └── DatabaseService.ts
└── types/              # Types and interfaces
    ├── trade.types.ts
    └── report.types.ts
```

## SOLID in Practice

### 1. Single Responsibility Principle

Each class handles one clear responsibility:

- **`DatabaseService`** - database operations (reading data)
- **`TradeAnalyzer`** - analysis orchestration and metric coordination
- **`reportMetrics`** - reporting metrics (pairs, tags, top trades)
- **`riskMetrics`** - risk metrics (drawdown, Sharpe/Sortino, exposure)
- **`DateFormatter`** - date and duration formatting
- **`MarkdownReportGenerator`** - Markdown report generation
- **`renderers/*`** - render analysis payload to `md/json/toon`
- **`ResultWriter`** - delivers rendered output to file or stdout

### 2. Open/Closed Principle

Classes are open for extension but closed for modification:

- New formatters can be added easily (for example, `JSONFormatter`, `CSVFormatter`) without changing existing code
- New analyzers can be introduced (for example, `AdvancedTradeAnalyzer`) by extending base behavior
- New report generators (HTML, PDF) can be added without changing analysis logic
- New output delivery channels can be added without changing analyzers/renderers

### 3. Liskov Substitution Principle

Classes are designed so subclasses can replace base classes safely:

- If `AdvancedDateFormatter extends DateFormatter` is created, it should work anywhere `DateFormatter` is used
- New service implementations can replace existing ones without changing client code

### 4. Interface Segregation Principle

Types and interfaces are split by purpose:

- **`Trade`** - trade data
- **`TradeStatistics`** - overall statistics
- **`PairStatistics`** - pair-level statistics
- **`PairStatisticsReport`** - pair report model

Each interface contains only fields required for its specific use case.

### 5. Dependency Inversion Principle

Classes depend on abstractions, not concrete implementations:

- **`MarkdownReportGenerator`** receives `DateFormatter` through its constructor (Dependency Injection)
- The `main()` function builds dependencies and injects them into classes
- Implementations can be replaced for testing (for example, mocks)

## Architecture Benefits

1. **Testability** - each class can be tested independently
2. **Extensibility** - new functionality is easy to add
3. **Maintainability** - code is easier to read and reason about
4. **Reusability** - classes can be reused in other projects
5. **Change Isolation** - changes in one class have minimal impact on others

## Extension Examples

### Add a New Formatter

```typescript
export class CSVFormatter {
  formatTradeToCSV(trade: Trade): string {
    // Implementation
  }
}
```

### Add a New Report Generator

```typescript
export class HTMLReportGenerator {
  constructor(private dateFormatter: DateFormatter) {}

  generate(trades: Trade[], statistics: TradeStatistics): string {
    // Generate HTML report
  }
}
```

### Add a New Analyzer

```typescript
export class RiskAnalyzer {
  calculateRiskMetrics(trades: Trade[]): RiskMetrics {
    // Risk analysis
  }
}
```

## Run the Project

```bash
bun run start
```

Output: `trades_report.md` with detailed trade analysis.
