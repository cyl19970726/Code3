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

## 4. 完整开发流程指南（实践）

### 4.1 环境准备

#### Step 1: 安装 spec-kit-mcp

**方式一：npx（推荐）**
```bash
# 在 Claude Code 的 .mcp.json 中配置
{
  "mcpServers": {
    "spec-kit": {
      "command": "npx",
      "args": ["-y", "@code3-team/spec-kit-mcp"]
    }
  }
}
```

**方式二：本地开发**
```bash
# Clone 并构建
git clone https://github.com/cyl19970726/Code3-Workspace.git
cd Code3-Workspace/spec-mcp/spec-kit-mcp
npm install
npm run build
npm link

# 配置 .mcp.json
{
  "mcpServers": {
    "spec-kit": {
      "command": "spec-kit-mcp"
    }
  }
}
```

#### Step 2: 初始化项目工作区

```bash
# 创建项目目录
mkdir my-awesome-project
cd my-awesome-project

# 初始化 Git（必须）
git init
touch README.md
git add .
git commit -m "Initial commit"
```

**重要**：spec-kit-mcp 依赖 Git 来管理分支和提交历史。

### 4.2 Stage 0: 初始化 .specify/ 结构

**目标**：创建 spec-kit 工作流所需的脚本、模板、宪法

**执行**：
```bash
# 在 Claude Code 中调用 init Tool
使用 init tool
Arguments: { projectPath: "/path/to/my-awesome-project" }
```

**LLM 执行流程**：
1. 调用 init Tool
2. Tool 在项目根目录创建 `.specify/` 结构：
   ```
   .specify/
   ├── scripts/bash/
   │   ├── create-new-feature.sh      # 创建功能分支和 spec 文件
   │   ├── setup-plan.sh              # 创建 plan.md
   │   ├── check-prerequisites.sh     # 检查前置条件
   │   └── common.sh                  # 通用函数
   ├── templates/
   │   ├── spec-template.md           # 规格模板
   │   ├── plan-template.md           # 计划模板
   │   └── tasks-template.md          # 任务模板
   └── memory/
       └── constitution.md            # 项目宪法（设计原则）
   ```

**验证**：
```bash
ls -R .specify/
# 预期输出：
# .specify/:
# memory  scripts  templates
#
# .specify/memory:
# constitution.md
#
# .specify/scripts:
# bash
#
# .specify/scripts/bash:
# check-prerequisites.sh  common.sh  create-new-feature.sh  setup-plan.sh
#
# .specify/templates:
# plan-template.md  spec-template.md  tasks-template.md
```

**完成标志**：✅ 4 个脚本 + 3 个模板 + 1 个宪法文件

---

### 4.3 Stage 1: 创建规格（spec.md）

**目标**：根据需求描述生成详细的功能规格文档

**输入**：需求描述（支持中文）

**执行**：
```
# 在 Claude Code 中
使用 specify prompt
Arguments:
  featureDescription: "每日 todo 工具，支持添加/编辑/删除任务、标记完成、按日期分组、持久化存储"
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given: "每日 todo 工具，支持添加/编辑/删除任务..."

   Do this:
   1. Run: .specify/scripts/bash/create-new-feature.sh --json "每日 todo 工具"
   2. Load: .specify/templates/spec-template.md
   3. Generate spec.md with:
      - 12-20 detailed requirements
      - 4-6 entities with attributes
      - 3-5 Given-When-Then scenarios
      - 8+ step execution flow
      - 8,000-12,000 characters total
   ```

2. **运行脚本创建分支**：
   ```bash
   LLM 执行: .specify/scripts/bash/create-new-feature.sh --json "每日 todo 工具"

   脚本输出:
   {
     "BRANCH_NAME": "001-daily-todo",
     "SPEC_FILE": "specs/001-daily-todo/spec.md"
   }
   ```

3. **切换到功能分支**：
   ```bash
   git checkout -b 001-daily-todo
   ```

