# specify 命令执行流程对比

> 本文档详细对比 spec-kit 原始实现与 spec-kit-mcp 的 specify 工具执行流程
> 创建日期：2025-10-04

---

## 1. 概览对比

| 维度 | spec-kit（AI 驱动） | spec-kit-mcp（规则驱动） |
|------|---------------------|------------------------|
| 执行模式 | AI Prompt → Claude 推理 | TypeScript 函数 → 规则引擎 |
| 输入 | 自然语言描述 | JSON `{ feature_description: string }` |
| 输出 | spec.md（10k+ chars） | spec.md（2k chars，待优化） |
| 执行时间 | 5-10 秒 | <1 秒 |
| 确定性 | ❌ 相同输入可能不同输出 | ✅ 相同输入必定相同输出 |
| 质量 | 90-95%（AI 理解） | 75-80%（规则匹配） |

---

## 2. spec-kit `/specify` 命令完整执行流程

> 参考：`/Users/hhh0x/workflows/doing/spec-kit/AGENTS-v2.md`

### 2.1 命令触发

```
用户输入：/specify
系统响应：Please describe the feature you want to specify.
用户输入：[自然语言特性描述]
```

### 2.2 执行流程（14 步）

#### **步骤 1**: 解析用户描述
```
Input: 自然语言特性描述（可能包含技术细节）
Process: Claude 理解用户意图，提取核心需求
Output: 结构化的特性理解
```

**AI 能力体现**：
- 理解复杂的中文/英文混合描述
- 识别隐含的用户意图
- 推断缺失的上下文

#### **步骤 2**: 分配特征 ID
```
Process: 基于描述生成简洁的 kebab-case ID
Algorithm: 提取关键词 → 去重 → 拼接
Output: feature_id (如 "002-web-ai-agent")
```

**示例**：
```
Input: "我们要开发一款基于 Web 的 AI 项目管理应用"
Output: "002-web-ai-agent"
```

#### **步骤 3**: 创建目录结构
```bash
mkdir -p specs/{feature_id}/
```

#### **步骤 4**: 提取关键概念
```
Input: 用户描述
Process: AI 提取
  - Actors: 用户、管理员、Agent、系统
  - Actions: 创建、编辑、删除、查看、生成、优化
  - Data: 项目、文档、Milestone、Task、执行过程
  - Constraints: 权限、性能、安全

Output: Concepts {
  actors: ['用户', 'Agent', '项目所有者'],
  actions: ['创建', '编辑', '查看', '标记', '生成'],
  data: ['项目', 'Markdown文档', 'Milestone', 'Task', '执行过程条目'],
  constraints: ['只有项目所有者可以编辑', '不同类型用不同颜色渲染']
}
```

**AI 优势**：
- 理解上下文关系（"用户输入 → Agent 处理"）
- 识别同义词（"项目所有者" = "owner"）
- 推断隐含信息（"对话框" → 需要对话 UI）

#### **步骤 5**: 检测模糊点（Ambiguity Detection）
```
Process: AI 识别6类模糊点
1. Vague adjectives: "快速"、"安全"、"可扩展"（无量化指标）
2. Missing quantifiers: "很多用户"、"大量数据"（无具体数字）
3. Unclear actors: "系统"、"应用"（不明确是谁执行）
4. Implicit assumptions: "Agent 能理解上下文"（如何实现？）
5. Missing error handling: 网络失败、并发编辑
6. Unclear scope: "AI 能力"（具体包括哪些？）

Output: Ambiguities [
  {
    text: "用户通过和 Agent 的对话",
    category: "implicit_assumption",
    severity: "high",
    clarification_needed: "Agent 如何理解用户意图？使用何种 NLP 模型？"
  },
  {
    text: "不同颜色渲染不同类型",
    category: "missing_specification",
    severity: "medium",
    clarification_needed: "请提供具体的颜色方案和可访问性要求"
  }
]
```

**标记方式**：
```markdown
[NEEDS CLARIFICATION: Specify color palette or accessibility requirements for type-based rendering.]
```

