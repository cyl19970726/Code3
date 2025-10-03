# spec-kit-mcp 核心原理

> 如何使用 LLM + MCP 实现 spec-kit 工作流
> 创建日期：2025-10-03

---

## 1. 核心架构：Pure MCP + LLM

### 1.1 什么是 Pure MCP？

**Pure MCP Server** 是一种不直接调用 LLM API 的 MCP Server 架构：
- **只提供 Prompts**：引导 LLM 如何生成内容
- **只提供 Tools**：为 LLM 提供文件操作能力
- **LLM 完成所有工作**：利用 LLM 内置的语言理解、推理、生成能力

```
传统方式（规则引擎）:
User Input → 规则匹配 → 模板填充 → 生成内容
问题：无法理解中文、上下文推理差

Pure MCP 方式:
User Input → MCP Prompt → LLM（内置能力）→ 高质量内容
优势：中文理解、上下文推理、创造性生成
```

### 1.2 架构对比

#### 旧架构（规则引擎 - 已废弃）

```typescript
// ❌ 旧方式：直接调用规则引擎
export async function specify(args: { feature_description: string }) {
  // 1. 规则匹配：提取关键词
  const keywords = extractKeywords(args.feature_description);

  // 2. 模板填充
  const spec = fillTemplate('spec-template.md', {
    requirements: generateRequirements(keywords), // 硬编码规则
    entities: extractEntities(keywords),           // 正则匹配
  });

  // 3. 返回结果
  return { spec_path: 'specs/001/spec.md', content: spec };
}

// 问题：
// - 中文支持差（正则匹配失败）
// - 上下文理解弱（只看关键词）
// - 输出质量低（18% 覆盖率）
```

#### 新架构（Pure MCP + LLM）

```typescript
// ✅ 新方式：MCP Prompt 引导 LLM
export const specifyPrompt: PromptDefinition = {
  prompt: {
    name: 'specify',
    description: 'Create feature specification...',
    arguments: [{ name: 'featureDescription', required: true }]
  },

  handler: async (args, context) => {
    return [{
      role: 'user',
      content: {
        type: 'text',
        text: `
Given feature description: "${args.featureDescription}"

Do this:
1. Run script to create branch and spec file
2. Load template from .specify/templates/spec-template.md
3. Write comprehensive specification with:
   - 12-20 detailed requirements (60-100 words each)
   - 4-6 entities with 7-10 attributes
   - 3-5 Given-When-Then scenarios
   - 8+ step execution flow
   - 8,000-12,000 characters total

Quality Standards:
- Support Chinese descriptions
- Understand context deeply
- Generate creative, detailed content
        `
      }
    }];
  }
};

// 优势：
// - LLM 内置中文理解
// - LLM 内置上下文推理
// - LLM 生成高质量内容（100% 覆盖率）
```

---

## 2. 核心组件

### 2.1 MCP Prompts（7 个）

**作用**：引导 LLM 生成内容

| Prompt | 文件 | 引导内容 | LLM 生成什么 |
|--------|------|---------|-------------|
| `specify` | `prompts/specify.ts` | 如何创建 spec.md | 8k-12k 字符的详细规格 |
| `clarify` | `prompts/clarify.ts` | 如何交互式问答 | 5 个高优先级问题 + 更新 spec |
| `plan` | `prompts/plan.ts` | 如何创建设计文档 | plan.md + research.md + data-model.md |
| `tasks` | `prompts/tasks.ts` | 如何拆分任务 | tasks.md（40+ 任务） |
| `analyze` | `prompts/analyze.ts` | 如何质量检查 | 分析报告 + 修复建议 |
| `implement` | `prompts/implement.ts` | 如何执行任务 | TDD 实现代码 |
| `constitution` | `prompts/constitution.ts` | 如何更新宪法 | constitution.md 更新 |

**Prompt 示例**（specify.ts）：

```typescript
async function handler(args, context) {
  return [{
    role: 'user',
    content: {
      type: 'text',
      text: `
User input: "${args.featureDescription}"

Execution steps:
1. Run .specify/scripts/bash/create-new-feature.sh
2. Load .specify/templates/spec-template.md
3. Write specification to SPEC_FILE

Instructions for LLM:
- Parse user description (support Chinese)
- Extract concepts: actors, actions, data, constraints
- Detect ambiguities (6 types)
- Generate scenarios (Given-When-Then, 3-5)
- Generate requirements (12-20, detailed)
- Extract entities (4-6, with attributes)
- Generate execution flow (8+ steps)

Quality Standards:
- spec.md: 8,000-12,000 characters
- Requirements: 12-20 detailed items
- Entities: 4-6 with 7-10 attributes each
      `
    }
  }];
}
```

**关键点**：
- ✅ 我们不写生成逻辑，只写"如何生成"的指令
- ✅ LLM 使用内置能力完成所有推理和生成
- ✅ 支持中文、上下文理解、创造性输出

