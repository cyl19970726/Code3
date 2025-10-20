# Code3 技术文档

> Code3 是一个多链多工作流的去中心化 Bounty 系统
>
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 📖 文档导航

### 核心文档（按阅读顺序）

#### 1. [数据模型](./01-data-model.md)
**定义**：Bounty 实体、状态机、TaskMetadata 结构

**适合**：
- 想了解 Bounty 的核心数据结构
- 想了解状态流转规则
- 想了解幂等性和冷静期机制

**关键内容**：
- Bounty 实体（11 个字段）
- BountyStatus 枚举（6 种状态）
- 状态机（Open → Accepted → Submitted → Confirmed → Claimed）
- TaskMetadata 结构（code3/v2 schema）
- 冷静期机制（7 天）
- 幂等性机制（taskHash）

---

#### 2. [接口定义](./02-interfaces.md)
**定义**：三层架构的接口定义与实现示例

**适合**：
- 开发者实现新链支持
- 开发者实现新 workflow 适配器
- 想了解依赖注入模式

**关键内容**：
- BountyOperator 接口（11 个方法）
- DataOperator 接口（5 个方法）
- Task3Operator 抽象类（5 个 flow）
- 实现示例（AptosBountyOperator, SpecKitDataOperator）
- 调用关系图

---

#### 3. [架构设计](./03-architecture.md)
**定义**：系统架构、模块划分、技术选型

**适合**：
- 架构师了解整体设计
- 新加入的开发者了解系统全貌
- 技术选型参考

**关键内容**：
- 系统架构总览
- 三层架构详解（orchestration, bountyOperator, dataOperator）
- 技术栈（TypeScript, Next.js, Aptos, Ethereum）
- 模块间通信（依赖注入、事件驱动）
- 安全架构
- 扩展性设计

---

#### 4. [数据流](./04-datastream.md)
**定义**：完整 Bounty 生命周期的数据流

**适合**：
- 想了解完整用户流程
- 调试数据流问题
- 理解幂等性和状态验证实现

**关键内容**：
- 5 个阶段数据流详解
  - Phase 1: Publish（幂等性检查）
  - Phase 2: Accept（状态验证）
  - Phase 3: Submit（上传提交内容）
  - Phase 4: Confirm（冷静期开始）
  - Phase 5: Claim（冷静期验证）
- 数据格式示例（JSON/TypeScript）
- 错误处理场景

---

#### 5. [包结构与目录组织](./05-packages-structure.md)
**定义**：代码组织、模块依赖、命名规范

**适合**：
- 开发者了解代码结构
- 新增模块时参考
- CI/CD 配置

**关键内容**：
- 总体目录结构
- spec-mcp/ 工作流层（3 个 workflow）
- task3/ 核心基础设施（7 个模块）
- 模块依赖关系图
- 包命名规范（@code3-team/）
- 导入导出规范
- 扩展性设计

---

#### 6. [快速开始](./06-quickstart.md)
**定义**：从零开始运行 Code3 的完整指南

**适合**：
- 新用户快速上手
- 部署到测试环境
- 完整用户流程体验

**关键内容**：
- 环境配置（Node.js, GitHub Token, 钱包）
- 部署合约（Aptos, Ethereum）
- 第一个 Bounty 完整流程
  1. 发布 Bounty
  2. 接单
  3. 实施
  4. 提交
  5. 确认
  6. 领取
- 使用 Dashboard
- 常见问题（幂等性、状态验证、冷静期、Gas）

---

#### 7. [UI/UX 设计](./07-ui-ux.md)
**定义**：Dashboard 的用户界面和交互设计

**适合**：
- 前端开发者实现 UI
- 设计师了解设计规范
- 产品经理了解用户体验

**关键内容**：
- 设计原则（简洁、状态透明、多链无感）
- 页面结构（列表页、详情页、发布页、仪表板）
- 状态流转 UI（6 种状态的不同展示）
- 钱包连接（Petra, MetaMask）
- 响应式设计
- 可访问性（A11y）

---

### 扩展文档

#### 99. [术语表](./99-glossary.md)
**定义**：所有术语和概念的完整定义

**适合**：
- 快速查找术语定义
- 理解专业术语

**内容**：
- A-Z 字母顺序排列
- 60+ 术语定义
- 交叉引用到相关文档

---

## 🎯 快速查找

### 按角色