#### **步骤 6**: 生成用户场景（Given-When-Then）
```
Process: AI 根据概念生成验收场景
Template: Given <前置条件>, When <执行动作>, Then <预期结果>

Output: Scenarios [
  {
    given: "a user types '创建项目' followed by a project description",
    when: "the Agent processes the request",
    then: "the system must create a new project with Markdown documentation, milestones, and tasks visible in the detail view"
  },
  {
    given: "a project has milestones and tasks",
    when: "the user marks a milestone or task as complete in the project detail UI",
    then: "the completion state must update immediately in both the milestone list and any roll-up views"
  }
]
```

**AI 能力**：
- 推导完整的用户旅程
- 识别关键交互点
- 生成可测试的验收标准

#### **步骤 7**: 生成功能需求（Functional Requirements）
```
Process: AI 将概念和场景转换为 MUST/SHOULD/MAY 需求
Algorithm:
  1. 为每个 actor-action 组合生成需求
  2. 添加权限控制需求
  3. 添加数据完整性需求
  4. 添加错误处理需求

Output: Requirements [
  {
    id: "FR-001",
    text: "The system MUST allow users to initiate project creation via conversational commands containing an explicit request (e.g., '创建项目 + 描述') and require the Agent to solicit any missing goals or scope details before creation proceeds."
  },
  {
    id: "FR-002",
    text: "Upon project creation, the Agent MUST generate and store a Markdown project document summarizing objectives, scope, and key assumptions derived from user input."
  },
  ...
]
```

**生成数量**：12-20 个详细需求

#### **步骤 8**: 提取数据实体（Key Entities）
```
Process: AI 从需求和描述中识别核心数据模型
Output: Entities [
  {
    name: "Project",
    description: "Represents a conversationally created initiative",
    attributes: ["title", "description", "Markdown document content", "creation timestamp", "owner", "overall status", "linked milestones"]
  },
  {
    name: "Milestone",
    description: "Represents a major deliverable under a project",
    attributes: ["name", "description", "due expectation", "completion status", "order", "associated tasks"]
  },
  {
    name: "Task",
    description: "Represents actionable work tied to a milestone",
    attributes: ["title", "description", "completion status", "assignee", "creation source", "ordered execution entries"]
  },
  {
    name: "ExecutionEntry",
    description: "Represents a single step/emotion/question/solution log item for a task",
    attributes: ["textual content", "type flag (step/emotion/question/solution)", "timestamp", "author", "sequence number"]
  },
  {
    name: "AgentSuggestion",
    description: "Captures AI-generated recommendations or document revisions",
    attributes: ["suggestion type", "associated project/task scope", "timestamp", "acceptance state"]
  }
]
```

**AI 能力**：
- 识别实体关系（Project → Milestone → Task → ExecutionEntry）
- 推断必需属性（ownership、timestamps、status）
- 发现隐含实体（AgentSuggestion）

#### **步骤 9**: 生成性能约束（Performance Constraints）
```
Process: AI 从描述中推断性能要求或使用默认值
Output: Constraints {
  response_time: "<400ms API p95",
  agent_latency: "<3s end-to-end",
  page_load: "<2s initial dashboard, LCP <2.5s",
  scale: "100 concurrent projects, 10k tasks, 1k execution entries per task"
}
```

#### **步骤 10**: 运行审查清单（Review Checklist）
```
Process: AI 检查8个质量门禁
Checks:
  1. ✅ No implementation details (languages, frameworks, APIs)
  2. ✅ Focused on user value and business needs
  3. ✅ Written for non-technical stakeholders
  4. ✅ All mandatory sections completed
  5. ❌ Contains [NEEDS CLARIFICATION] markers
  6. ✅ Requirements are testable and unambiguous
  7. ✅ Success criteria are measurable
  8. ✅ Observability expectations documented

Output: Checklist with ✅/❌ marks
```

#### **步骤 11**: 拒绝实现细节
```
Process: 如果描述包含技术实现细节，拒绝并要求重写
Blacklist keywords: [
  "API", "REST", "GraphQL", "database", "PostgreSQL",
  "React", "Vue", "Angular", "Node.js", "Python",
  "Docker", "Kubernetes", "microservices"
]

If detected:
  Throw Error: "Feature description contains technical implementation details.
  Please remove and focus on WHAT users need, not HOW to build it."
```

