export type { AuditResult, DetailLevel, Issue, IssueSeverity } from "@barrieretest/core";
export type { BarrieretestFixtures } from "./fixtures.js";
export { createExpectWithConfig, expect, test } from "./fixtures.js";
export { formatFailureMessage, formatIssueSummary, formatPassMessage } from "./format.js";
export { createToBeAccessibleMatcher, matchers } from "./matchers.js";
export type { BarrieretestConfig, ToBeAccessibleOptions } from "./types.js";

import type { ToBeAccessibleOptions } from "./types.js";

declare module "@playwright/test" {
  interface Matchers<R, T> {
    toBeAccessible(options?: ToBeAccessibleOptions): Promise<R>;
  }

  interface PlaywrightTestOptions {
    barrieretest: import("./types.js").BarrieretestConfig;
  }
}