### 2.2 MCP Tools（3 个）

**作用**：为 LLM 提供文件操作能力

| Tool | 文件 | 功能 | LLM 如何使用 |
|------|------|------|-------------|
| `spec-context` | `tools/spec-context.ts` | 读取 spec.md | 获取规格上下文（requirements, entities） |
| `plan-context` | `tools/plan-context.ts` | 读取 plan.md | 获取设计上下文（architecture, tech stack） |
| `tasks-context` | `tools/tasks-context.ts` | 读取 tasks.md | 获取任务上下文（tasks, phases） |

**Tool 示例**（spec-context.ts）：

```typescript
export const specContextTool: Tool = {
  name: 'spec-context',
  description: 'Read and parse spec.md to get specification context',
  inputSchema: {
    type: 'object',
    properties: {
      specPath: { type: 'string', description: 'Path to spec.md' }
    },
    required: ['specPath']
  }
};

export async function handleSpecContext(args) {
  const content = readFileSync(args.specPath, 'utf-8');

  // Parse sections
  const sections = {
    overview: extractSection(content, 'Execution Flow'),
    clarifications: extractSection(content, 'Clarifications'),
    requirements: extractSection(content, 'Requirements'),
    // ...
  };

  return { path: args.specPath, content, sections };
}
```

**LLM 调用示例**：
```
LLM: [需要读取 spec.md]
LLM: 调用 spec-context tool { specPath: "specs/001/spec.md" }
Tool: 返回 { content: "...", sections: { requirements: "...", entities: "..." } }
LLM: [使用返回的上下文继续生成]
```

### 2.3 MCP Server

**作用**：注册 Prompts 和 Tools，处理请求

```typescript
// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { allPrompts } from "./prompts/index.js";
import { allTools } from "./tools/index.js";

const server = new Server({
  name: "spec-kit-mcp",
  version: "0.2.0"
}, {
  capabilities: {
    prompts: {},  // 注册 Prompts
    tools: {}     // 注册 Tools
  }
});

// 注册 7 个 Prompts
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptDef = allPrompts.find(p => p.prompt.name === request.params.name);
  const messages = await promptDef.handler(request.params.arguments, context);
  return { messages };
});

// 注册 3 个 Tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleTool(name, args);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});
```

---

## 3. 完整执行流程

### 3.1 用户视角：spec-kit 工作流

```
用户操作                       LLM 执行
─────────────────────────────────────────────────
/specify "用户认证系统"     →  生成 spec.md (10k 字符)
         ↓
/clarify                    →  问 5 个问题 + 更新 spec.md
         ↓                      Q1: Performance? → User: <500ms
         ↓                      [LLM 更新 spec.md]
/plan "Use NestJS"          →  生成 plan.md + design docs
         ↓
/tasks                      →  生成 tasks.md (40+ 任务)
         ↓
/analyze                    →  质量报告 + 修复建议
         ↓                      Report: 1 CRITICAL issue
         ↓                      Suggest fix? → User: yes
/implement                  →  执行任务（TDD）
```

### 3.2 技术视角：MCP 执行流程

以 `/specify` 为例：

```
Step 1: 用户调用 Prompt
──────────────────────────
User in Claude Desktop:
  使用 specify prompt
  Arguments:
    featureDescription: "用户认证系统，支持邮箱登录、OAuth、MFA"

Step 2: MCP Server 返回 Prompt Messages
──────────────────────────────────────
Server (src/server.ts):
  1. 找到 specifyPrompt
  2. 调用 handler({ featureDescription: "..." }, context)
  3. 返回 PromptMessage[]

Step 3: LLM 执行 Prompt 指令
───────────────────────────
LLM 收到消息:
  "Given feature description: '用户认证系统，支持邮箱登录、OAuth、MFA'

   Do this:
   1. Run script to create branch
   2. Load template
   3. Write spec with 12-20 requirements, 4-6 entities..."

LLM 内部推理:
  - 理解中文描述 ✅（内置能力）
  - 提取核心概念：User, Authentication, Email, OAuth, MFA
  - 推理隐含需求：密码强度、会话管理、安全性
  - 生成详细规格

Step 4: LLM 调用 Bash/文件工具
─────────────────────────────
LLM: 运行 bash 命令
  .specify/scripts/bash/create-new-feature.sh --json "用户认证系统"

Bash 返回:
  { "BRANCH_NAME": "feature/user-auth", "SPEC_FILE": "/path/to/spec.md" }

Step 5: LLM 生成内容
───────────────────
LLM: 生成 spec.md 内容
  # Feature Specification: 用户认证系统

  ## Requirements
  - **FR-001**: 系统必须支持邮箱 + 密码登录...（80 字）
  - **FR-002**: 系统必须支持 OAuth 2.0（Google, GitHub）...（75 字）
  - **FR-003**: 系统必须支持多因素认证（MFA）...（90 字）
  ... (共 15 个详细需求)

  ## Entities
  - **User**: id, email, password_hash, mfa_enabled, oauth_provider...（9 个属性）
  - **Session**: id, user_id, token, expires_at...（7 个属性）
  ... (共 5 个实体)

  总计: 10,500 字符 ✅

Step 6: LLM 写入文件
───────────────────
LLM: 写入文件
  Path: /path/to/spec.md
  Content: [生成的 spec.md]

Step 7: 完成报告
──────────────
LLM 返回给用户:
  ✅ Feature specification created!
  - Feature ID: user-auth
  - Branch: feature/user-auth
  - Spec: /path/to/spec.md
  - Requirements: 15
  - Entities: 5
  - Next: Run /clarify to resolve ambiguities
```