**示例拒绝**：
```
Input: "我们要用 React 和 PostgreSQL 构建一个项目管理系统"
Output: ❌ ERROR - Contains implementation details (React, PostgreSQL)
Suggestion: "我们要构建一个项目管理系统，用户可以..."
```

#### **步骤 12**: 生成 Execution Flow（执行流程伪代码）
```
Process: AI 生成类似伪代码的执行流程
Format:
```
## Execution Flow (main)
\`\`\`
1. User initiates a conversational request such as "创建项目 + 描述".
   → Agent confirms intent and gathers any missing project metadata,
     prompting the user until required details are supplied.

2. Agent creates a new project record.
   → Generate a Markdown project brief summarizing goals, scope, and key assumptions.
   → Derive milestone set and populate child task lists per milestone.

3. Application updates UI layers.
   → Home view refreshes to include the new project with status overview.
   → Detail view exposes Markdown document, milestones, and task lists with
     edit/complete controls limited to the project owner.

4. Team members manage progress.
   → Owners mark milestones/tasks complete as work advances; other
     collaborators view status in real time.
   → Open individual tasks to append ordered execution entries with type labels;
     only project owners may edit or delete previously logged entries.

5. Agent augments management experience.
   → Accept user prompts to refine Markdown documentation or regenerate
     work breakdowns.
   → Recommend management actions aligned with conversation context and await
     explicit user approval before applying changes.

6. Surface structured history.
   → Present execution entries visually with type-based cues so stakeholders
     grasp narrative flow.

7. Flag uncertainties for follow-up.
   → Ensure agent-suggested changes await explicit user approval before any
     updates occur.
   → [NEEDS CLARIFICATION: Specify color palette or accessibility requirements
     for type-based rendering.]

8. Return: SUCCESS when project lifecycle data is conversationally driven,
   reviewable, and ready for planning.
\`\`\`
```

**AI 能力**：
- 将复杂流程分解为清晰步骤
- 标注决策点和分支
- 嵌入 [NEEDS CLARIFICATION] 标记

#### **步骤 13**: 渲染模板
```
Process: AI 将所有提取的数据填充到 spec.md 模板
Template sections:
  1. Header (Feature Branch, Created, Status, Input)
  2. Execution Flow (main)
  3. Quick Guidelines
  4. Clarifications (Q&A)
  5. User Scenarios & Testing
  6. Requirements (Functional + Key Entities)
  7. Review & Acceptance Checklist
  8. Execution Status

Output: 完整的 spec.md（10k+ chars）
```

#### **步骤 14**: 写入文件并返回结果
```
Process:
  1. 写入 specs/{feature_id}/spec.md
  2. 返回统计信息
  3. 提供下一步建议

Output: {
  feature_id: "002-web-ai-agent",
  spec_path: "specs/002-web-ai-agent/spec.md",
  status: "created",
  warnings: [
    "2 NEEDS CLARIFICATION markers",
    "Run /clarify to resolve ambiguities"
  ],
  next_step: "Run /clarify to identify questions, then /plan to start implementation planning",
  stats: {
    actors: 5,
    actions: 10,
    scenarios: 3,
    requirements: 15,
    entities: 5,
    ambiguities: 2
  }
}
```

### 2.3 Clarifications 生成（额外对话）

**如果检测到模糊点**，AI 会在 spec.md 中记录澄清问题：

```markdown
## Clarifications

### Session 2025-09-27
- Q: If the Agent generates a milestone that ends up with no actionable tasks, how should the system respond?
  → A: Leave the milestone empty and mark it for manual follow-up

- Q: When two users try to edit the project Markdown or task status at the same time, how should conflicts be handled?
  → A: Only project owners may edit content; no concurrent edits

- Q: Should team members be able to edit or delete previously logged execution entries for a task?
  → A: Only project owners can edit or delete any entry

- Q: If the user's "创建项目 + 描述" message is too vague (missing goals or scope), how should the Agent proceed before creating the project?
  → A: Ask follow-up questions until required details are captured, then create

- Q: Agent-generated suggestions (e.g., risk alerts, milestone additions) currently lack an approval flow in the spec. How should the system handle them?
  → A: User must approve each suggestion before any change
```