4. **读取模板并生成 spec.md**：
   ```bash
   LLM 读取: .specify/templates/spec-template.md
   LLM 生成: specs/001-daily-todo/spec.md

   # 生成内容包含：
   - 15 个详细需求（每个 60-100 字）
   - 5 个实体（Todo, User, Tag, Category, Settings）
   - 4 个 Given-When-Then 场景
   - 10 步执行流程
   - 总计约 10,000 字符
   ```

**验证**：
```
# 在 Claude Code 中调用 spec-context Tool
使用 spec-context tool
Arguments: { specPath: "specs/001-daily-todo/spec.md" }

# Tool 返回：
{
  "path": "specs/001-daily-todo/spec.md",
  "content": "...",
  "sections": {
    "overview": "每日 todo 工具...",
    "requirements": ["FR-001: ...", "FR-002: ...", ...],  // 15 个
    "entities": ["Todo", "User", "Tag", ...],              // 5 个
    "scenarios": ["Given user...", ...]                     // 4 个
  },
  "metadata": {
    "featureBranch": "001-daily-todo",
    "characterCount": 10127                                // >= 8000 ✅
  }
}
```

**完成标志**：
- ✅ 分支已创建：`001-daily-todo`
- ✅ spec.md 已生成
- ✅ 需求数量：12-20 个
- ✅ 字符数：>= 8,000
- ✅ 包含 Given-When-Then 场景

---

### 4.4 Stage 2: 澄清需求（可选）

**目标**：识别规格中的歧义点，通过交互式问答澄清

**触发条件**：spec.md 中存在模糊需求

**执行**：
```
使用 clarify prompt
Arguments: { specPath: "specs/001-daily-todo/spec.md" }
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given spec: "specs/001-daily-todo/spec.md"

   Do this:
   1. Run: check-prerequisites.sh --json --paths-only
   2. Read spec.md
   3. Scan for 11 types of ambiguities:
      - Performance unclear
      - Storage mechanism unclear
      - UI/UX details missing
      - Error handling undefined
      - ...
   4. Generate max 5 high-priority questions
   5. Ask user interactively
   6. Update spec.md with answers
   ```

2. **扫描歧义点**：
   ```bash
   LLM 执行: .specify/scripts/bash/check-prerequisites.sh --json --paths-only
   LLM 分析: 11 类模糊点

   发现的歧义：
   - Performance: "快速响应" → 多快？
   - Storage: "持久化存储" → localStorage? IndexedDB? 数据库？
   - Priority: 是否支持任务优先级？
   - Tags: 是否支持标签系统？
   - Search: 是否支持搜索功能？
   ```

3. **交互式提问**：
   ```
   LLM: Q1: 性能要求是什么？
        A) 响应时间 < 100ms
        B) 响应时间 < 500ms
        C) 响应时间 < 1s

   User: B  ✅

   LLM: [更新 spec.md]
        ## Clarifications
        ### Session 2025-10-04
        - Q: 性能要求？
        - A: 响应时间 < 500ms (p95)

        ## Requirements (更新)
        - NFR-001: 所有 UI 操作响应时间必须 < 500ms (p95)

   LLM: Q2: 持久化存储方式？
        A) localStorage（简单，5MB 限制）
        B) IndexedDB（复杂，无限制）
        C) 云端数据库

   User: A  ✅

   LLM: [更新 spec.md]
        ## Technical Constraints
        - 使用 localStorage 持久化（限制 5MB）
   ```

4. **完成所有问题后更新文件**：
   ```bash
   LLM 写入: specs/001-daily-todo/spec.md
   # 更新 Clarifications section
   # 更新 Requirements section
   # 更新 Technical Constraints section
   ```

**验证**：
```
使用 spec-context tool
Arguments: { specPath: "specs/001-daily-todo/spec.md" }

# 验证 Clarifications section 存在
返回:
{
  "sections": {
    "clarifications": "### Session 2025-10-04\n- Q: ...\n- A: ..."
  }
}
```

**完成标志**：
- ✅ 提问 5 个问题
- ✅ 用户全部回答
- ✅ spec.md 更新完成
- ✅ Clarifications section 存在

---

### 4.5 Stage 3: 生成计划（plan.md）

**目标**：基于 spec.md 生成技术方案和架构设计