| 角色 | 推荐阅读顺序 |
|------|-------------|
| **新用户** | 06-quickstart.md → 01-data-model.md → 07-ui-ux.md |
| **Requester** | 06-quickstart.md Section 4.2 → 07-ui-ux.md Section 5 |
| **Worker** | 06-quickstart.md Section 4.3-4.7 → 01-data-model.md Section 2 |
| **前端开发者** | 07-ui-ux.md → 05-packages-structure.md Section 3.6 → 02-interfaces.md |
| **后端开发者** | 02-interfaces.md → 04-datastream.md → 05-packages-structure.md Section 3.7 |
| **合约开发者** | 01-data-model.md Section 2 → 02-interfaces.md Section 2 → 05-packages-structure.md Section 3.1 |
| **架构师** | 03-architecture.md → 02-interfaces.md → 04-datastream.md |
| **产品经理** | 01-data-model.md → 06-quickstart.md → 07-ui-ux.md |

---

### 按任务

| 任务 | 相关文档 |
|------|---------|
| **实现新链支持** | 02-interfaces.md Section 2 → 05-packages-structure.md Section 9.1 → 03-architecture.md Section 7.1 |
| **实现新 workflow** | 02-interfaces.md Section 3 → 05-packages-structure.md Section 9.3 → 03-architecture.md Section 7.3 |
| **实现新数据层** | 02-interfaces.md Section 3 → 05-packages-structure.md Section 3.5 → 03-architecture.md Section 7.2 |
| **调试状态验证问题** | 04-datastream.md Section 2 → 01-data-model.md Section 2.3 |
| **调试幂等性问题** | 04-datastream.md Section 2.1 → 01-data-model.md Section 8 |
| **调试冷静期问题** | 04-datastream.md Section 2.5 → 01-data-model.md Section 7 |
| **部署到测试网** | 06-quickstart.md Section 3 |
| **部署到主网** | 06-quickstart.md Section 3 → 03-architecture.md Section 8.3 |

---

### 按概念

| 概念 | 相关文档 | 章节 |
|------|---------|------|
| **Bounty 实体** | 01-data-model.md | Section 2.1 |
| **状态机** | 01-data-model.md | Section 2.3 |
| **幂等性** | 01-data-model.md | Section 8 |
| **冷静期** | 01-data-model.md | Section 7 |
| **BountyOperator** | 02-interfaces.md | Section 2 |
| **DataOperator** | 02-interfaces.md | Section 3 |
| **Orchestration** | 02-interfaces.md | Section 4 |
| **依赖注入** | 03-architecture.md | Section 4.1 |
| **三层架构** | 03-architecture.md | Section 2 |
| **数据流** | 04-datastream.md | Section 2 |
| **包命名** | 05-packages-structure.md | Section 5.2 |
| **模块依赖** | 05-packages-structure.md | Section 4 |

---

## 🔧 常见任务

### 配置开发环境
```bash
# 1. 克隆仓库
git clone https://github.com/code3-team/code3.git
cd code3

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 GitHub Token、私钥等

# 4. 构建所有包
npm run build
```