**生成方式**：
- AI 识别模糊点 → 生成 Q
- 用户运行 `/clarify` → AI 生成澄清问题
- 用户回答 → AI 更新 spec.md 的 Clarifications 章节

---

## 3. spec-kit-mcp `/specify` 工具执行流程

> 实现位置：`src/tools/specify.ts` + `src/utils/spec-generation.ts`

### 3.1 命令触发

```typescript
// MCP 工具调用
await specify({
  feature_description: "我们要开发一款基于 Web 的 AI 项目管理应用..."
});
```

### 3.2 执行流程（14 步）

#### **步骤 1**: 解析用户描述
```typescript
// src/tools/specify.ts:16

const input = SpecifyInputSchema.parse(args);
// Input: { feature_description: string }
// Output: Validated input
```

**差异**：
- ❌ 无 AI 理解，只做 Zod schema 验证
- ❌ 无法推断隐含意图
- ✅ 类型安全

#### **步骤 2**: 分配特征 ID
```typescript
// src/tools/specify.ts:19-20

const featureId = generateFeatureId(input.feature_description);
const specDir = `specs/${featureId}`;
```

**实现**：
```typescript
// src/utils/feature.ts

export function generateFeatureId(description: string): string {
  // 取前50字符，转小写，替换空格为-
  return description
    .substring(0, 50)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}
```

**问题**：
- ❌ 生成的 ID 太长：`008-web-ai-agent-1-agent-markdown-milestones-milestone`
- ❌ 有重复词汇
- ❌ 无关键词提取逻辑

**对比 spec-kit**：
```
spec-kit: "002-web-ai-agent" ✅
spec-kit-mcp: "008-web-ai-agent-1-agent-markdown-milestones-milestone" ❌
```

#### **步骤 3**: 创建目录结构
```typescript
// src/tools/specify.ts:22-23

await mkdir(specDir, { recursive: true });
```

**差异**：
- ✅ 相同逻辑

#### **步骤 4**: 提取关键概念
```typescript
// src/tools/specify.ts:26

const concepts = extractKeyConcepts(input.feature_description);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:extractKeyConcepts()

export function extractKeyConcepts(description: string): Concepts {
  // 1. 提取 actors（仅英文关键词）
  const actorsPattern = /\b(user|admin|customer|client|manager|owner|team|guest)\b/gi;
  const actors = [...new Set(description.match(actorsPattern) || [])];

  // 2. 提取 actions（仅英文动词）
  const actionsPattern = /\b(create|edit|delete|view|upload|download|share|send|receive|manage|update)\b/gi;
  const actions = [...new Set(description.match(actionsPattern) || [])];

  // 3. 提取 data（仅英文名词）
  const dataPattern = /\b(profile|file|project|task|document|user|item|record|data)\b/gi;
  const data = [...new Set(description.match(dataPattern) || [])];

  // 4. 提取 constraints（无实现）
  const constraints: string[] = [];

  return { actors, actions, data, constraints };
}
```

**问题**：
- ❌ **无法匹配中文**：正则仅匹配英文单词边界 `\b`
- ❌ 关键词库过小：只有 10 个 actors、10 个 actions、10 个 data
- ❌ 无上下文理解：无法识别"用户在对话框中输入"中的"用户"和"对话框"关系

**测试中文描述**：
```
Input: "用户在对话框中输入'创建项目 + 描述'，Agent 自动完成项目初始化"
Expected: {
  actors: ['用户', 'Agent'],
  actions: ['输入', '创建', '初始化'],
  data: ['项目', '对话框', '描述']
}
Actual: {
  actors: [],
  actions: [],
  data: []
}
```

**结果**：❌ 完全失败

