import { type AuditOptions, type AuditResult, audit } from "@barrieretest/core";
import type { Page } from "@playwright/test";
import { formatFailureMessage, formatPassMessage } from "./format.js";
import type { BarrieretestConfig, ToBeAccessibleOptions } from "./types.js";

type PlaywrightAuditPage = Pick<
  Page,
  "context" | "evaluate" | "goto" | "screenshot" | "title" | "url"
>;

function mergeOptions(
  fixtureConfig: BarrieretestConfig | undefined,
  matcherOptions: ToBeAccessibleOptions | undefined
): AuditOptions {
  return {
    engine: fixtureConfig?.engine,
    detail: matcherOptions?.detail ?? fixtureConfig?.detail ?? "actionable",
    minSeverity: matcherOptions?.minSeverity ?? fixtureConfig?.minSeverity,
    ignore: matcherOptions?.ignore ?? fixtureConfig?.ignore,
    timeout: fixtureConfig?.timeout,
    baseline: matcherOptions?.baseline ?? fixtureConfig?.baseline,
    updateBaseline: matcherOptions?.updateBaseline,
    captureScreenshot: false,
  };
}

async function runAudit(page: PlaywrightAuditPage, options: AuditOptions): Promise<AuditResult> {
  const url = page.url();

  if (!url || url === "about:blank") {
    throw new Error("Page has no URL. Navigate to a page before checking accessibility.");
  }

  return audit(page, options);
}

export interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

export function createToBeAccessibleMatcher(fixtureConfig?: BarrieretestConfig) {
  return async function toBeAccessible(
    page: PlaywrightAuditPage,
    options?: ToBeAccessibleOptions
  ): Promise<MatcherResult> {
    const mergedOptions = mergeOptions(fixtureConfig, options);

    let result: AuditResult;
    try {
      result = await runAudit(page, mergedOptions);
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Accessibility audit failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const hasNewIssues = result.baseline
      ? result.baseline.newIssues.length > 0
      : result.issues.length > 0;

    const issueCount = result.baseline ? result.baseline.newIssues.length : result.issues.length;
    const detail = mergedOptions.detail ?? "actionable";

    return {
      pass: !hasNewIssues,
      message: () => (hasNewIssues ? formatFailureMessage(result, detail) : formatPassMessage(result)),
      actual: issueCount,
      expected: 0,
    };
  };
}

export const matchers = {
  async toBeAccessible(page: Page, options?: ToBeAccessibleOptions): Promise<MatcherResult> {
    const matcher = createToBeAccessibleMatcher();
    return matcher(page, options);
  },
};