**详细步骤**：[06-quickstart.md Section 2](./06-quickstart.md#2-环境配置)

---

### 部署合约

**Aptos**：
```bash
cd Code3/task3/bounty-operator/aptos/contract
aptos move compile
aptos move publish --named-addresses bounty_addr=<YOUR_ADDRESS>
```

**Ethereum**：
```bash
cd Code3/task3/bounty-operator/ethereum/contract
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

**详细步骤**：[06-quickstart.md Section 3](./06-quickstart.md#3-部署合约仅首次)

---

### 运行测试

**运行所有测试**：
```bash
npm test
```

**运行特定包的测试**：
```bash
cd Code3/task3/orchestration
npm test
```

**E2E 测试**：
```bash
cd Code3/task3/adapters/spec-kit-adapter
npm run test:e2e
```

**详细步骤**：[06-quickstart.md Section 9](./06-quickstart.md#9-测试)

---

### 启动 Dashboard

```bash
cd Code3/task3/frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

**详细步骤**：[06-quickstart.md Section 7.1](./06-quickstart.md#71-启动-dashboard)

---

## 📚 文档约定

### 术语使用

- **Bounty**：链上 Bounty 实体
- **Task**：任务数据（存储在 GitHub Issue/IPFS）
- **Requester/User**：发布 Bounty 的用户
- **Worker**：接受并完成 Bounty 的用户
- **Flow**：Orchestration 层的完整业务流程
- **Operator**：实现特定接口的类（BountyOperator, DataOperator）

**完整术语表**：[99-glossary.md](./99-glossary.md)

---

### 代码示例

**TypeScript 代码块**：
```typescript
export interface BountyOperator {
  createBounty(params: CreateBountyParams): Promise<CreateBountyResult>;
}
```

**Bash 命令**：
```bash
npm install
npm run build
```

**JSON 配置**：
```json
{
  "name": "@code3-team/orchestration",
  "version": "1.0.0"
}
```

---

### 引用规范

**文档引用**：
- 同目录：`[01-data-model.md](./01-data-model.md)`
- 特定章节：`[01-data-model.md Section 2.1](./01-data-model.md#21-bounty-实体)`

**代码引用**：
- 文件路径：`Code3/task3/orchestration/src/publish-flow.ts`
- 行号：`Code3/task3/orchestration/src/publish-flow.ts:42`

---

## 🤝 贡献

### 文档贡献

欢迎提交 PR 改进文档！

**文档规范**：
- 标题：`# XX — 标题`（XX 为编号）
- 结构：使用二级标题（##）分节
- 代码：使用代码块，注明语言
- 引用：使用相对路径引用其他文档
- 术语：首次出现时链接到 [99-glossary.md](./99-glossary.md)

**详细规范**：[../../CLAUDE.md Section 5](../../CLAUDE.md#5-文档规范)

---

### 代码贡献

**提交 Issue**：
- Bug 报告：https://github.com/code3-team/code3/issues/new?template=bug_report.md
- 功能请求：https://github.com/code3-team/code3/issues/new?template=feature_request.md

**提交 PR**：
1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 编写代码 + 测试
4. 提交 PR：参考 [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## 🔗 外部链接

### 官方资源
- **GitHub**：https://github.com/code3-team/code3
- **Discord**：https://discord.gg/code3
- **Twitter**：https://twitter.com/code3team
- **官网**：https://code3.dev

### 技术文档
- **Aptos**：https://aptos.dev/
- **Ethereum**：https://ethereum.org/developers
- **MCP**：https://modelcontextprotocol.io/
- **Next.js**：https://nextjs.org/docs
- **TypeScript**：https://www.typescriptlang.org/docs

---

## ❓ 常见问题

### Q1: Code3 支持哪些区块链？
**A**: 目前支持 Aptos 和 Ethereum，未来计划支持 Sui、Solana 等。

**参考**：[03-architecture.md Section 3.2](./03-architecture.md#32-区块链技术)

---

### Q2: 如何实现新链支持？
**A**: 实现 `BountyOperator` 接口（11 个方法），部署合约，adapter 中切换实例。

**参考**：[02-interfaces.md Section 2](./02-interfaces.md#2-bountyoperator-接口), [05-packages-structure.md Section 9.1](./05-packages-structure.md#91-新增链)

---

### Q3: 为什么需要冷静期？
**A**: 防止 Requester 确认后立即撤回，给双方反悔的时间，增加系统安全性。

**参考**：[01-data-model.md Section 7](./01-data-model.md#7-冷静期机制)

---

### Q4: 如何避免重复创建 Bounty？
**A**: 使用幂等性机制，通过 `taskHash = SHA256(taskData)` 检查是否已存在。

**参考**：[01-data-model.md Section 8](./01-data-model.md#8-幂等性机制), [04-datastream.md Section 2.1](./04-datastream.md#21-phase-1-publish-发布-bounty)

---

### Q5: Worker 能否在冷静期未结束时领取赏金？
**A**: 不能。`claimFlow` 会验证 `coolingUntil` 时间戳，未结束时抛出错误。

**参考**：[04-datastream.md Section 2.5](./04-datastream.md#25-phase-5-claim-领取赏金), [06-quickstart.md Section 8.3](./06-quickstart.md#83-冷静期验证)

---

## 📝 更新日志

### 2025-10-02
- 创建完整技术文档（01-07, 99, README）
- 定义三层架构接口（BountyOperator, DataOperator, Task3Operator）
- 完善数据模型（Bounty, BountyStatus, TaskMetadata）
- 补充快速开始指南
- 添加 UI/UX 设计规范

---

## 📄 许可证

MIT License

---

**祝你使用愉快！** 🎉

如有问题，请访问 [GitHub Issues](https://github.com/code3-team/code3/issues) 或加入 [Discord 社区](https://discord.gg/code3)。