#### **步骤 5**: 检测模糊点
```typescript
// src/tools/specify.ts:29

const ambiguities = detectAmbiguities(input.feature_description, concepts);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:detectAmbiguities()

export function detectAmbiguities(description: string, concepts: Concepts): Ambiguity[] {
  const ambiguities: Ambiguity[] = [];

  // 规则1: 模糊形容词
  const vagueAdjectives = ['fast', 'slow', 'scalable', 'secure', 'intuitive', 'robust'];
  for (const adj of vagueAdjectives) {
    if (new RegExp(`\\b${adj}\\b`, 'i').test(description)) {
      ambiguities.push({
        text: `[NEEDS CLARIFICATION: Define "${adj}" - what are the measurable criteria?]`,
        category: 'vague_adjective',
        severity: 'medium',
      });
    }
  }

  // 规则2: 缺少 actors
  if (concepts.actors.length === 0) {
    ambiguities.push({
      text: '[NEEDS CLARIFICATION: User types not specified - who will use this feature?]',
      category: 'missing_actors',
      severity: 'high',
    });
  }

  // 规则3-6: 类似逻辑
  ...

  return ambiguities;
}
```

**问题**：
- ❌ 仅检测 6 类，spec-kit 有更复杂的上下文理解
- ❌ 无法识别中文模糊词（"快速"、"安全"）
- ✅ 能检测明显缺失（如 actors 为空）

**对比**：
```
spec-kit: 识别 "用户通过和 Agent 的对话" → 需要澄清 Agent 实现机制
spec-kit-mcp: ❌ 无法识别（concepts.actors 为空）
```

#### **步骤 6**: 生成用户场景
```typescript
// src/tools/specify.ts:32

const scenarios = generateScenarios(concepts);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:generateScenarios()

export function generateScenarios(concepts: Concepts): Scenario[] {
  if (concepts.actors.length === 0 || concepts.actions.length === 0) {
    // 返回通用模板
    return [
      {
        given: 'user wants to use the feature',
        when: 'user interacts with the system',
        then: 'the system responds as expected',
      },
    ];
  }

  const scenarios: Scenario[] = [];
  // 为前3个 actor-action 组合生成场景
  for (let i = 0; i < Math.min(3, concepts.actors.length); i++) {
    for (let j = 0; j < Math.min(2, concepts.actions.length); j++) {
      scenarios.push({
        given: `${concepts.actors[i]} wants to ${concepts.actions[j]}`,
        when: `${concepts.actors[i]} performs ${concepts.actions[j]} action`,
        then: `the system successfully completes ${concepts.actions[j]}`,
      });
    }
  }

  return scenarios;
}
```

**问题**：
- ❌ 由于 concepts 提取失败，返回通用模板
- ❌ 生成的场景过于抽象，无实际意义
- ❌ 无上下文推理

**对比**：
```
spec-kit:
  Given: "a user types '创建项目' followed by a project description"
  When: "the Agent processes the request"
  Then: "the system must create a new project with Markdown documentation,
         milestones, and tasks visible in the detail view"

spec-kit-mcp:
  Given: "user wants to use the feature"
  When: "user interacts with the system"
  Then: "the system responds as expected"
```

#### **步骤 7**: 生成功能需求
```typescript
// src/tools/specify.ts:35

const requirements = generateRequirements(concepts);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:generateRequirements()

export function generateRequirements(concepts: Concepts): Requirement[] {
  const requirements: Requirement[] = [];

  // 如果没有提取到概念，返回占位符
  if (concepts.actors.length === 0) {
    requirements.push({
      id: 'FR-0',
      text: 'System MUST missing actors [NEEDS CLARIFICATION: User types not specified]',
    });
    return requirements;
  }

  // 为每个 actor-action 生成需求
  let frNumber = 1;
  for (const actor of concepts.actors) {
    for (const action of concepts.actions) {
      requirements.push({
        id: `FR-${frNumber}`,
        text: `The system MUST allow ${actor} to ${action}`,
      });
      frNumber++;
    }
  }

  return requirements;
}
```

**问题**：
- ❌ 由于 concepts 为空，只生成 1 个占位符需求
- ❌ 无详细描述（spec-kit 有 60+ 词的详细说明）
- ❌ 无优先级、无约束、无权限控制

**对比**：
```
spec-kit: 15 个详细需求，每个 60-100 词
spec-kit-mcp: 1 个占位符需求
```

#### **步骤 8**: 提取数据实体
```typescript
// src/tools/specify.ts:38

const entities = extractEntities(concepts);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:extractEntities()

export function extractEntities(concepts: Concepts): Entity[] {
  // 将 data 转换为实体
  return concepts.data.map((dataObj) => ({
    name: dataObj.charAt(0).toUpperCase() + dataObj.slice(1),
    description: `Represents ${dataObj} in the system`,
    attributes: ['id', 'created_at', 'updated_at'],
  }));
}
```

