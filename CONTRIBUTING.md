# Contributing to freqtrade-analys

Thanks for your interest in contributing to **freqtrade-analys**.

## Ways to contribute

- Report bugs and edge cases in issues.
- Propose features or UX improvements.
- Improve code quality, tests, docs, and examples.

## Development setup

1. Fork the repository and clone your fork.
2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy environment template:

   ```bash
   cp .env.example .env
   ```

4. Run the CLI locally:

   ```bash
   bun run start
   ```

## Branching and commits

- Create a focused branch for each change.
- Keep commits small and descriptive.
- Prefer Conventional Commits style when possible (for example: `feat:`, `fix:`, `docs:`, `refactor:`).

## Code style and quality checks

Before opening a pull request, run:

```bash
bunx tsc --noEmit
bun run test
bun run build
bun run build:exe
```

Also run the private artifact audit:

```bash
bun run audit:private-artifacts
```

## Pull request checklist

- [ ] Scope is clear and limited to one logical change.
- [ ] Tests are updated/added where relevant.
- [ ] Documentation is updated when behavior changes.
- [ ] No private trading artifacts are committed.
- [ ] CI passes.

## Reporting issues

When filing an issue, include:

- expected behavior
- actual behavior
- reproduction steps
- environment details (OS, Bun version, command used)

If possible, include anonymized sample data or logs from `stderr`.

## Security-related issues

Please do **not** open public issues for sensitive vulnerabilities.
Use the process in [SECURITY.md](./SECURITY.md).
