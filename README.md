# Freqtrade Analysis Tool

Инструмент для анализа торговых сделок из базы данных Freqtrade с генерацией подробных markdown отчетов.

## Особенности

- Анализ закрытых сделок из SQLite базы данных Freqtrade
- Генерация подробных отчетов в формате Markdown
- Статистика по парам, прибыльности, win rate
- Архитектура на основе принципов SOLID
- Написано на TypeScript с использованием Bun

## Структура проекта

```
src/
├── analyzers/          # Анализ данных
├── formatters/         # Форматирование данных
├── generators/         # Генерация отчетов
├── services/           # Сервисы для работы с данными
└── types/              # Типы и интерфейсы TypeScript
```

Подробнее об архитектуре смотрите в [ARCHITECTURE.md](./ARCHITECTURE.md)

## Установка

```bash
bun install
```

## Конфигурация

Создайте `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Доступные переменные:

- `DB_PATH` - путь к SQLite базе (по умолчанию `tradesv3.sqlite`)
- `REPORT_PATH` - путь к выходному отчету (по умолчанию `trades_report.md`)
- `INITIAL_CAPITAL` - стартовый капитал для риск-метрик (по умолчанию `9900`)
- `REPORT_LANG` - язык отчета: `en` или `ru` (по умолчанию `en`)
- `ENABLE_BENCHMARK` - включить расчет Buy & Hold бенчмарка (`true/false`, по умолчанию `true`)
- `BENCHMARK_PAIR` - пара для бенчмарка (по умолчанию `BTC/USDT`)
- `EXCHANGE_ID` - биржа для бенчмарка через CCXT (по умолчанию `binance`)

## CLI аргументы

Поддерживается приоритет конфигурации: `CLI > .env > defaults`.

```bash
bun run start -- \
  --db tradesv3.sqlite \
  --out trades_report.md \
  --capital 10000 \
  --lang en \
  --exchange binance \
  --benchmark BTC/USDT
```

Флаги:

- `--db <path>` - путь к БД
- `--out <path>` - путь к отчету
- `--capital <number>` - стартовый капитал
- `--lang <en|ru>` - язык отчета
- `--exchange <id>` - id биржи (для бенчмарка)
- `--benchmark [pair]` - включить бенчмарк, опционально указать пару
- `--no-benchmark` - отключить расчет бенчмарка
- `--help` - показать справку

## Использование

Разместите файл базы данных Freqtrade и запустите:

```bash
bun run start
```

Основные команды проекта:

```bash
bun run start
bun run build
bun run build:exe
bun run test
```

Запуск с hot reload:

```bash
bun run dev:hot
```

Сборка исполняемого файла:

```bash
bun run build:exe
```

Проверка типов:

```bash
bunx tsc --noEmit
```

Полный локальный цикл перед PR:

```bash
bun install
bunx tsc --noEmit
bun run test
bun run build
bun run build:exe
```

## CI и Release

- CI workflow: `.github/workflows/ci.yml`
- Проверки запускаются на `pull_request` и `push` в `main` (Linux/macOS/Windows)
- Release-сборка запускается на событие `release: published`
- В assets релиза загружаются бинарники:
  - `freqtrade-analys-linux-x64`
  - `freqtrade-analys-macos-x64`
  - `freqtrade-analys-macos-arm64`
  - `freqtrade-analys-windows-x64.exe`

Пример публикации релиза:

```bash
git tag v1.0.0
git push origin v1.0.0
# Затем создайте GitHub Release для тега v1.0.0 (Publish release)
```

## Результат

После выполнения программы будет создан файл `trades_report.md` со следующей информацией:

- Общая статистика (количество сделок, win rate, общая прибыль)
- Детальная таблица всех сделок
- Анализ по торговым парам
- Топ-3 прибыльных и убыточных сделок

## Технологии

- [Bun](https://bun.com) - fast all-in-one JavaScript runtime
- TypeScript
- SQLite (встроенный модуль `bun:sqlite`)

## Архитектура

Проект следует принципам SOLID:

- **S** - Single Responsibility: каждый класс отвечает за одну задачу
- **O** - Open/Closed: легко расширяется без модификации существующего кода
- **L** - Liskov Substitution: классы можно заменять подклассами
- **I** - Interface Segregation: интерфейсы разделены по назначению
- **D** - Dependency Inversion: зависимости инжектируются через конструкторы

Подробнее: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Metrics Limitations

- `drawdown` считается только по **закрытым** сделкам, это не полная equity curve по таймсерии.
- `sharpe` и `sortino` считаются по per-trade returns (на сделку), а не по равномерному временному ряду доходностей.
- `slippage` считается только по доступным данным ордеров; если часть ордеров/полей отсутствует, метрика неполная.
- `buy and hold benchmark` зависит от внешних биржевых данных (CCXT API) и может быть недоступен из-за ограничений сети/API.

## Публикация в Public

В репозитории не должны храниться персональные артефакты трейдов:

- `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`
- `trades_report.md`

Если эти файлы уже добавлялись в git, исключите их из индекса (локально файлы останутся):

```bash
git rm --cached tradesv3.sqlite tradesv3.sqlite-shm tradesv3.sqlite-wal trades_report.md
```

## Лицензия

This project was created using `bun init` in bun v1.3.6.
