# spec-kit-mcp Implementation Audit Report

> **审查日期**: 2025-10-07
> **审查范围**: 所有 MCP Prompts、Tools、Server 注册与协调机制
> **重点关注**: Prompt/Tool descriptions 与工作流引导能力

---

## 执行摘要

本次审查针对 E2E-01 测试中发现的"MCP Prompts 未被调用"问题，对整个 spec-kit-mcp 实现进行了全面分析。虽然我们已经添加了 `spec-kit-guide` Tool 作为入口点，但发现 **各个 Prompt 和 Tool 的 descriptions 缺少工作流顺序信息**，这可能导致 LLM 在没有先调用 guide 的情况下，仍然不知道如何正确使用这些 Prompts。

### 关键发现

- ✅ **spec-kit-guide Tool**: 描述强度优秀，清晰强调"FIRST"
- ⚠️ **Prompt descriptions**: 缺少工作流位置、前置依赖、后续验证信息
- ⚠️ **Context Tool descriptions**: 没有强调验证用途和调用时机
- ⚠️ **init Tool description**: 没有强调"首次使用前必须执行"
- ⚠️ **constitution Prompt**: 没有明确标记为"维护操作"

### 优先级统计

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| 🔴 CRITICAL | 1 | 阻止 LLM 正确使用工作流 |
| 🟠 HIGH | 6 | 严重影响用户体验 |
| 🟡 MEDIUM | 3 | 影响质量和一致性 |
| 🟢 LOW | 2 | 改进建议 |

---

## 1. Prompts 分析（7个）

### 1.1 specify Prompt

**文件**: `src/prompts/specify.ts`

**当前 description**:
```
"Create or update the feature specification from a natural language feature description"
```

**分析**:
- ❌ **缺少工作流位置**: 没有说明这是"第一步"（在 init 之后）
- ❌ **缺少前置条件**: 没有提到需要先调用 init Tool
- ❌ **缺少后续验证**: 没有提到应该调用 spec-context Tool 验证
- ✅ **功能描述清晰**: 明确说明了用途

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `[STEP 1] Create or update the feature specification from a natural language feature description.

Prerequisites: Call init tool first to create .specify/ structure.
After completion: Call spec-context tool to verify spec.md quality (8k-12k chars, 12-20 requirements).

This is the first step in the spec-kit workflow. Always start here when creating new features.`
```

---

### 1.2 clarify Prompt

**文件**: `src/prompts/clarify.ts`

**当前 description**:
```
"Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec"
```

**分析**:
- ❌ **缺少工作流位置**: 没有说明这是"第二步"（在 specify 之后）
- ❌ **缺少可选性说明**: 没有说明这是可选但推荐的步骤
- ❌ **缺少后续验证**: 没有提到应该调用 spec-context Tool 验证更新
- ✅ **功能描述详细**: 说明了交互式问答和数量限制（5个）

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `[STEP 2 - OPTIONAL BUT RECOMMENDED] Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec.

Prerequisites: Call specify prompt first to create spec.md.
After completion: Call spec-context tool to verify Clarifications section exists.

This interactive Q&A stage reduces downstream rework risk. Skip only for exploratory spikes.`
```

---

### 1.3 plan Prompt

**文件**: `src/prompts/plan.ts`

**当前 description**:
```
"Execute the implementation planning workflow using the plan template to generate design artifacts"
```

**分析**:
- ❌ **缺少工作流位置**: 没有说明这是"第三步"
- ❌ **缺少前置条件**: 没有提到需要先有 spec.md（clarify 可选）
- ❌ **缺少后续验证**: 没有提到应该调用 plan-context Tool 验证
- ❌ **描述不够具体**: "design artifacts"太抽象

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `[STEP 3] Execute the implementation planning workflow using the plan template to generate plan.md with tech stack, data model, and execution phases.

Prerequisites: spec.md must exist (from specify prompt). Recommended to run clarify prompt first.
After completion: Call plan-context tool to verify plan.md structure (7 tech decisions, data model, 5 phases).

Generates: plan.md, research.md, data-model.md, contracts/, quickstart.md`
```

---

### 1.4 tasks Prompt

**文件**: `src/prompts/tasks.ts`

**当前 description**:
```
"Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts"
```

**分析**:
- ❌ **缺少工作流位置**: 没有说明这是"第四步"
- ❌ **缺少前置条件**: 没有提到需要先有 plan.md
- ❌ **缺少后续验证**: 没有提到应该调用 tasks-context Tool 验证
- ✅ **强调依赖顺序**: "dependency-ordered"很好

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `[STEP 4] Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.

