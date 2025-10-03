# spec-kit-mcp

> Spec-kit workflow tools as MCP server for Code3
> **Pure MCP + LLM Architecture** - Prompts guide LLM, Tools provide context

---

## Installation & Setup

### Quick Start (npx)

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "spec-kit": {
      "command": "npx",
      "args": ["-y", "@code3/spec-kit-mcp"]
    }
  }
}
```

### Local Development

```bash
# Clone and build
git clone https://github.com/cyl19970726/Code3-Workspace.git
cd Code3-Workspace/spec-mcp/spec-kit-mcp
npm install
npm run build

# Link locally
npm link

# Add to .mcp.json
{
  "mcpServers": {
    "spec-kit": {
      "command": "spec-kit-mcp"
    }
  }
}
```

---

## 概述

spec-kit-mcp 是将 [spec-kit](https://github.com/pimzino/spec-kit) 的 7 个 AI prompts 转换为 MCP (Model Context Protocol) 格式的 MCP Server。它采用 **Pure MCP + LLM** 架构：
- **7 个 MCP Prompts**：引导 LLM 生成高质量的 spec/plan/tasks 文档
- **3 个 MCP Tools**：为 LLM 提供文件操作和上下文读取能力
- **内置审批机制**：通过 `/clarify` 的交互式问答和 `/analyze` 的质量报告实现审批流程

## 架构

\`\`\`
spec-kit-mcp（Pure MCP，无 Dashboard）
├── src/
│   ├── prompts/           # 7 个 MCP Prompts（引导 LLM）
│   │   ├── specify.ts     # 创建 spec.md
│   │   ├── clarify.ts     # 交互式问答（内置审批）
│   │   ├── plan.ts        # 创建 plan.md
│   │   ├── tasks.ts       # 创建 tasks.md
│   │   ├── analyze.ts     # 质量报告（内置审批）
│   │   ├── implement.ts   # 执行任务
│   │   └── constitution.ts # 更新宪法
│   ├── tools/             # 3 个基础 Tools（文件操作）
│   │   ├── spec-context.ts   # 读取 spec.md
│   │   ├── plan-context.ts   # 读取 plan.md
│   │   └── tasks-context.ts  # 读取 tasks.md
│   ├── server.ts          # MCP Server
│   └── types.ts
└── templates/             # Markdown 模板
\`\`\`

## 特性

### ✅ Pure MCP + LLM 架构
- **不调用 LLM API**：MCP Server 只提供 Prompts 和 Tools
- **LLM 内置能力**：利用 LLM 的中文理解、上下文推理、生成能力
- **高质量输出**：基于 spec-kit 的完整 prompts，生成 8k-12k 字符的详细文档

### ✅ 内置审批机制
- **\`/clarify\`**：交互式问答（用户回答问题 = 批准内容）
  - 11 类模糊点扫描
  - 最多 5 个高优先级问题
  - 实时更新 spec.md
- **\`/analyze\`**：质量报告（用户审核报告 = 批准流程）
  - 6 类问题检测
  - Constitution 合规性检查
  - 建议修复方案

### ✅ 完整的 spec-kit 工作流
\`\`\`
/specify  → spec.md（生成）
   ↓
/clarify  → 交互式问答审批 ✅
   ↓
/plan     → plan.md + design docs
   ↓
/tasks    → tasks.md
   ↓
/analyze  → 质量报告审批 ✅
   ↓
/implement → 执行任务
\`\`\`

## 完成！

所有 Phase 2-5 已完成：
- ✅ Phase 2: 7 个 Prompts 转换完成
- ✅ Phase 3: 3 个基础 Tools 实现完成
- ✅ Phase 4: MCP Server 实现完成
- ✅ Phase 5: 编译成功 + README 创建完成

详细文档请查看 docs/ 目录。