**执行**：
```
使用 plan prompt
Arguments: { specPath: "specs/001-daily-todo/spec.md" }
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given spec: "specs/001-daily-todo/spec.md"

   Do this:
   1. Run: setup-plan.sh --json
   2. Read: spec.md, constitution.md, plan-template.md
   3. Generate plan.md with:
      - Tech stack selection
      - Architecture design
      - Data model (TypeScript interfaces)
      - API design
      - 5 implementation phases
   ```

2. **运行脚本**：
   ```bash
   LLM 执行: .specify/scripts/bash/setup-plan.sh --json

   脚本输出:
   {
     "PLAN_FILE": "specs/001-daily-todo/plan.md",
     "SPEC_FILE": "specs/001-daily-todo/spec.md"
   }
   ```

3. **读取上下文**：
   ```bash
   LLM 调用: spec-context tool { specPath: "specs/001-daily-todo/spec.md" }
   LLM 读取: .specify/memory/constitution.md
   LLM 读取: .specify/templates/plan-template.md
   ```

4. **生成 plan.md**：
   ```markdown
   # Feature Plan: 每日 Todo 工具

   ## Tech Stack
   - Frontend: React 18 + TypeScript + Vite
   - Styling: Tailwind CSS
   - State: Zustand
   - Storage: localStorage
   - Testing: Vitest + React Testing Library

   ## Architecture
   - Component-based architecture
   - Custom hooks for business logic
   - localStorage adapter pattern

   ## Data Model
   ```typescript
   interface Todo {
     id: string;
     title: string;
     description?: string;
     completed: boolean;
     dueDate?: Date;
     priority: 'low' | 'medium' | 'high';
     tags: string[];
     createdAt: Date;
     updatedAt: Date;
   }

   interface TodoStore {
     todos: Todo[];
     addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
     updateTodo: (id: string, updates: Partial<Todo>) => void;
     deleteTodo: (id: string) => void;
     toggleComplete: (id: string) => void;
   }
   ```

   ## Implementation Phases
   1. **Phase 1: Setup** - Vite + React + Tailwind + Vitest
   2. **Phase 2: Tests** - 数据模型测试、localStorage 测试
   3. **Phase 3: Core** - Todo CRUD、useTodos hook
   4. **Phase 4: Integration** - 日期分组、优先级过滤、标签
   5. **Phase 5: Polish** - 响应式、动画、性能优化
   ```

**验证**：
```
使用 plan-context tool
Arguments: { planPath: "specs/001-daily-todo/plan.md" }

返回:
{
  "path": "specs/001-daily-todo/plan.md",
  "sections": {
    "techStack": "React 18 + TypeScript + Vite...",
    "architecture": "Component-based...",
    "dataModel": "interface Todo { ... }",
    "phases": ["Setup", "Tests", "Core", "Integration", "Polish"]
  }
}
```

**完成标志**：
- ✅ plan.md 已生成
- ✅ 包含技术选型
- ✅ 包含数据模型（TypeScript interfaces）
- ✅ 包含 5 个实施阶段

---

### 4.6 Stage 4: 生成任务（tasks.md）

**目标**：将 plan.md 拆分为可执行的任务清单

**执行**：
```
使用 tasks prompt
Arguments: { planPath: "specs/001-daily-todo/plan.md" }
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given plan: "specs/001-daily-todo/plan.md"

   Do this:
   1. Run: check-prerequisites.sh --json
   2. Read: plan.md, tasks-template.md
   3. Generate tasks.md with:
      - 20+ tasks grouped by 5 phases
      - Each task: clear goal, dependencies, acceptance criteria
   ```

2. **读取上下文**：
   ```bash
   LLM 调用: plan-context tool { planPath: "specs/001-daily-todo/plan.md" }
   LLM 读取: .specify/templates/tasks-template.md
   ```