Prerequisites: plan.md must exist (from plan prompt).
After completion: Call tasks-context tool to verify tasks.md structure (20+ tasks, 5 phases).

Generates tasks in 5 phases: Setup → Tests [P] → Core → Integration → Polish [P]`
```

---

### 1.5 analyze Prompt

**文件**: `src/prompts/analyze.ts`

**当前 description**:
```
"Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation"
```

**分析**:
- ✅ **明确时机**: "after task generation"很好
- ❌ **缺少工作流位置**: 没有说明这是"第五步"
- ❌ **缺少可选性说明**: 没有说明这是可选但推荐的步骤
- ✅ **强调只读**: "non-destructive"很好

**严重程度**: 🟡 MEDIUM

**推荐改进**:
```typescript
description: `[STEP 5 - OPTIONAL BUT RECOMMENDED] Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation.

Prerequisites: All three artifacts (spec.md, plan.md, tasks.md) must exist.
Output: Analysis report with 6 quality checks (duplication, ambiguity, underspecification, constitution alignment, coverage gaps, inconsistency).

This stage detects quality issues before implementation. Recommended for production-quality specs.`
```

---

### 1.6 implement Prompt

**文件**: `src/prompts/implement.ts`

**当前 description**:
```
"Execute the implementation plan by processing and executing all tasks defined in tasks.md"
```

**分析**:
- ❌ **缺少工作流位置**: 没有说明这是"第六步"（最后一步）
- ❌ **缺少前置条件**: 没有提到建议先运行 analyze（可选）
- ❌ **缺少后续验证**: 没有提到应该调用 tasks-context Tool 跟踪进度
- ✅ **功能描述清晰**: 说明了执行 tasks.md

**严重程度**: 🟡 MEDIUM

**推荐改进**:
```typescript
description: `[STEP 6] Execute the implementation plan by processing and executing all tasks defined in tasks.md using TDD approach (Red-Green-Refactor-Commit).

Prerequisites: tasks.md must exist. Recommended to run analyze prompt first to detect quality issues.
Progress tracking: Use tasks-context tool to verify completion status.

Executes tasks phase-by-phase: Setup → Tests → Core → Integration → Polish`
```

---

### 1.7 constitution Prompt

**文件**: `src/prompts/constitution.ts`

**当前 description**:
```
"Create or update the project constitution from interactive or provided principle inputs, ensuring all dependent templates stay in sync"
```

**分析**:
- ❌ **缺少维护标记**: 没有说明这是维护操作，不是主工作流
- ❌ **缺少调用时机**: 没有说明何时应该调用
- ✅ **功能描述详细**: 说明了模板同步

**严重程度**: 🟡 MEDIUM

**推荐改进**:
```typescript
description: `[MAINTENANCE] Create or update the project constitution from interactive or provided principle inputs, ensuring all dependent templates stay in sync.

This is NOT part of the regular workflow. Only call when user explicitly requests to update design principles or governance rules.

Updates: .specify/memory/constitution.md and propagates changes to all templates.`
```

---

## 2. Tools 分析（5个）

### 2.1 spec-kit-guide Tool ⭐

**文件**: `src/tools/spec-kit-guide.ts`

**当前 description**:
```
⭐ Call this tool FIRST to understand spec-kit-mcp workflow before any other operations.

Returns: Simplified workflow diagram + available Prompts/Tools + step-by-step guide.

CRITICAL: You MUST use MCP Prompts (specify, clarify, plan, tasks, analyze, implement) at each stage.
DO NOT manually generate content using Write/Bash tools - Prompts provide standardized instructions.

Always call this tool first when users request spec creation or feature development.
```

**分析**:
- ✅ **强度优秀**: 多次强调"FIRST"、"MUST"、"Always"
- ✅ **明确用途**: 说明了返回内容和使用场景
- ✅ **关键警告**: 强调不要手动生成内容
- ✅ **触发条件**: 明确说明何时调用

**严重程度**: ✅ 无问题

**建议**: 保持现状，这是最佳实践

---

### 2.2 init Tool

**文件**: `src/tools/init.ts`