**问题**：
- ❌ 由于 concepts.data 为空，返回空数组
- ❌ 无实体关系推断
- ❌ 无属性推断

**对比**：
```
spec-kit: 5 个详细实体（Project, Milestone, Task, ExecutionEntry, AgentSuggestion）
          每个实体 7-10 个属性
spec-kit-mcp: 0 个实体
```

#### **步骤 9**: 生成性能约束
```typescript
// src/tools/specify.ts:41

const constraints = generateConstraints(concepts);
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:generateConstraints()

export function generateConstraints(concepts: Concepts): string[] {
  const constraints: string[] = [];

  // 检测性能相关词汇
  if (description.match(/\b(fast|performance|speed|latency)\b/i)) {
    constraints.push('Performance: Response time < 200ms');
  }

  // 检测安全相关词汇
  if (description.match(/\b(secure|security|auth|login)\b/i)) {
    constraints.push('Security: Authentication required');
  }

  return constraints;
}
```

**问题**：
- ❌ 过于简单，无具体数值
- ❌ 无规模推断（用户数、数据量）

**对比**：
```
spec-kit:
  - API p95 latency < 400 ms
  - Agent response < 3 s
  - Initial dashboard load < 2 s, LCP < 2.5 s
  - 100 concurrent projects, 10k tasks, 1k entries per task

spec-kit-mcp:
  - Performance: Response time < 200ms (通用默认值)
```

#### **步骤 10**: 运行审查清单
```typescript
// src/tools/specify.ts:44-50

const reviewResult = runReviewChecks(
  input.feature_description,
  requirements,
  entities,
  ambiguities
);

if (reviewResult.hasImplementationDetails) {
  throw new SpecKitError(ErrorCode.E_VALIDATION, 'Remove tech details from spec');
}
```

**当前实现**：
```typescript
// src/utils/spec-generation.ts:runReviewChecks()

export function runReviewChecks(...): ReviewCheckResult {
  const techKeywords = [
    'API', 'REST', 'GraphQL', 'database', 'PostgreSQL', 'MongoDB',
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java',
    'Docker', 'Kubernetes', 'AWS', 'Azure',
  ];

  const hasImplementationDetails = techKeywords.some((kw) =>
    description.toLowerCase().includes(kw.toLowerCase())
  );

  return {
    hasImplementationDetails,
    missingActors: concepts.actors.length === 0,
    missingRequirements: requirements.length === 0,
    hasAmbiguities: ambiguities.length > 0,
    passed: !hasImplementationDetails && requirements.length > 0,
  };
}
```

**问题**：
- ❌ 仅检测技术关键词，无法检测"底层实现细节"
- ✅ 能拒绝明显的技术词汇

**对比**：
```
spec-kit: 8 项检查，包括可测试性、可观测性、范围边界
spec-kit-mcp: 4 项简单检查
```

#### **步骤 11**: 拒绝实现细节
```typescript
// src/tools/specify.ts:44-50 (integrated in Step 10)
```

**对比**：
- ✅ 相同逻辑
- ✅ 能拒绝包含 "React"、"PostgreSQL" 的描述

#### **步骤 12**: 生成 Execution Flow
```typescript
// ❌ 未实现
```

**问题**：
- ❌ 缺少此步骤
- ❌ spec.md 模板中无 "Execution Flow (main)" 章节

#### **步骤 13**: 渲染模板
```typescript
// src/tools/specify.ts:53-67

const template = await loadTemplate('spec.md');
const content = renderTemplate(template, {
  FEATURE_NAME: featureName,
  FEATURE_ID: featureId,
  DATE: new Date().toISOString().split('T')[0],
  SCENARIOS: scenarios,
  REQUIREMENTS: requirements,
  ENTITIES: entities,
  AMBIGUITIES_COUNT: ambiguities.length,
  REVIEW_CHECKLIST: reviewResult,
});
```

