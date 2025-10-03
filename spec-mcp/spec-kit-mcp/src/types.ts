/**
 * spec-kit-mcp 类型定义
 */

// 通用响应类型
export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

// Tool Context（提供给 Prompts 使用）
export interface ToolContext {
  projectPath: string;
  dashboardUrl?: string;
}

// specify 工具
export interface SpecifyInput {
  feature_description: string;
  allow_overwrite?: boolean;
}

export interface SpecifyOutput {
  feature_id: string;
  spec_path: string;
  content: string;
  status: "created" | "overwritten";
}

// plan 工具
export interface PlanInput {
  feature_id: string;
  spec_path?: string;
  tech_constraints?: string;
}

export interface PlanOutput {
  feature_id: string;
  plan_path: string;
  files_created: string[];
  status: "completed";
}

// tasks 工具
export interface TasksInput {
  feature_id: string;
  plan_path?: string;
}

export interface TasksOutput {
  feature_id: string;
  tasks_path: string;
  task_count: number;
  status: "completed";
}

// clarify 工具
export interface ClarifyInput {
  spec_path: string;
  max_questions?: number;
  interactive?: boolean;
  categories?: string[];
}

export interface ClarifyQuestion {
  category: string;
  question: string;
  context: string;
  answer?: string;
}

export interface ClarifyOutput {
  spec_path: string;
  questions: ClarifyQuestion[];
  updated_spec_path?: string;
}

// analyze 工具
export interface AnalyzeInput {
  spec_path: string;
  plan_path?: string;
  tasks_path?: string;
}

export interface AnalyzeIssue {
  category: "redundancy" | "ambiguity" | "insufficiency" | "constitution" | "coverage_gap" | "inconsistency";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  location: string;
  description: string;
  suggestion: string;
}

export interface AnalyzeOutput {
  issues: AnalyzeIssue[];
  constitution_violations: string[];
  summary: {
    total_issues: number;
    critical_count: number;
    pass: boolean;
  };
}

// implement 工具
export interface ImplementInput {
  task_id: string;
  tasks_path: string;
  strict_tdd?: boolean;
  phase?: "setup" | "tests" | "core" | "integration" | "polish" | "all";
}

export interface ImplementOutput {
  task_id: string;
  phase: string;
  changes: Array<{
    file_path: string;
    action: "created" | "modified" | "deleted";
    diff?: string;
  }>;
  tests: {
    passed: number;
    failed: number;
    skipped: number;
    output: string;
  };
  next_phase: string | null;
}

// constitution 工具
export interface ConstitutionInput {
  action: "view" | "update" | "check";
  file_path?: string;
  rule_updates?: Record<string, string>;
}

export interface ConstitutionOutput {
  action: string;
  content?: string;
  violations?: string[];
  updated?: boolean;
}

// 错误码
export enum ErrorCode {
  E_EXISTS = "E_EXISTS",
  E_NOT_FOUND = "E_NOT_FOUND",
  E_PRECONDITION = "E_PRECONDITION",
  E_VALIDATION = "E_VALIDATION",
  E_CONSTITUTION_CRITICAL = "E_CONSTITUTION_CRITICAL",
  E_BASH_FAILED = "E_BASH_FAILED",
}

export class SpecKitError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "SpecKitError";
  }
}