3. **生成 tasks.md**：
   ```markdown
   # Tasks: 每日 Todo 工具

   ## Phase 1: Setup (4 tasks)
   - [ ] **T1.1**: 初始化 Vite + React + TypeScript 项目
         - 依赖：无
         - 验收：`npm run dev` 成功启动
   - [ ] **T1.2**: 配置 Tailwind CSS
         - 依赖：T1.1
         - 验收：样式正常渲染
   - [ ] **T1.3**: 配置 Vitest + React Testing Library
         - 依赖：T1.1
         - 验收：`npm test` 运行成功
   - [ ] **T1.4**: 配置 ESLint + Prettier
         - 依赖：T1.1
         - 验收：`npm run lint` 无错误

   ## Phase 2: Tests (6 tasks)
   - [ ] **T2.1**: 编写 Todo 数据模型测试
         - 依赖：T1.3
         - 验收：Todo interface 测试通过
   - [ ] **T2.2**: 编写 localStorage adapter 测试
         - 依赖：T1.3
         - 验收：CRUD 操作测试通过
   ...

   ## Phase 3: Core (8 tasks)
   - [ ] **T3.1**: 实现 Todo 数据模型
   - [ ] **T3.2**: 实现 localStorage adapter
   - [ ] **T3.3**: 实现 useTodos hook
   - [ ] **T3.4**: 实现 TodoList 组件
   ...

   ## Phase 4: Integration (6 tasks)
   ## Phase 5: Polish (4 tasks)

   Total: 28 tasks
   ```

**验证**：
```
使用 tasks-context tool
Arguments: { tasksPath: "specs/001-daily-todo/tasks.md" }

返回:
{
  "path": "specs/001-daily-todo/tasks.md",
  "tasks": [
    { "id": "T1.1", "title": "初始化 Vite...", "phase": "Setup", "status": "pending" },
    ...
  ],
  "phases": {
    "setup": ["T1.1", "T1.2", "T1.3", "T1.4"],
    "tests": ["T2.1", "T2.2", ...],
    "core": ["T3.1", "T3.2", ...],
    "integration": [...],
    "polish": [...]
  },
  "totalTasks": 28
}
```

**完成标志**：
- ✅ tasks.md 已生成
- ✅ 任务总数 >= 20
- ✅ 按 5 个阶段分组
- ✅ 每个任务包含依赖关系和验收标准

---

### 4.7 Stage 5: 质量分析（可选）

**目标**：检测文档质量问题，生成分析报告

**执行**：
```
使用 analyze prompt
Arguments: {
  specPath: "specs/001-daily-todo/spec.md",
  planPath: "specs/001-daily-todo/plan.md",
  tasksPath: "specs/001-daily-todo/tasks.md"
}
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given files: spec.md, plan.md, tasks.md

   Do this:
   1. Run: check-prerequisites.sh --json --require-tasks --include-tasks
   2. Read: all files + constitution.md
   3. Perform 6 types of checks:
      A. Duplication detection
      B. Ambiguity detection
      C. Underspecification
      D. Constitution alignment
      E. Coverage gaps
      F. Inconsistency
   4. Generate analysis report
   ```

2. **读取所有文档**：
   ```bash
   LLM 调用: spec-context tool
   LLM 调用: plan-context tool
   LLM 调用: tasks-context tool
   LLM 读取: .specify/memory/constitution.md
   ```

3. **执行 6 类检测**：
   ```
   A. 重复检测：
      - 发现：FR-003 和 FR-007 重复描述"标记完成"功能

   B. 歧义检测：
      - 发现：plan.md 中"快速响应"缺少量化指标

   C. 不完整检测：
      - 发现：spec.md 缺少错误处理需求

   D. 宪法合规：
      - 发现：plan.md 违反 Library-First 原则（自定义状态管理应使用 Zustand）

   E. 覆盖率缺口：
      - 发现：15 个需求中，有 2 个没有对应任务（FR-010, FR-012）

   F. 不一致：
      - 发现：spec.md 中 Todo 有 priority 字段，但 plan.md 数据模型缺少
   ```