**当前 description**:
```
"Initialize .specify/ directory structure with scripts, templates, and configuration for spec-kit workflow"
```

**分析**:
- ❌ **缺少强度**: 没有强调"首次使用前必须执行"
- ❌ **缺少位置**: 没有说明在 spec-kit-guide 之后调用
- ❌ **缺少验证**: 没有说明如何验证初始化成功
- ✅ **功能描述清晰**: 说明了创建什么结构

**严重程度**: 🔴 CRITICAL

**推荐改进**:
```typescript
description: `Initialize .specify/ directory structure with scripts, templates, and configuration for spec-kit workflow.

⚠️ MUST be called ONCE before using any Prompts. Call from project root directory.

Creates:
- .specify/scripts/bash/ (4 scripts: create-new-feature.sh, setup-plan.sh, check-prerequisites.sh, common.sh)
- .specify/templates/ (3 templates: spec-template.md, plan-template.md, tasks-template.md)
- .specify/memory/ (1 constitution: constitution.md)

Verification: Run 'ls -R .specify/' to confirm structure exists.`
```

**理由**: init Tool 是第一个操作步骤（在 spec-kit-guide 之后），必须强调其重要性和强制性。

---

### 2.3 spec-context Tool

**文件**: `src/tools/spec-context.ts`

**当前 description**:
```
"Read and parse spec.md to get specification context"
```

**分析**:
- ❌ **缺少用途**: 没有说明这是验证工具
- ❌ **缺少时机**: 没有说明应该在 specify/clarify Prompt 之后调用
- ❌ **缺少标准**: 没有说明质量标准（8k-12k chars, 12-20 reqs）
- ✅ **功能描述简洁**: 说明了读取和解析

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `Read and parse spec.md to get specification context. Use this tool to verify spec.md quality after calling specify or clarify prompts.

Quality standards to check:
- Character count: 8,000-12,000 chars
- Requirements: 12-20 functional requirements
- Entities: 4-6 data entities
- User stories: GIVEN-WHEN-THEN format
- Clarifications section: Exists after clarify prompt

Returns: Full content, parsed sections (overview, clarifications, requirements, etc.), and metadata.`
```

---

### 2.4 plan-context Tool

**文件**: `src/tools/plan-context.ts`

**当前 description**:
```
"Read and parse plan.md to get implementation plan context"
```

**分析**:
- ❌ **缺少用途**: 没有说明这是验证工具
- ❌ **缺少时机**: 没有说明应该在 plan Prompt 之后调用
- ❌ **缺少标准**: 没有说明质量标准（7 tech decisions, data model, 5 phases）
- ✅ **功能描述简洁**: 说明了读取和解析

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `Read and parse plan.md to get implementation plan context. Use this tool to verify plan.md quality after calling plan prompt.

Quality standards to check:
- Tech stack: 7 technical decisions with rationale
- Data model: TypeScript interfaces/types definition
- Phases: 5 implementation phases (Phase 0-4)
- Constitution alignment: References constitution principles
- Architecture: Clear system architecture

Returns: Full content, parsed sections (overview, architecture, data model, phases, etc.).`
```

---

### 2.5 tasks-context Tool

**文件**: `src/tools/tasks-context.ts`

**当前 description**:
```
"Read and parse tasks.md to get tasks context"
```

**分析**:
- ❌ **缺少用途**: 没有说明这是验证工具
- ❌ **缺少时机**: 没有说明应该在 tasks Prompt 之后调用
- ❌ **缺少标准**: 没有说明质量标准（20+ tasks, 5 phases）
- ✅ **功能描述简洁**: 说明了读取和解析

**严重程度**: 🟠 HIGH

**推荐改进**:
```typescript
description: `Read and parse tasks.md to get tasks context. Use this tool to verify tasks.md quality after calling tasks prompt or track implementation progress during implement prompt.

Quality standards to check:
- Total tasks: 20+ tasks minimum
- Phases: 5 phases (Setup, Tests, Core, Integration, Polish)
- Parallel markers: [P] for tasks that can run concurrently
- Dependencies: Clear dependency order
- Acceptance criteria: Each task has testable outcomes

Returns: Full content, parsed tasks with IDs/descriptions/completion status, grouped by phase.`
```

---

## 3. 协调机制分析

### 3.1 server.ts 注册顺序

**文件**: `src/server.ts`