---

## 4. 内置审批机制

### 4.1 `/clarify` - 交互式问答审批

**原理**：用户回答问题 = 批准内容

```
执行流程:
─────────
Step 1: LLM 扫描 spec.md
  - 11 类模糊点检查
  - 生成 5 个高优先级问题队列

Step 2: 逐个提问（交互式）
  LLM: Q1: What are the target performance metrics?
       | Option | Description |
       | A | <100ms |
       | B | <500ms |  ← 用户选择
       | C | <1s |

  User: B  ✅ 这就是审批！

  LLM: [更新 spec.md]
       ## Clarifications
       ### Session 2025-10-03
       - Q: Performance metrics → A: <500ms

       ## Requirements (更新)
       - FR-006: API 响应时间必须 < 500ms (p95)

Step 3: 继续下一个问题
  LLM: Q2: How to handle concurrent login attempts?
  ...

Step 4: 完成报告
  LLM: ✅ Clarified 5 questions
       Updated sections: Requirements, Non-Functional
       Next: Run /plan
```

**关键点**：
- ✅ 不需要 Dashboard（所有交互在对话中）
- ✅ 用户回答 = 批准（实时更新 spec.md）
- ✅ 流畅的用户体验（无需切换工具）

### 4.2 `/analyze` - 质量报告审批

**原理**：用户审核报告 + 决定是否修复 = 批准流程

```
执行流程:
─────────
Step 1: LLM 读取 spec.md, plan.md, tasks.md
  - 调用 spec-context tool
  - 调用 plan-context tool
  - 调用 tasks-context tool

Step 2: LLM 执行 6 类检测
  A. Duplication detection
  B. Ambiguity detection
  C. Underspecification
  D. Constitution alignment
  E. Coverage gaps
  F. Inconsistency

Step 3: LLM 生成分析报告
  ### Specification Analysis Report
  | ID | Severity | Location | Summary |
  |----|----------|----------|---------|
  | C1 | CRITICAL | plan.md:L45 | Violates Library-First principle |
  | A2 | HIGH | spec.md:L120 | "fast" lacks measurable criteria |

  Metrics:
  - Total Issues: 2
  - Critical: 1
  - Coverage: 85% (17/20 requirements have tasks)

Step 4: LLM 询问用户
  LLM: Would you like me to suggest fixes for these 2 issues?

  User: yes  ✅ 这就是审批！

  LLM: Suggested fixes:
       1. C1: Replace custom auth with Passport.js library
       2. A2: Add measurable criteria: "API response < 500ms (p95)"

       Apply these fixes?

  User: yes  ✅ 二次确认

  LLM: [更新 plan.md 和 spec.md]

Step 5: 完成报告
  LLM: ✅ Analysis complete
       ✅ Applied 2 fixes
       Ready to /implement
```

**关键点**：
- ✅ 质量报告 = 审批材料
- ✅ 用户决定 = 审批动作
- ✅ 所有交互在对话中完成

---

## 5. 为什么 Pure MCP 更好？

### 5.1 对比：规则引擎 vs Pure MCP

| 维度 | 规则引擎（旧） | Pure MCP + LLM（新） |
|------|--------------|-------------------|
| **中文支持** | ❌ 差（正则失败） | ✅ 完美（LLM 内置） |
| **上下文理解** | ❌ 弱（只看关键词） | ✅ 强（深度推理） |
| **输出质量** | ❌ 低（18% 覆盖率） | ✅ 高（100% 覆盖率） |
| **可维护性** | ❌ 差（硬编码规则） | ✅ 好（只需更新 Prompt） |
| **扩展性** | ❌ 难（新增规则复杂） | ✅ 易（新增 Prompt 简单） |
| **代码量** | ❌ 多（4,418 行） | ✅ 少（~1,500 行） |

### 5.2 实际效果对比

**测试用例**：`"我们要开发一款基于 Web 的 AI 项目管理应用..."`

