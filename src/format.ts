import type { AuditResult, BaselineInfo, Issue, IssueSeverity } from "@barrieretest/core";

const SEVERITY_ICONS: Record<IssueSeverity, string> = {
  critical: "X",
  serious: "X",
  moderate: "!",
  minor: "-",
};

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: "\x1b[31m",
  serious: "\x1b[33m",
  moderate: "\x1b[34m",
  minor: "\x1b[90m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const severityOrder: IssueSeverity[] = ["critical", "serious", "moderate", "minor"];

function formatIssue(issue: Issue): string {
  const icon = SEVERITY_ICONS[issue.impact];
  const color = SEVERITY_COLORS[issue.impact];
  const lines: string[] = [];

  lines.push(`${color}${icon}${RESET} ${BOLD}${issue.impact}${RESET}: ${issue.id}`);

  if (issue.selector) {
    lines.push(`   Element: ${DIM}${issue.selector}${RESET}`);
  }

  if (issue.help) {
    lines.push(`   Fix: ${issue.help}`);
  }

  if (issue.helpUrl) {
    lines.push(`   ${DIM}${issue.helpUrl}${RESET}`);
  }

  return lines.join("\n");
}

function groupBySeverity(issues: Issue[]): Map<IssueSeverity, Issue[]> {
  const groups = new Map<IssueSeverity, Issue[]>();

  for (const severity of severityOrder) {
    const filtered = issues.filter((i) => i.impact === severity);
    if (filtered.length > 0) {
      groups.set(severity, filtered);
    }
  }

  return groups;
}

export function formatBaselineHint(baselinePath?: string): string {
  if (!baselinePath) return "";

  return `
${DIM}To add these to your baseline, run:${RESET}
  npx barrieretest baseline:accept ${baselinePath}
`;
}

function formatBaselineSummary(baseline: BaselineInfo): string {
  const parts: string[] = [];

  if (baseline.newIssues.length > 0) {
    parts.push(
      `${BOLD}${baseline.newIssues.length}${RESET} new issue${baseline.newIssues.length === 1 ? "" : "s"}`
    );
  }

  if (baseline.knownIssues.length > 0) {
    parts.push(
      `${DIM}${baseline.knownIssues.length} known issue${baseline.knownIssues.length === 1 ? "" : "s"} (in baseline)${RESET}`
    );
  }

  if (baseline.fixedIssues.length > 0) {
    parts.push(
      `${baseline.fixedIssues.length} issue${baseline.fixedIssues.length === 1 ? " has" : "s have"} been fixed`
    );
  }

  return parts.join(", ");
}

export function formatFailureMessage(result: AuditResult): string {
  const { issues, url, score, baseline } = result;

  if (issues.length === 0 && !baseline) {
    return "Expected page to have accessibility issues, but none were found.";
  }

  if (issues.length === 0 && baseline) {
    if (baseline.fixedIssues.length > 0) {
      return `${baseline.fixedIssues.length} issue${baseline.fixedIssues.length === 1 ? " has" : "s have"} been fixed since the baseline was created.`;
    }
    return "Expected page to have accessibility issues, but none were found.";
  }

  const lines: string[] = [];

  if (baseline) {
    lines.push(`Expected page to be accessible. Found: ${formatBaselineSummary(baseline)}`);
  } else {
    lines.push(
      `Expected page to be accessible, but found ${BOLD}${issues.length}${RESET} issue${issues.length === 1 ? "" : "s"}:`
    );
  }
  lines.push("");

  const issuesToShow = baseline ? baseline.newIssues : issues;
  const grouped = groupBySeverity(issuesToShow);

  for (const [, severityIssues] of grouped) {
    for (const issue of severityIssues) {
      lines.push(formatIssue(issue));
      lines.push("");
    }
  }

  lines.push(`${DIM}Score: ${score}/100${RESET}`);
  lines.push(`${DIM}URL: ${url}${RESET}`);

  if (baseline) {
    lines.push(formatBaselineHint(baseline.path));
  }

  return lines.join("\n");
}

export function formatPassMessage(result: AuditResult): string {
  return `Page passed accessibility check with score ${result.score}/100 and no issues found.`;
}

export function formatIssueSummary(issues: Issue[]): string {
  const counts: Record<IssueSeverity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };

  for (const issue of issues) {
    counts[issue.impact]++;
  }

  const parts: string[] = [];
  for (const severity of severityOrder) {
    if (counts[severity] > 0) {
      parts.push(`${counts[severity]} ${severity}`);
    }
  }

  return parts.join(", ");
}