**模板**：
```handlebars
# Feature Specification: {{FEATURE_NAME}}

**Feature Branch**: `{{FEATURE_ID}}`
**Created**: {{DATE}}
**Status**: Draft

## ⚡ Quick Guidelines
...

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a user, I want to use the feature so that I can achieve my goal.

### Acceptance Scenarios
{{#each SCENARIOS}}
{{@index}}. **Given** {{this.given}}, **When** {{this.when}}, **Then** {{this.then}}
{{/each}}

## Requirements *(mandatory)*

### Functional Requirements
{{#each REQUIREMENTS}}
- **{{this.id}}**: {{this.text}}
{{/each}}

## Review & Acceptance Checklist
...
```

**问题**：
- ❌ 缺少 "Execution Flow (main)" 章节
- ❌ 缺少 "Clarifications" 章节（只有 ambiguities 计数）
- ❌ 缺少 "Input" 显示原始用户输入
- ❌ Primary User Story 是通用模板，非生成内容

#### **步骤 14**: 写入文件并返回结果
```typescript
// src/tools/specify.ts:69-87

await writeFileContent(specPath, content);

return {
  content: [
    {
      type: 'text',
      text: JSON.stringify(
        {
          feature_id: featureId,
          spec_path: specPath,
          status: 'created',
          warnings: [...],
          next_step: 'Run /clarify to resolve ambiguities',
          stats: {
            actors: concepts.actors.length,
            actions: concepts.actions.length,
            scenarios: scenarios.length,
            requirements: requirements.length,
            entities: entities.length,
            ambiguities: ambiguities.length,
          },
        },
        null,
        2
      ),
    },
  ],
};
```

**对比**：
- ✅ 返回格式相似
- ✅ 提供统计信息
- ✅ 建议下一步操作

---

## 4. 核心差距总结

### 4.1 量化对比

| 步骤 | spec-kit | spec-kit-mcp | 实现度 |
|------|----------|--------------|--------|
| 1. 解析描述 | AI 理解 | Zod 验证 | ⚠️ 50% |
| 2. Feature ID | AI 关键词提取 | 简单截断 | ❌ 20% |
| 3. 创建目录 | ✅ | ✅ | ✅ 100% |
| 4. 提取概念 | AI 上下文理解 | 正则匹配（仅英文） | ❌ 10% |
| 5. 检测模糊点 | AI 6 类检测 | 规则 6 类检测 | ⚠️ 40% |
| 6. 生成场景 | AI 推导用户旅程 | 模板组合 | ❌ 15% |
| 7. 生成需求 | AI 详细需求（60+ 词） | actor-action 模板 | ❌ 10% |
| 8. 提取实体 | AI 实体关系 | data → entity | ❌ 5% |
| 9. 性能约束 | AI 推断具体数值 | 通用默认值 | ⚠️ 30% |
| 10. 审查清单 | AI 8 项检查 | 规则 4 项检查 | ⚠️ 50% |
| 11. 拒绝技术细节 | ✅ | ✅ | ✅ 100% |
| 12. Execution Flow | AI 生成伪代码 | ❌ 未实现 | ❌ 0% |
| 13. 渲染模板 | ✅ | ✅ | ✅ 80% |
| 14. 写入文件 | ✅ | ✅ | ✅ 100% |

**平均实现度**：**~40%**（严重不足）

### 4.2 根本原因

1. **中文支持缺失**：
   - spec-kit（AI）：✅ 理解中英文混合
   - spec-kit-mcp：❌ 正则仅匹配英文 `\b` 边界

2. **上下文理解能力**：
   - spec-kit（AI）：✅ 推断实体关系、用户意图
   - spec-kit-mcp：❌ 无上下文，只有简单关键词匹配

3. **生成质量**：
   - spec-kit（AI）：60-100 词详细需求
   - spec-kit-mcp：10-20 词模板需求

4. **缺失章节**：
   - ❌ Execution Flow (main)
   - ❌ Clarifications Q&A
   - ❌ 原始用户输入显示

---

## 5. 优化优先级

### 🔴 P0 - 关键修复（必须）

