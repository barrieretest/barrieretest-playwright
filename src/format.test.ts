import { describe, expect, it } from "bun:test";
import type { AuditResult, BaselineInfo, Issue, ScoreInterpretation } from "@barrieretest/core";
import {
  formatBaselineHint,
  formatFailureMessage,
  formatIssueSummary,
  formatPassMessage,
} from "./format";

// Strip ANSI escape codes for easier testing
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — matching ANSI escape sequences
const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

const createMockIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: "test-rule",
  impact: "serious",
  description: "Test description",
  help: "Test help text",
  helpUrl: "https://example.com/help",
  selector: ".test-element",
  nodes: [{ html: '<div class="test-element"></div>' }],
  ...overrides,
});

const createMockScoreInterpretation = (hasIssues: boolean): ScoreInterpretation => ({
  range: hasIssues ? "0-49" : "90-100",
  level: hasIssues ? "critical" : "excellent",
  title: hasIssues ? "Needs Work" : "Good",
  description: "Test interpretation",
  action: hasIssues ? "Fix critical issues" : "No action needed",
  urgency: hasIssues ? "high" : "low",
  recommendConsulting: false,
  color: "#000",
});

const createMockResult = (
  issues: Issue[] = [],
  overrides: Partial<AuditResult> = {}
): AuditResult => ({
  url: "https://example.com",
  documentTitle: "Test Page",
  score: 100 - issues.length * 10,
  severityLevel: issues.length > 0 ? "critical" : "excellent",
  scoreInterpretation: createMockScoreInterpretation(issues.length > 0),
  issues,
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe("formatFailureMessage", () => {
  it("should format a message for no issues (negated assertion case)", () => {
    const result = createMockResult([]);
    const message = formatFailureMessage(result);

    expect(message).toContain("Expected page to have accessibility issues");
    expect(message).toContain("none were found");
  });

  it("should format a single issue", () => {
    const issue = createMockIssue({
      id: "button-name",
      impact: "critical",
      help: "Add aria-label or visible text content",
      selector: "button.submit-btn",
    });
    const result = createMockResult([issue]);
    const message = formatFailureMessage(result);
    const plain = stripAnsi(message);

    expect(plain).toContain("Expected page to be accessible");
    expect(plain).toContain("1 issue");
    expect(plain).toContain("critical");
    expect(plain).toContain("button-name");
    expect(plain).toContain("button.submit-btn");
    expect(plain).toContain("Add aria-label or visible text content");
  });

  it("uses actionable detail by default", () => {
    const issue = createMockIssue({
      description: "Actionable description",
      help: "Rule-level help",
      helpUrl: "https://example.com/docs",
      failureSummary: "Fix any of the following:\n  Specific element failure",
      nodes: [{ html: "<button>Submit</button>" }],
    });
    const result = createMockResult([issue]);
    const plain = stripAnsi(formatFailureMessage(result));

    expect(plain).toContain("Actionable description");
    expect(plain).toContain("Help: Rule-level help");
    expect(plain).not.toContain("Code:");
    expect(plain).not.toContain("Specific element failure");
    expect(plain).not.toContain("Docs:");
  });

  it("supports minimal detail", () => {
    const issue = createMockIssue({
      description: "Minimal description",
      help: "Minimal help",
      selector: "#minimal-target",
      helpUrl: "https://example.com/minimal-docs",
      failureSummary: "Minimal failure summary",
    });
    const result = createMockResult([issue]);
    const plain = stripAnsi(formatFailureMessage(result, "minimal"));

    expect(plain).toContain("test-rule");
    expect(plain).not.toContain("#minimal-target");
    expect(plain).not.toContain("Minimal description");
    expect(plain).not.toContain("Minimal help");
    expect(plain).not.toContain("Minimal failure summary");
    expect(plain).not.toContain("example.com/minimal-docs");
  });

  it("supports fix-ready detail", () => {
    const issue = createMockIssue({
      description: "Fix-ready description",
      help: "Rule-level help",
      helpUrl: "https://example.com/fix-ready-docs",
      failureSummary: "Fix any of the following:\n  Specific element failure",
      nodes: [{ html: "<button class=\"submit\">Submit</button>" }],
    });
    const result = createMockResult([issue]);
    const plain = stripAnsi(formatFailureMessage(result, "fix-ready"));

    expect(plain).toContain("Fix-ready description");
    expect(plain).toContain("Help: Rule-level help");
    expect(plain).toContain("Code: <button class=\"submit\">Submit</button>");
    expect(plain).toContain("Fix any of the following:");
    expect(plain).toContain("Specific element failure");
    expect(plain).toContain("Docs: https://example.com/fix-ready-docs");
  });

  it("should format multiple issues", () => {
    const issues = [
      createMockIssue({ id: "button-name", impact: "critical" }),
      createMockIssue({ id: "image-alt", impact: "serious" }),
      createMockIssue({ id: "color-contrast", impact: "moderate" }),
    ];
    const result = createMockResult(issues);
    const message = formatFailureMessage(result);
    const plain = stripAnsi(message);

    expect(plain).toContain("3 issues");
    expect(plain).toContain("button-name");
    expect(plain).toContain("image-alt");
    expect(plain).toContain("color-contrast");
  });

  it("should include score and URL", () => {
    const result = createMockResult([createMockIssue()], {
      score: 75,
      url: "https://test.example.com/page",
    });
    const message = formatFailureMessage(result);

    expect(message).toContain("Score: 75/100");
    expect(message).toContain("URL: https://test.example.com/page");
  });

  it("should group issues by severity (critical first)", () => {
    const issues = [
      createMockIssue({ id: "minor-issue", impact: "minor" }),
      createMockIssue({ id: "critical-issue", impact: "critical" }),
      createMockIssue({ id: "serious-issue", impact: "serious" }),
    ];
    const result = createMockResult(issues);
    const message = formatFailureMessage(result);

    const criticalPos = message.indexOf("critical-issue");
    const seriousPos = message.indexOf("serious-issue");
    const minorPos = message.indexOf("minor-issue");

    // Critical should come before serious, serious before minor
    expect(criticalPos).toBeLessThan(seriousPos);
    expect(seriousPos).toBeLessThan(minorPos);
  });
});

describe("formatPassMessage", () => {
  it("should format a passing message with score", () => {
    const result = createMockResult([], { score: 95 });
    const message = formatPassMessage(result);

    expect(message).toContain("passed accessibility check");
    expect(message).toContain("95/100");
  });
});

describe("formatIssueSummary", () => {
  it("should return empty string for no issues", () => {
    const summary = formatIssueSummary([]);
    expect(summary).toBe("");
  });

  it("should count issues by severity", () => {
    const issues = [
      createMockIssue({ impact: "critical" }),
      createMockIssue({ impact: "critical" }),
      createMockIssue({ impact: "serious" }),
      createMockIssue({ impact: "minor" }),
    ];
    const summary = formatIssueSummary(issues);

    expect(summary).toContain("2 critical");
    expect(summary).toContain("1 serious");
    expect(summary).toContain("1 minor");
    expect(summary).not.toContain("moderate");
  });

  it("should order by severity", () => {
    const issues = [createMockIssue({ impact: "minor" }), createMockIssue({ impact: "critical" })];
    const summary = formatIssueSummary(issues);

    const criticalPos = summary.indexOf("critical");
    const minorPos = summary.indexOf("minor");

    expect(criticalPos).toBeLessThan(minorPos);
  });
});

describe("formatBaselineHint", () => {
  it("returns hint with baseline path", () => {
    const hint = formatBaselineHint("./baselines/homepage.json");
    const plain = stripAnsi(hint);

    expect(plain).toContain("To add these to your baseline, run:");
    expect(plain).toContain("npx barrieretest baseline:accept ./baselines/homepage.json");
  });

  it("returns empty string when no baseline path provided", () => {
    const hint = formatBaselineHint(undefined);
    expect(hint).toBe("");
  });
});

describe("formatFailureMessage with baseline", () => {
  it("includes known issues count when baseline provided", () => {
    const issue = createMockIssue({ id: "new-issue" });
    const knownIssue = createMockIssue({ id: "known-issue" });
    const baseline: BaselineInfo = {
      path: "./baselines/test.json",
      newIssues: [issue],
      knownIssues: [knownIssue],
      fixedIssues: [],
    };
    const result = createMockResult([issue, knownIssue], { baseline });
    const message = formatFailureMessage(result);
    const plain = stripAnsi(message);

    expect(plain).toContain("1 new issue");
    expect(plain).toContain("1 known issue");
  });

  it("includes baseline accept hint", () => {
    const issue = createMockIssue();
    const baseline: BaselineInfo = {
      path: "./baselines/test.json",
      newIssues: [issue],
      knownIssues: [],
      fixedIssues: [],
    };
    const result = createMockResult([issue], { baseline });
    const message = formatFailureMessage(result);
    const plain = stripAnsi(message);

    expect(plain).toContain("npx barrieretest baseline:accept");
    expect(plain).toContain("./baselines/test.json");
  });

  it("mentions fixed issues if any", () => {
    const baseline: BaselineInfo = {
      path: "./baselines/test.json",
      newIssues: [],
      knownIssues: [],
      fixedIssues: [{ rule: "fixed-rule", selector: "#elem", hash: "abc" }],
    };
    const result = createMockResult([], { baseline });
    const message = formatFailureMessage(result);
    const plain = stripAnsi(message);

    expect(plain).toContain("1 issue has been fixed");
  });
});
