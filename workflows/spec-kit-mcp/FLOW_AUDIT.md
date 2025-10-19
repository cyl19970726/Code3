# spec-kit-mcp 完整流程审查

## 用户实际使用流程

```
用户项目（使用 spec-kit-mcp）
│
├─ 1. 初始化（一次性）
│   └─ 调用 init Tool
│       ├─ 创建 .specify/ 目录
│       ├─ 复制脚本（create-new-feature.sh, setup-plan.sh, check-prerequisites.sh, common.sh）
│       ├─ 复制模板（spec-template.md, plan-template.md, tasks-template.md）
│       └─ 创建 constitution.md
│
├─ 2. 创建新功能（每个 feature）
│   └─ 调用 /specify Prompt
│       ├─ LLM 读取 Prompt 指令
│       ├─ LLM 执行：`.specify/scripts/bash/create-new-feature.sh --json "user-auth"`
│       │   └─ 输出：{"BRANCH_NAME":"001-user-auth","SPEC_FILE":"specs/001-user-auth/spec.md","FEATURE_NUM":"001"}
│       ├─ LLM 创建 git branch: 001-user-auth
│       ├─ LLM 创建目录：specs/001-user-auth/
│       ├─ LLM 复制模板：.specify/templates/spec-template.md → specs/001-user-auth/spec.md
│       └─ LLM 根据用户需求填充 spec.md 内容
│
├─ 3. 澄清需求（可选）
│   └─ 调用 /clarify Prompt
│       ├─ LLM 执行：`.specify/scripts/bash/check-prerequisites.sh --json --paths-only`
│       │   ⚠️ 问题：脚本不支持 --paths-only，会忽略此参数
│       ├─ LLM 读取 spec.md
│       ├─ LLM 分析模糊点
│       ├─ LLM 与用户交互式提问（最多 5 个问题）
│       └─ LLM 更新 spec.md（添加 Clarifications 章节）
│
├─ 4. 创建实施计划
│   └─ 调用 /plan Prompt
│       ├─ LLM 执行：`.specify/scripts/bash/setup-plan.sh --json`
│       │   └─ 输出：{"FEATURE_SPEC":"...","IMPL_PLAN":"...","SPECS_DIR":"...","BRANCH":"..."}
│       ├─ LLM 读取 spec.md
│       ├─ LLM 读取 .specify/memory/constitution.md
│       ├─ LLM 读取 .specify/templates/plan-template.md
│       ├─ LLM 创建 specs/001-user-auth/plan.md
│       └─ LLM 填充：技术栈、架构、阶段、文件结构
│
├─ 5. 生成任务列表
│   └─ 调用 /tasks Prompt
│       ├─ LLM 执行：`.specify/scripts/bash/check-prerequisites.sh --json`
│       │   └─ 输出：{"FEATURE_DIR":"...","AVAILABLE_DOCS":["research.md",...]}
│       ├─ LLM 读取 plan.md
│       ├─ LLM 读取 .specify/templates/tasks-template.md
│       ├─ LLM 创建 specs/001-user-auth/tasks.md
│       └─ LLM 填充：任务 ID、描述、阶段、依赖关系
│
├─ 6. 质量分析（可选）
│   └─ 调用 /analyze Prompt
│       ├─ LLM 执行：`.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
│       │   ⚠️ 问题：脚本不支持这些参数
│       ├─ LLM 读取 spec.md, plan.md, tasks.md
│       ├─ LLM 读取 constitution.md
│       ├─ LLM 分析一致性、覆盖率、冲突
│       └─ LLM 生成报告（不修改文件）
│
└─ 7. 执行实施
    └─ 调用 /implement Prompt
        ├─ LLM 执行：`.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
        │   ⚠️ 问题：脚本不支持这些参数
        ├─ LLM 读取 tasks.md
        ├─ LLM 逐阶段执行任务（Setup → Tests → Core → Integration → Polish）
        ├─ LLM 创建代码文件
        ├─ LLM 标记完成的任务（tasks.md 中的 [X]）
        └─ LLM 运行测试验证
```

## 关键依赖验证

### init Tool 依赖（✅ 已满足）
```
spec-kit-mcp/
├── scripts/
│   ├── create-new-feature.sh      ✅
│   ├── setup-plan.sh              ✅
│   ├── check-prerequisites.sh     ✅ (但功能不完整)
│   └── common.sh                  ✅
├── templates/
│   ├── spec.md                    ✅
│   ├── plan.md                    ✅
│   └── tasks.md                   ✅
└── memory/
    └── constitution.md            ✅
```

### Prompts 运行时依赖（⚠️ 部分缺失）

| Prompt | 依赖脚本 | 需要参数 | 状态 |
|--------|---------|---------|------|
| specify | create-new-feature.sh | --json | ✅ 支持 |
| plan | setup-plan.sh | --json | ✅ 支持 |
| tasks | check-prerequisites.sh | --json | ✅ 支持 |
| clarify | check-prerequisites.sh | --json --paths-only | ❌ 不支持 |
| analyze | check-prerequisites.sh | --json --require-tasks --include-tasks | ❌ 不支持 |
| implement | check-prerequisites.sh | --json --require-tasks --include-tasks | ❌ 不支持 |
| constitution | 无脚本依赖 | - | ✅ |

## 发现的缺陷

### 1. check-prerequisites.sh 参数不完整
**缺少参数**：
- `--paths-only`：只返回路径，不检查文件存在性
- `--require-tasks`：强制要求 tasks.md 存在，否则报错
- `--include-tasks`：在 JSON 输出中包含 TASKS 路径

**影响**：
- clarify/analyze/implement 会执行失败或得到错误的 JSON 输出
- LLM 可能无法正确解析路径

### 2. 缺少集成测试
**当前测试**：
- ✅ 单元测试（结构验证）
- ❌ 集成测试（实际执行）
- ❌ E2E 测试（完整工作流）

**问题**：
- 无法验证脚本是否正常工作
- 无法验证 Prompts 指令是否正确
- 无法验证生成的文件是否有效

### 3. init Tool 路径查找可能失败
**当前策略**：
```typescript
// Strategy 1: dist/../../scripts/
// Strategy 2: node_modules/@code3/spec-kit-mcp/scripts/
```

**问题**：
- 如果用户用 pnpm/yarn 安装，路径可能不同
- 如果是 monorepo，路径查找可能失败

## 建议修复优先级

### 🔴 P0（必须修复）
1. **增强 check-prerequisites.sh 支持所有参数**
   - 添加 `--paths-only`, `--require-tasks`, `--include-tasks`
   - 测试所有参数组合

2. **编写集成测试**
   - 测试 init Tool 实际运行
   - 测试脚本在真实环境中执行
   - 验证生成的文件内容

### 🟡 P1（强烈建议）
3. **编写 E2E 测试**
   - 模拟完整用户工作流
   - 验证所有 Prompts 指令正确性

4. **改进 init Tool 路径查找**
   - 添加更多查找策略
   - 更好的错误提示

### 🟢 P2（可选）
5. **添加 Prompt 参数验证**
   - 验证必需参数存在
   - 提供更好的错误消息

## 下一步行动

1. 修复 check-prerequisites.sh（立即）
2. 测试所有脚本（立即）
3. 编写集成测试（今天）
4. 更新 E2E.md 文档（今天）