#### 5.1 增强中文概念提取
```typescript
// 扩展中文关键词库
const CHINESE_ACTORS = ['用户', '管理员', 'Agent', '系统', '客户', '成员', '项目所有者'];
const CHINESE_ACTIONS = ['创建', '编辑', '删除', '查看', '上传', '下载', '分享', '生成', '优化'];
const CHINESE_DATA = ['项目', '文档', 'Milestone', 'Task', '任务', '执行过程', '条目'];

// 中文正则匹配（不依赖 \b）
for (const actor of CHINESE_ACTORS) {
  if (description.includes(actor)) {
    actors.push(actor);
  }
}
```

**预期改进**：
- 需求数量：1 → 8-12
- 实体数量：0 → 3-5
- 场景质量：通用模板 → 具体场景

#### 5.2 添加 Execution Flow 生成
```typescript
export function generateExecutionFlow(concepts, scenarios): string {
  const steps = scenarios.map((s, i) =>
    `${i + 1}. ${s.when}\n   → ${s.then}`
  );
  return `## Execution Flow (main)\n\`\`\`\n${steps.join('\n')}\n\`\`\``;
}
```

#### 5.3 改进 Feature ID 生成
```typescript
// 关键词提取 + 去重
export function generateFeatureId(description: string): string {
  const keywords = extractKeywords(description, 5); // 最多5个
  const uniqueKeywords = [...new Set(keywords)];
  return uniqueKeywords.join('-');
}
```

**示例**：
```
Input: "我们要开发一款基于 Web 的 AI 项目管理应用"
Output: "web-ai-项目-管理-应用" ✅
```

### 🟡 P1 - 重要改进

#### 5.4 添加 Clarifications Q&A 章节
```typescript
export function generateClarifications(ambiguities): Clarification[] {
  return ambiguities.map(a => ({
    question: convertToQuestion(a),
    answer: 'PENDING - run /clarify',
    priority: a.severity === 'high' ? 'high' : 'medium',
  }));
}
```

#### 5.5 改进需求生成质量
```typescript
// 添加详细描述
for (const actor of concepts.actors) {
  for (const action of concepts.actions) {
    requirements.push({
      id: `FR-${frNumber++}`,
      text: `The system MUST allow ${actor} to ${action} ${dataObj}`,
      details: extractDetailsFromDescription(actor, action, dataObj),
      priority: determinePriority(actor, action),
    });
  }
}
```

### 🟢 P2 - 体验优化

#### 5.6 添加原始用户输入显示
```handlebars
**Input**: User description: "{{USER_INPUT}}"
```

#### 5.7 改进 Primary User Story 生成
```typescript
// 从第一个场景推导主要用户故事
const primaryStory = `As a ${concepts.actors[0]}, I ${concepts.actions[0]} ${concepts.data[0]} so that I can achieve my goal.`;
```

---

## 6. 成功指标

### 6.1 量化目标

| 指标 | 当前 | 短期目标（P0） | 长期目标（P0+P1） |
|------|------|---------------|------------------|
| spec.md 长度 | 1,923 chars | 5,000+ chars | 8,000+ chars |
| 需求数量 | 1 | 8-12 | 12-20 |
| 实体数量 | 0 | 3-5 | 4-6 |
| 场景质量 | 通用模板 | 具体场景 | 详细场景（40+ 词） |
| 章节完整性 | 4/6 | 5/6 | 6/6 |

### 6.2 质量目标

- ✅ 中文特性描述正确提取关键概念
- ✅ 生成完整的 Execution Flow
- ✅ 包含 Clarifications Q&A 章节
- ✅ 需求包含详细描述（40+ 词）
- ✅ Feature ID 简洁且去重

---

## 7. 参考

- spec-kit 实现：`/Users/hhh0x/workflows/doing/spec-kit/AGENTS-v2.md`
- spec-kit-mcp 实现：`src/tools/specify.ts` + `src/utils/spec-generation.ts`
- 真实输出对比：
  - spec-kit: `/Users/hhh0x/workflows/doing/observer/specs/002-web-ai-agent/spec.md`
  - spec-kit-mcp: `specs/008-web-ai-agent-1-agent-markdown-milestones-milestone/spec.md`
- 对比测试：`test-compare-with-real.ts`
- 优化建议：`optimization-recommendations.md`

---

**创建日期**：2025-10-04
**下一步**：实施 P0 优化（中文概念提取 + Execution Flow + Feature ID）

*Generated by spec-kit-mcp execution flow analysis*