| 指标 | 规则引擎 | Pure MCP + LLM |
|------|---------|---------------|
| spec.md 字符数 | 1,923 | 10,695 |
| Requirements 数量 | 1 | 15 |
| Entities 数量 | 0 | 5 |
| Tasks 数量 | 12 | 52 |
| **覆盖率** | **18%** | **100%** |

### 5.3 架构优势

```
规则引擎问题:
1. 硬编码规则 → 难以维护
   if (description.includes("认证")) {
     requirements.push("支持登录");  // 太简单
   }

2. 无法理解上下文
   "快速响应" → 不知道多快
   "安全性" → 不知道具体要求

3. 中文支持差
   正则匹配：/\b(user|admin)\b/ → 无法匹配"用户"

Pure MCP 优势:
1. LLM 推理 → 自动维护
   "认证" → LLM 推理出：密码强度、会话管理、MFA、OAuth

2. 深度理解上下文
   "快速响应" → LLM 推理：<500ms, caching, CDN
   "安全性" → LLM 推理：HTTPS, CSRF, XSS protection

3. 完美中文支持
   "用户"、"管理员" → LLM 直接理解
```

---

## 6. 核心设计原则

### 6.1 Prompts 设计原则

1. **详细指令**：告诉 LLM 每一步做什么
2. **质量标准**：明确输出要求（字符数、数量、格式）
3. **上下文提供**：给 LLM 足够信息（项目路径、模板位置）
4. **错误处理**：预定义失败场景的处理方式

**示例**（好的 Prompt）：
```typescript
text: `
Given: "${args.featureDescription}"

Do this:
1. Run script: .specify/scripts/bash/create-new-feature.sh
2. Load template: .specify/templates/spec-template.md
3. Generate spec with:
   - 12-20 requirements (60-100 words each)  ← 具体数量
   - 4-6 entities with 7-10 attributes       ← 具体结构
   - 8,000-12,000 characters total           ← 具体长度

Quality Standards:
- Support Chinese descriptions
- Detect 6 types of ambiguities
- Use Given-When-Then format for scenarios
`
```

### 6.2 Tools 设计原则

1. **单一职责**：每个 Tool 只做一件事
2. **返回结构化数据**：JSON 格式，易于 LLM 理解
3. **错误明确**：清晰的错误消息
4. **无副作用**（Context Tools）：只读取，不修改

**示例**（好的 Tool）：
```typescript
export async function handleSpecContext(args) {
  try {
    const content = readFileSync(args.specPath, 'utf-8');

    return {
      path: args.specPath,
      content,
      sections: {
        requirements: extractSection(content, 'Requirements'),
        entities: extractSection(content, 'Entities')
      },
      metadata: {
        featureBranch: extractMetadata(content, 'Feature Branch')
      }
    };
  } catch (error) {
    throw new Error(`Failed to read spec file: ${error.message}`);
  }
}
```

### 6.3 审批流程设计原则

1. **对话优先**：所有交互在对话中完成
2. **实时反馈**：每个回答立即更新文件
3. **可追溯**：所有 Q&A 记录在 Clarifications section
4. **可中断**：用户可随时说"done"结束

---

## 7. 总结

### 7.1 核心思想

**spec-kit-mcp = spec-kit prompts + MCP Protocol + LLM 能力**

```
spec-kit (AI prompts)
  ↓ 转换
MCP Prompts (引导 LLM)
  ↓ 利用
LLM 内置能力 (中文、推理、生成)
  ↓ 输出
高质量文档 (spec/plan/tasks)
```

### 7.2 关键优势

1. **Pure MCP 架构**：不调用 LLM API，只提供 Prompts + Tools
2. **完美中文支持**：LLM 内置能力
3. **深度上下文理解**：LLM 推理能力
4. **内置审批机制**：交互式问答 + 质量报告
5. **无 Dashboard**：命令行优先，流畅体验

### 7.3 工作流程

```
用户 → MCP Prompt → LLM → MCP Tools → 文件系统
 ↑                                         ↓
 └────────── 审批（交互/报告）─────────────┘
```

**每个环节的职责**：
- **用户**：提供需求、回答问题、审核报告
- **MCP Prompt**：引导 LLM 如何生成
- **LLM**：理解、推理、生成内容
- **MCP Tools**：读取上下文、写入文件
- **文件系统**：存储最终输出

---

## 8. 参考

- **完整转换方案**：[conversion-plan.md](./conversion-plan.md)
- **审批机制澄清**：[approval-clarification.md](./approval-clarification.md)
- **如何使用 LLM**：[how-to-use-llm.md](./how-to-use-llm.md)
- **spec-kit 原项目**：https://github.com/pimzino/spec-kit

---

**创建日期**：2025-10-03
**版本**：1.0.0
**状态**：完成

*spec-kit-mcp - Pure MCP + LLM Architecture*