4. **生成分析报告**：
   ```markdown
   # Specification Analysis Report
   Generated: 2025-10-04

   ## Summary
   - Total Issues: 6
   - Critical: 1
   - High: 2
   - Medium: 3
   - Coverage: 87% (13/15 requirements have tasks)

   ## Issues
   | ID | Severity | Type | Location | Description |
   |----|----------|------|----------|-------------|
   | A1 | CRITICAL | Constitution | plan.md:L45 | Violates Library-First: should use Zustand |
   | A2 | HIGH | Ambiguity | plan.md:L120 | "fast" lacks criteria → add "<500ms" |
   | A3 | HIGH | Coverage Gap | tasks.md | FR-010, FR-012 missing tasks |
   | A4 | MEDIUM | Duplication | spec.md:L80,L150 | FR-003 = FR-007 |
   | A5 | MEDIUM | Inconsistency | plan.md:L200 | Todo.priority missing in data model |
   | A6 | MEDIUM | Underspec | spec.md | Error handling undefined |

   ## Suggested Fixes
   1. [A1] Use Zustand for state management (replace custom store)
   2. [A2] Add measurable criteria: "UI response < 500ms (p95)"
   3. [A3] Add tasks: T4.7 (FR-010), T4.8 (FR-012)
   4. [A4] Merge FR-003 and FR-007 into single requirement
   5. [A5] Add priority field to Todo interface in plan.md
   6. [A6] Add error handling requirements (network, validation)
   ```

5. **询问用户是否修复**：
   ```
   LLM: 发现 6 个问题（1 个 CRITICAL, 2 个 HIGH）。是否修复？

   User: yes  ✅

   LLM: 正在应用修复...
        [更新 plan.md]
        [更新 spec.md]
        [更新 tasks.md]

   LLM: ✅ 已修复所有问题
        - Updated plan.md (使用 Zustand, 添加 priority 字段)
        - Updated spec.md (合并重复需求, 添加错误处理)
        - Updated tasks.md (添加 T4.7, T4.8)
   ```

**完成标志**：
- ✅ 生成分析报告
- ✅ 包含 6 类问题检测
- ✅ 提供修复建议
- ✅ （可选）应用修复

---

### 4.8 Stage 6: 执行实施（可选）

**目标**：按 TDD 流程执行任务

**执行**：
```
使用 implement prompt
Arguments: { tasksPath: "specs/001-daily-todo/tasks.md" }
```

**LLM 执行流程**：

1. **收到 Prompt 指令**：
   ```
   Given tasks: "specs/001-daily-todo/tasks.md"

   Do this:
   1. Read tasks.md
   2. For each task in order:
      a. Red: Write failing test
      b. Green: Implement minimum code to pass
      c. Refactor: Clean up while keeping tests green
      d. Commit: Clear message linking to task ID
   3. Track progress (update tasks.md checkboxes)
   ```

2. **读取任务列表**：
   ```bash
   LLM 调用: tasks-context tool { tasksPath: "specs/001-daily-todo/tasks.md" }

   返回: 28 个任务，按阶段分组
   ```

3. **TDD 实施示例（T3.1: Todo 数据模型）**：
   ```typescript
   // Red: 写失败测试
   // tests/models/Todo.test.ts
   describe('Todo', () => {
     it('should create todo with required fields', () => {
       const todo = createTodo({ title: 'Test' });
       expect(todo).toHaveProperty('id');
       expect(todo).toHaveProperty('createdAt');
     });
   });

   // 运行: npm test → ❌ FAIL (createTodo 未定义)

   // Green: 实现最小代码
   // src/models/Todo.ts
   export function createTodo(data: { title: string }) {
     return {
       id: crypto.randomUUID(),
       title: data.title,
       completed: false,
       createdAt: new Date(),
       updatedAt: new Date()
     };
   }

   // 运行: npm test → ✅ PASS

   // Refactor: 清理代码
   // (添加类型、优化结构)

   // Commit
   git add .
   git commit -m "feat(todo): implement Todo data model (T3.1)"
   ```

4. **进度跟踪**：
   ```bash
   # 每完成一个任务，更新 tasks.md
   - [x] **T3.1**: 实现 Todo 数据模型 ✅
   - [ ] **T3.2**: 实现 localStorage adapter
   ```

