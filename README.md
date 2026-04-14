# @barrieretest/playwright

Playwright matchers for [`@barrieretest/core`](https://github.com/barrieretest/barrieretest-core) accessibility audits.

Adds `toBeAccessible()` to Playwright's `expect` and runs the audit on the **already open Playwright page**.

By default, this uses the `axe` engine from `@barrieretest/core`, so the audit runs against the live page state in your current Playwright session — including auth, client-side navigation, and other in-memory DOM state.

## Install

```bash
npm install --save-dev @barrieretest/playwright @barrieretest/core
```

Both `@playwright/test` and `@barrieretest/core` are peer dependencies.

## Quick start

```typescript
import { test, expect } from '@barrieretest/playwright'

test('homepage is accessible', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toBeAccessible()
})
```

## How it works

`toBeAccessible()` passes the current Playwright page directly to `@barrieretest/core`.

That means:

- audits run on the current Playwright page
- current cookies, auth, and SPA state are preserved
- cookie banner dismissal still runs before the audit
- the default engine is `axe`

## Matcher options

```typescript
await expect(page).toBeAccessible({
  minSeverity: 'serious',
  ignore: ['color-contrast'],
  detail: 'fix-ready',
  baseline: './baselines/homepage.json',
  updateBaseline: true,
})
```

| Option | Type | Description |
|--------|------|-------------|
| `minSeverity` | `'critical' \| 'serious' \| 'moderate' \| 'minor'` | Minimum severity to report |
| `ignore` | `string[]` | Rule IDs to skip |
| `detail` | `'minimal' \| 'actionable' \| 'fix-ready'` | Failure message detail level |
| `baseline` | `string` | Baseline file path |
| `updateBaseline` | `boolean` | Update baseline with current issues |

Detail levels:

- `minimal` shows rule id and severity only
- `actionable` adds selector, description, and rule-level help text
- `fix-ready` adds rule help text, per-element failure summary, code snippet, and documentation links when available

## Global config

Set defaults in `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    barrieretest: {
      engine: 'axe',
      detail: 'actionable',
      minSeverity: 'serious',
      ignore: ['color-contrast'],
      baseline: './baselines/homepage.json',
      timeout: 30000,
    },
  },
})
```

These apply automatically when using `test` and `expect` from this package.

## Custom expect (without fixtures)

If you need a standalone `expect` with a fixed config — e.g. in a helper or outside the Playwright fixture system:

```typescript
import { createExpectWithConfig } from '@barrieretest/playwright'

const expect = createExpectWithConfig({
  minSeverity: 'serious',
  detail: 'actionable',
})

await expect(page).toBeAccessible()
```

## Engine notes

- `engine: 'axe'` is the default and recommended choice, it runs on the Playwright page directly.
- `engine: 'pa11y'` is not intended for Playwright pages, because it requires a Puppeteer instance.

## Baseline workflow

```typescript
import { test, expect } from '@barrieretest/playwright'

test('no new accessibility regressions', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toBeAccessible({
    baseline: './baselines/homepage.json',
  })
})
```

Only new issues (not in the baseline) cause failures. See `@barrieretest/core` for a more detailed explanation of baseline management commands.

## Requirements

- Node.js 18+
- `@playwright/test` ^1.40.0
- `@barrieretest/core` ^0.4.0

## Exports

The package re-exports types and utilities for advanced use.

**Types** from `@barrieretest/core`: `AuditResult`, `DetailLevel`, `Issue`, `IssueSeverity`

**Local types**: `BarrieretestConfig`, `ToBeAccessibleOptions`, `BarrieretestFixtures`

**Formatters**: `formatFailureMessage`, `formatPassMessage`, `formatIssueSummary` — used internally for matcher output, available if you need custom formatting.

**Low-level**: `createToBeAccessibleMatcher`, `matchers` — the raw matcher factory and matcher object, for building custom integrations.

## License

MIT
