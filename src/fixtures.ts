import { test as base, expect as baseExpect, type Page } from "@playwright/test";
import { createToBeAccessibleMatcher, type MatcherResult } from "./matchers.js";
import type { BarrieretestConfig, ToBeAccessibleOptions } from "./types.js";

export interface BarrieretestFixtures {
  barrieretest: BarrieretestConfig;
}

interface InternalFixtures extends BarrieretestFixtures {
  _syncBarrieretest: void;
}

// Module-scoped config updated by the auto-fixture before each test.
// Safe: Playwright workers are single-threaded.
let _activeConfig: BarrieretestConfig = {};

export const test = base.extend<InternalFixtures>({
  barrieretest: async ({}, use) => {
    await use({});
  },

  // Syncs the fixture value into module scope so the expect matcher can read it.
  _syncBarrieretest: [
    async ({ barrieretest }, use) => {
      const prev = _activeConfig;
      _activeConfig = barrieretest;
      await use();
      _activeConfig = prev;
    },
    { auto: true },
  ],
});

export const expect = baseExpect.extend({
  async toBeAccessible(page: Page, options?: ToBeAccessibleOptions): Promise<MatcherResult> {
    const matcher = createToBeAccessibleMatcher(_activeConfig);
    return matcher(page, options);
  },
});

/** Create a custom expect with explicit config (bypasses fixture system). */
export function createExpectWithConfig(config: BarrieretestConfig) {
  return baseExpect.extend({
    async toBeAccessible(page: Page, options?: ToBeAccessibleOptions): Promise<MatcherResult> {
      const matcher = createToBeAccessibleMatcher(config);
      return matcher(page, options);
    },
  });
}
