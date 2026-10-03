# Test and profiling reports

Generated on 2026-10-03 from the committed code (Windows 11, Node 24, Chromium 153).

| Folder         | Content                                                                                                                                                                                                          | How to regenerate                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [e2e/](e2e/)   | Playwright HTML report: 58 passed, 1 skipped (the touch test is mobile-only by design), desktop and Pixel 7 landscape. Open `e2e/index.html` in a browser, or run `npx playwright show-report docs/reports/e2e`. | `npm run test:e2e`, then copy `playwright-report/` here |
| [unit/](unit/) | Vitest JUnit XML: 21 files, 154 tests passed.                                                                                                                                                                    | `npm run test:report`                                   |
| [perf/](perf/) | `npm run perf -- --headed` output: 3-minute match metrics and 5 memory cycles. Summary in [../PERFORMANCE.md](../PERFORMANCE.md).                                                                                | `npm run build:e2e && npm run perf -- --headed`         |
