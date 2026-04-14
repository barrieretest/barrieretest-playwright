import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AuditOptions, AuditResult, Issue } from "@barrieretest/core";

let lastAuditOptions: AuditOptions | undefined;
let nextAuditResult: AuditResult;

mock.module("@barrieretest/core", () => ({
  audit: async (_page: unknown, options: AuditOptions): Promise<AuditResult> => {
    lastAuditOptions = options;
    return nextAuditResult;
  },
}));

const { createToBeAccessibleMatcher } = await import("./matchers.js");

type MatcherPage = Parameters<ReturnType<typeof createToBeAccessibleMatcher>>[0];

const createMockPage = (url: string = "https://example.com"): MatcherPage => ({
  url: () => url,
  goto: mock(() => Promise.resolve(null)) as MatcherPage["goto"],
  evaluate: mock(() => Promise.resolve(false)) as MatcherPage["evaluate"],
  screenshot: mock(() => Promise.resolve(Buffer.from([]))) as MatcherPage["screenshot"],
  title: mock(() => Promise.resolve("Test Page")),
  context: mock(() => ({})) as unknown as MatcherPage["context"],
});

function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "test-rule",
    impact: "serious",
    description: "Test description",
    help: "Test help text",
    helpUrl: "https://example.com/help",
    selector: ".test-element",
    nodes: [{ html: '<div class="test-element"></div>' }],
    ...overrides,
  };
}

function createMockResult(issues: Issue[] = [], overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    url: "https://example.com",
    documentTitle: "Test Page",
    score: 100 - issues.length * 10,
    severityLevel: issues.length > 0 ? "critical" : "excellent",
    scoreInterpretation: {
      range: issues.length > 0 ? "0-49" : "90-100",
      level: issues.length > 0 ? "critical" : "excellent",
      title: issues.length > 0 ? "Needs Work" : "Good",
      description: "Test interpretation",
      action: issues.length > 0 ? "Fix issues" : "No action needed",
      urgency: issues.length > 0 ? "high" : "low",
      recommendConsulting: false,
      color: "#000",
    },
    issues,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  lastAuditOptions = undefined;
  nextAuditResult = createMockResult();
});

describe("createToBeAccessibleMatcher", () => {
  it("should create a matcher function", () => {
    const matcher = createToBeAccessibleMatcher();
    expect(typeof matcher).toBe("function");
  });

  it("should create a matcher with config", () => {
    const config = {
      engine: "axe" as const,
      minSeverity: "serious" as const,
      detail: "actionable" as const,
    };
    const matcher = createToBeAccessibleMatcher(config);
    expect(typeof matcher).toBe("function");
  });

  it("should fail when page has no URL", async () => {
    const matcher = createToBeAccessibleMatcher();
    const page = createMockPage("about:blank");

    const result = await matcher(page);

    expect(result.pass).toBe(false);
    expect(result.message()).toContain("Page has no URL");
    expect(lastAuditOptions).toBeUndefined();
  });

  it("should fail when page URL is empty", async () => {
    const matcher = createToBeAccessibleMatcher();
    const page = createMockPage("");

    const result = await matcher(page);

    expect(result.pass).toBe(false);
    expect(result.message()).toContain("Page has no URL");
    expect(lastAuditOptions).toBeUndefined();
  });

  it("passes fix-ready detail through to failure formatting", async () => {
    nextAuditResult = createMockResult([
      createMockIssue({
        help: "Rule-level help",
        helpUrl: "https://example.com/docs",
        failureSummary: "Fix any of the following:\n  Specific element failure",
        nodes: [{ html: "<button>Submit</button>" }],
      }),
    ]);

    const matcher = createToBeAccessibleMatcher();
    const result = await matcher(createMockPage(), { detail: "fix-ready" });
    const message = result.message();

    expect(result.pass).toBe(false);
    expect(message).toContain("Help: Rule-level help");
    expect(message).toContain("Code: <button>Submit</button>");
    expect(message).toContain("Specific element failure");
    expect(message).toContain("Docs: ");
  });

  it("uses actionable formatting by default", async () => {
    nextAuditResult = createMockResult([
      createMockIssue({
        help: "Rule-level help",
        helpUrl: "https://example.com/docs",
        failureSummary: "Fix any of the following:\n  Specific element failure",
        nodes: [{ html: "<button>Submit</button>" }],
      }),
    ]);

    const matcher = createToBeAccessibleMatcher();
    const result = await matcher(createMockPage());
    const message = result.message();

    expect(message).toContain("Help: Rule-level help");
    expect(message).not.toContain("Code: ");
    expect(message).not.toContain("Specific element failure");
    expect(message).not.toContain("Docs: ");
  });
});

describe("matcher options merging", () => {
  it("should use fixture config when no matcher options provided", async () => {
    const fixtureConfig = {
      minSeverity: "serious" as const,
      ignore: ["test-rule"],
      detail: "actionable" as const,
      baseline: "./baselines/homepage.json",
      timeout: 30_000,
    };

    const matcher = createToBeAccessibleMatcher(fixtureConfig);
    await matcher(createMockPage());

    expect(lastAuditOptions).toMatchObject({
      minSeverity: "serious",
      ignore: ["test-rule"],
      detail: "actionable",
      baseline: "./baselines/homepage.json",
      timeout: 30_000,
      captureScreenshot: false,
    });
  });

  it("should allow matcher options to override fixture config", async () => {
    const fixtureConfig = {
      minSeverity: "serious" as const,
      detail: "actionable" as const,
      baseline: "./baselines/default.json",
    };

    const matcher = createToBeAccessibleMatcher(fixtureConfig);
    await matcher(createMockPage(), {
      minSeverity: "critical",
      detail: "fix-ready",
      baseline: "./baselines/override.json",
      updateBaseline: true,
    });

    expect(lastAuditOptions).toMatchObject({
      minSeverity: "critical",
      detail: "fix-ready",
      baseline: "./baselines/override.json",
      updateBaseline: true,
      captureScreenshot: false,
    });
  });
});
