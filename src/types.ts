import type { AuditEngine, DetailLevel, IssueSeverity } from "@barrieretest/core";

export interface BarrieretestConfig {
  /** Accessibility engine to use (default: "axe"). */
  engine?: AuditEngine;
  detail?: DetailLevel;
  minSeverity?: IssueSeverity;
  ignore?: string[];
  timeout?: number;
  baseline?: string;
}

export interface ToBeAccessibleOptions {
  minSeverity?: IssueSeverity;
  ignore?: string[];
  detail?: DetailLevel;
  baseline?: string;
  updateBaseline?: boolean;
}