**当前实现**:
```typescript
const allTools = [
  specKitGuideTool,  // ⭐ Call this FIRST
  initTool,
  specContextTool,
  planContextTool,
  tasksContextTool,
];
```

**分析**:
- ✅ **顺序正确**: spec-kit-guide 在第一位
- ✅ **有注释**: "⭐ Call this FIRST"
- ❌ **注释不影响 LLM**: 这只是给开发者看的
- ⚠️ **依赖 description**: 真正影响 LLM 的是各个 Tool/Prompt 的 description

**严重程度**: 🟢 LOW

**建议**: 保持现状，但确保 description 足够强

---

### 3.2 Prompt → Tool 模式缺失

**问题**: 虽然 spec-kit-guide 返回的数据强调了"Prompt → Context Tool → Prompt → Context Tool"模式，但各个 Prompt/Tool 的 description 没有互相引用。

**影响**:
- LLM 可能不知道应该在 Prompt 之后调用对应的 Context Tool
- LLM 可能不知道 Context Tool 是用来验证 Prompt 输出的

**严重程度**: 🟠 HIGH

**推荐改进**: 在每个 Prompt description 中添加"After completion: Call X-context tool"，在每个 Context Tool description 中添加"Use after X prompt"。

---

### 3.3 Context Tools 验证逻辑简单

**问题**: Context Tools 只是简单地读取文件和解析 sections，没有实际的质量验证。

**当前实现**:
- spec-context: 只解析 sections，不检查字符数、requirements 数量
- plan-context: 只解析 sections，不检查 tech decisions、data model
- tasks-context: 简单的任务提取，不检查任务总数、phases

**影响**: LLM 调用 Context Tool 后，无法得到明确的"质量是否达标"的反馈。

**严重程度**: 🟡 MEDIUM

**推荐改进**: 在 Context Tools 返回数据中添加 `validation` 字段：

```typescript
export interface SpecContext {
  path: string;
  content: string;
  sections: { ... };
  metadata: { ... };
  validation: {
    passed: boolean;
    checks: {
      characterCount: { value: number; expected: '8000-12000'; passed: boolean };
      requirementsCount: { value: number; expected: '12-20'; passed: boolean };
      entitiesCount: { value: number; expected: '4-6'; passed: boolean };
      hasClarifications: { value: boolean; expected: true; passed: boolean };
    };
  };
}
```

---

## 4. 优先级推荐

### 🔴 CRITICAL - 必须立即修复

**C1. init Tool description 缺少强制性强调**
- **问题**: 没有强调"首次使用前必须执行"
- **影响**: LLM 可能跳过 init，直接调用 specify Prompt，导致缺少 .specify/ 结构
- **修复**: 增强 description，添加"⚠️ MUST be called ONCE"

---

### 🟠 HIGH - 应该尽快修复

**H1. specify Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第一步，没有提到前置条件和后续验证
- **影响**: LLM 可能在没有 init 的情况下调用，或者不知道应该调用 spec-context 验证
- **修复**: 添加 "[STEP 1]" 标记、前置条件、后续验证

**H2. clarify Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第二步（可选但推荐）
- **影响**: LLM 可能跳过这个重要的澄清阶段，导致 spec 质量不高
- **修复**: 添加 "[STEP 2 - OPTIONAL BUT RECOMMENDED]"、强调减少返工风险

**H3. plan Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第三步，没有提到前置条件
- **影响**: LLM 可能在没有 spec.md 的情况下调用
- **修复**: 添加 "[STEP 3]"、前置条件、后续验证

**H4. tasks Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第四步，没有提到前置条件
- **影响**: LLM 可能在没有 plan.md 的情况下调用
- **修复**: 添加 "[STEP 4]"、前置条件、后续验证

**H5. spec-context Tool description 缺少验证用途**
- **问题**: 没有说明这是验证工具，应该在 specify/clarify 之后调用
- **影响**: LLM 可能不知道何时调用，或者不知道应该检查什么质量标准
- **修复**: 添加验证用途、调用时机、质量标准

**H6. plan-context Tool description 缺少验证用途**
- **问题**: 同 H5
- **影响**: 同 H5
- **修复**: 同 H5

**H7. tasks-context Tool description 缺少验证用途**
- **问题**: 同 H5
- **影响**: 同 H5
- **修复**: 同 H5