**完成标志**：
- ✅ 所有任务执行完成
- ✅ 测试全部通过
- ✅ 代码已提交
- ✅ tasks.md 已全部勾选

---

### 4.9 完整工作流总结

```
阶段 0: 初始化
  → init tool
  → .specify/ 结构创建完成 ✅

阶段 1: 创建规格
  → /specify "每日 todo 工具"
  → spec.md 生成（10k 字符, 15 需求）✅

阶段 2: 澄清需求（可选）
  → /clarify
  → 5 个问题，spec.md 更新 ✅

阶段 3: 生成计划
  → /plan
  → plan.md 生成（技术栈，数据模型，5 阶段）✅

阶段 4: 生成任务
  → /tasks
  → tasks.md 生成（28 任务，5 阶段分组）✅

阶段 5: 质量分析（可选）
  → /analyze
  → 分析报告 + 修复建议 ✅

阶段 6: 执行实施（可选）
  → /implement
  → TDD 实施，代码完成 ✅
```

**关键优势**：
- 🚀 **快速**：从需求到任务清单只需 5 分钟
- 🎯 **准确**：LLM 深度理解需求，生成高质量文档
- 🔄 **迭代**：可随时回到任何阶段重新生成
- ✅ **可验证**：每个阶段都有明确的验证标准

---

## 5. 内置审批机制

### 5.1 `/clarify` - 交互式问答审批

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

### 5.2 `/analyze` - 质量报告审批

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

## 6. 为什么 Pure MCP 更好？

### 6.1 对比：规则引擎 vs Pure MCP

| 维度 | 规则引擎（旧） | Pure MCP + LLM（新） |
|------|--------------|-------------------|
| **中文支持** | ❌ 差（正则失败） | ✅ 完美（LLM 内置） |
| **上下文理解** | ❌ 弱（只看关键词） | ✅ 强（深度推理） |
| **输出质量** | ❌ 低（18% 覆盖率） | ✅ 高（100% 覆盖率） |
| **可维护性** | ❌ 差（硬编码规则） | ✅ 好（只需更新 Prompt） |
| **扩展性** | ❌ 难（新增规则复杂） | ✅ 易（新增 Prompt 简单） |
| **代码量** | ❌ 多（4,418 行） | ✅ 少（~1,500 行） |

### 6.2 实际效果对比

**测试用例**：`"我们要开发一款基于 Web 的 AI 项目管理应用..."`

| 指标 | 规则引擎 | Pure MCP + LLM |
|------|---------|---------------|
| spec.md 字符数 | 1,923 | 10,695 |
| Requirements 数量 | 1 | 15 |
| Entities 数量 | 0 | 5 |
| Tasks 数量 | 12 | 52 |
| **覆盖率** | **18%** | **100%** |

### 6.3 架构优势

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

## 7. 核心设计原则

### 7.1 Prompts 设计原则

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

### 7.2 Tools 设计原则

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

### 7.3 审批流程设计原则

1. **对话优先**：所有交互在对话中完成
2. **实时反馈**：每个回答立即更新文件
3. **可追溯**：所有 Q&A 记录在 Clarifications section
4. **可中断**：用户可随时说"done"结束

---

## 8. 总结

### 8.1 核心思想

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

### 8.2 关键优势

1. **Pure MCP 架构**：不调用 LLM API，只提供 Prompts + Tools
2. **完美中文支持**：LLM 内置能力
3. **深度上下文理解**：LLM 推理能力
4. **内置审批机制**：交互式问答 + 质量报告
5. **无 Dashboard**：命令行优先，流畅体验

### 8.3 工作流程

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

## 9. 参考

- **完整转换方案**：[conversion-plan.md](./conversion-plan.md)
- **审批机制澄清**：[approval-clarification.md](./approval-clarification.md)
- **如何使用 LLM**：[how-to-use-llm.md](./how-to-use-llm.md)
- **spec-kit 原项目**：https://github.com/pimzino/spec-kit

---

**创建日期**：2025-10-03
**更新日期**：2025-10-06
**版本**：1.1.0
**状态**：完成

*spec-kit-mcp - Pure MCP + LLM Architecture*
