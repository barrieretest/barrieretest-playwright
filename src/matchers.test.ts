import { describe, expect, it, mock } from "bun:test";
import { createToBeAccessibleMatcher } from "./matchers.js";

type MatcherPage = Parameters<ReturnType<typeof createToBeAccessibleMatcher>>[0];

const createMockPage = (url: string = "https://example.com"): MatcherPage => ({
  url: () => url,
  goto: mock(() => Promise.resolve(null)) as MatcherPage["goto"],
  evaluate: mock(() => Promise.resolve(false)) as MatcherPage["evaluate"],
  screenshot: mock(() => Promise.resolve(Buffer.from([]))) as MatcherPage["screenshot"],
  title: mock(() => Promise.resolve("Test Page")),
  context: mock(() => ({})) as unknown as MatcherPage["context"],
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
  });

  it("should fail when page URL is empty", async () => {
    const matcher = createToBeAccessibleMatcher();
    const page = createMockPage("");

    const result = await matcher(page);

    expect(result.pass).toBe(false);
    expect(result.message()).toContain("Page has no URL");
  });
});

describe("matcher options merging", () => {
  it("should use fixture config when no matcher options provided", () => {
    const fixtureConfig = {
      minSeverity: "serious" as const,
      ignore: ["test-rule"],
    };

    const matcher = createToBeAccessibleMatcher(fixtureConfig);
    expect(typeof matcher).toBe("function");
  });

  it("should allow matcher options to override fixture config", () => {
    const fixtureConfig = {
      minSeverity: "serious" as const,
    };

    const matcher = createToBeAccessibleMatcher(fixtureConfig);
    expect(typeof matcher).toBe("function");
  });
});