**H8. Prompt → Tool 模式缺失**
- **问题**: Prompt 和 Tool 之间没有互相引用
- **影响**: LLM 可能不知道应该在 Prompt 之后调用 Tool 验证
- **修复**: 在 Prompt description 添加"After completion: Call X-context tool"

---

### 🟡 MEDIUM - 改善质量

**M1. analyze Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第五步（可选但推荐）
- **影响**: LLM 可能不知道何时调用，或者认为不重要
- **修复**: 添加 "[STEP 5 - OPTIONAL BUT RECOMMENDED]"

**M2. implement Prompt description 缺少工作流信息**
- **问题**: 没有说明这是第六步（最后一步）
- **影响**: LLM 可能不知道应该在最后调用
- **修复**: 添加 "[STEP 6]"、强调 TDD 方法

**M3. constitution Prompt description 缺少维护标记**
- **问题**: 没有说明这是维护操作，不是主工作流
- **影响**: LLM 可能在不需要的时候调用它
- **修复**: 添加 "[MAINTENANCE]"、说明只在用户明确要求时调用

**M4. Context Tools 验证逻辑简单**
- **问题**: 只读取解析，不做质量验证
- **影响**: LLM 调用后无法得到明确的"质量达标"反馈
- **修复**: 添加 validation 字段，返回质量检查结果

---

### 🟢 LOW - 优化建议

**L1. server.ts 注释不影响 LLM**
- **问题**: "⭐ Call this FIRST"注释只给开发者看
- **影响**: 不影响 LLM 行为
- **建议**: 保持现状，确保 description 足够强

**L2. Prompt arguments 描述抽象**
- **问题**: 一些 Prompt 的 arguments 描述太抽象（"context", "arguments"）
- **影响**: LLM 可能不知道应该传什么参数
- **建议**: 使用更具体的名称和描述

---

## 5. 修复计划

### Phase 1: CRITICAL 修复（立即执行）

**目标**: 确保 init Tool 被正确强调

1. 更新 `src/tools/init.ts`:
   - 增强 description，添加"⚠️ MUST be called ONCE"
   - 添加验证说明

**预计时间**: 10 分钟

---

### Phase 2: HIGH 优先级修复（尽快执行）

**目标**: 所有 Prompts 和主要 Tools 都有清晰的工作流信息

1. 更新所有 Prompt descriptions（specify, clarify, plan, tasks）:
   - 添加 [STEP X] 标记
   - 添加前置条件
   - 添加后续验证说明

2. 更新所有 Context Tool descriptions（spec-context, plan-context, tasks-context）:
   - 添加验证用途
   - 添加调用时机
   - 添加质量标准

**预计时间**: 1 小时

---

### Phase 3: MEDIUM 优先级修复（改善质量）

**目标**: 完善可选步骤和维护工具的说明

1. 更新 analyze Prompt description:
   - 添加 [STEP 5 - OPTIONAL] 标记
   - 强调质量检查重要性

2. 更新 implement Prompt description:
   - 添加 [STEP 6] 标记
   - 强调 TDD 方法

3. 更新 constitution Prompt description:
   - 添加 [MAINTENANCE] 标记
   - 说明只在明确要求时调用

4. 增强 Context Tools 验证逻辑:
   - 添加 validation 字段
   - 实现质量检查

**预计时间**: 2 小时

---

### Phase 4: LOW 优先级优化（长期改进）

**目标**: 细节优化

1. 改进 Prompt arguments 命名和描述
2. 添加更多示例

**预计时间**: 30 分钟

---

## 6. 测试验证计划

### 6.1 E2E 测试更新

修复完成后，重新运行 E2E-01 测试，验证：

1. ✅ LLM 是否首先调用 spec-kit-guide Tool
2. ✅ LLM 是否按顺序调用所有 Prompts（specify → clarify → plan → tasks → analyze → implement）
3. ✅ LLM 是否在每个 Prompt 之后调用对应的 Context Tool 验证
4. ✅ LLM 是否跳过 Prompts 而手动生成内容

### 6.2 单元测试

添加单元测试验证：

1. 所有 Prompt/Tool descriptions 包含必要的关键词
2. Context Tools 返回 validation 字段
3. 质量检查逻辑正确

---

## 7. 长期建议

### 7.1 增强 Context Tools 验证能力

当前 Context Tools 只读取和解析，建议：

1. **添加质量检查**: 返回 validation 字段，明确告诉 LLM 是否达标
2. **提供修复建议**: 如果质量不达标，返回具体的改进建议
3. **支持阈值配置**: 允许用户自定义质量标准

