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

## Использование

Разместите файл базы данных Freqtrade (`tradesv3.sqlite`) в корне проекта и запустите:

```bash
bun index.ts
```

Или:

```bash
bun run index.ts
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

## Лицензия

This project was created using `bun init` in bun v1.3.6.