### 7.2 考虑添加 workflow-status Tool

类似于 spec-kit-guide，但用于运行时查询：

```typescript
{
  name: 'workflow-status',
  description: 'Check current workflow progress and what to do next',
  returns: {
    currentStage: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'implement',
    completed: ['init', 'specify'],
    nextActions: ['Call clarify prompt (optional)', 'Call plan prompt'],
    artifacts: {
      'spec.md': { exists: true, valid: true },
      'plan.md': { exists: false, valid: false }
    }
  }
}
```

### 7.3 改进 Server 描述支持

如果 MCP SDK 支持 Server-level description，应该添加：

```typescript
const server = new Server({
  name: "spec-kit-mcp",
  version: "0.2.0",
  description: "Pure MCP + LLM workflow tool for generating specifications, plans, and tasks. Always call spec-kit-guide tool first to understand the workflow."
}, ...);
```

---

## 8. 总结

### 当前状态

- ✅ **spec-kit-guide Tool**: 优秀的入口点，描述强度高
- ⚠️ **Prompts**: 功能完整，但 descriptions 缺少工作流引导
- ⚠️ **Context Tools**: 功能基础，缺少验证能力和使用说明

### 关键风险

如果不修复 HIGH 优先级问题：

1. **LLM 可能跳过 spec-kit-guide**: 如果直接看到 specify Prompt，可能直接调用而不先看 guide
2. **LLM 可能不按顺序调用**: 缺少 [STEP X] 标记，LLM 不知道顺序
3. **LLM 可能不调用 Context Tools**: 没有强调验证用途，LLM 可能认为不重要

### 修复后预期

修复所有 HIGH 优先级问题后：

1. ✅ 每个 Prompt/Tool description 都清晰说明其在工作流中的位置
2. ✅ LLM 知道每一步的前置条件和后续验证
3. ✅ LLM 知道 Context Tools 是用来验证质量的
4. ✅ LLM 知道 constitution 是维护操作，不是主工作流

### 成功标准

- ✅ E2E-01 测试通过：所有 Prompts 都被正确调用
- ✅ 每个 Prompt 之后都调用对应的 Context Tool
- ✅ 没有跳过 Prompts 而手动生成内容
- ✅ workflow 按正确顺序执行：init → specify → spec-context → clarify → spec-context → plan → plan-context → tasks → tasks-context → analyze → implement

---

## 9. 附录：对比示例

### 示例 1: specify Prompt description 对比

**修复前**:
```
"Create or update the feature specification from a natural language feature description"
```

**修复后**:
```
"[STEP 1] Create or update the feature specification from a natural language feature description.

Prerequisites: Call init tool first to create .specify/ structure.
After completion: Call spec-context tool to verify spec.md quality (8k-12k chars, 12-20 requirements).

This is the first step in the spec-kit workflow. Always start here when creating new features."
```

**对比**:
- ✅ 添加了 [STEP 1] 标记，明确位置
- ✅ 添加了前置条件（init tool）
- ✅ 添加了后续验证（spec-context tool + 质量标准）
- ✅ 添加了工作流说明

---

### 示例 2: spec-context Tool description 对比

**修复前**:
```
"Read and parse spec.md to get specification context"
```

**修复后**:
```
"Read and parse spec.md to get specification context. Use this tool to verify spec.md quality after calling specify or clarify prompts.

Quality standards to check:
- Character count: 8,000-12,000 chars
- Requirements: 12-20 functional requirements
- Entities: 4-6 data entities
- User stories: GIVEN-WHEN-THEN format
- Clarifications section: Exists after clarify prompt

Returns: Full content, parsed sections (overview, clarifications, requirements, etc.), and metadata."
```

**对比**:
- ✅ 添加了验证用途
- ✅ 添加了调用时机（after specify or clarify prompts）
- ✅ 添加了质量标准清单
- ✅ 添加了返回内容说明

---

## 10. 下一步行动

**立即执行**:
1. 审查本报告，确认优先级
2. 开始 Phase 1 修复（CRITICAL）
3. 进行 Phase 2 修复（HIGH）

**后续跟进**:
4. Phase 3 修复（MEDIUM）
5. 更新 E2E-01 测试文档
6. 重新运行 E2E-01 测试验证修复效果

---

**报告结束**
