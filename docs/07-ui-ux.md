# 07 — Dashboard UI/UX 设计

> 本文定义 Code3 Dashboard 的用户界面、交互流程与视觉规范。
> 参考：[TRUTH.md](../../TRUTH.md) ADR-007/009（MVP 只读展示，M4 增加钱包连接，三大 MCP 架构）

---

## 1. 设计原则

### 1.1 核心理念

- **链上为权威**：所有状态以链上合约为准，Dashboard 仅展示
- **零密钥存储**：Dashboard 不保存任何私钥或敏感信息
- **渐进式增强**：MVP 只读展示 → M4 增加钱包连接触发链上操作
- **响应式优先**：移动端、桌面端自适应

### 1.2 目标用户

| 角色 | 主要场景 | 核心需求 |
|------|---------|---------|
| **Requester** | 发布任务、跟踪进度 | 查看任务状态、接单者信息、冷静期倒计时 |
| **Worker** | 浏览任务、接单 | 筛选高价值任务、查看 Spec 详情、领取赏金 |
| **Reviewer** | 审核 PR | 查看 PR 链接、验收依据 |
| **旁观者** | 探索市场 | 浏览所有任务、统计数据 |

---

## 2. 页面结构

### 2.1 页面层级

```
/                          # 首页（任务列表）
├── /bounty/:id            # 赏金详情页
├── /stats                 # 统计数据页（M4）
└── /about                 # 关于页面（项目介绍）
```

### 2.2 全局布局

**文件路径**: [Code3/task3/frontend/app/layout.tsx](../../task3/frontend/app/layout.tsx)

```
┌──────────────────────────────────────────────────┐
│ Header                                           │
│ ┌──────────┐  ┌──────────────┐  ┌─────────────┐ │
│ │ Logo     │  │ Tasks / Stats│  │ [M4] Wallet │ │
│ └──────────┘  └──────────────┘  └─────────────┘ │
├──────────────────────────────────────────────────┤
│                                                  │
│                 Main Content                     │
│                                                  │
├──────────────────────────────────────────────────┤
│ Footer                                           │
│ GitHub | Docs | Aptos Testnet                    │
└──────────────────────────────────────────────────┘
```

**Header 组件**:
- Logo: "Code3" 文字 + 图标
- 导航: Tasks / Stats（M4）
- 钱包连接按钮（M4，参考 [Aptos Wallet Adapter](https://github.com/aptos-labs/aptos-wallet-adapter)）

---

## 3. 首页（任务列表）

### 3.1 页面布局

**文件路径**: [Code3/task3/frontend/app/page.tsx](../../task3/frontend/app/page.tsx)

```
┌────────────────────────────────────────────────┐
│ Filters & Search                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│ │ Status  │ │ Amount  │ │ Network │ │ Search│ │
│ └─────────┘ └─────────┘ └─────────┘ └───────┘ │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ BountyCard #1                            │  │
│ │  Title: Implement user authentication    │  │
│ │  Amount: 10 USDT  Status: Open           │  │
│ │  Repo: owner/repo#123                    │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ BountyCard #2                            │  │
│ │  ...                                     │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌────────────────────────────┐                │
│ │ Load More...               │                │
│ └────────────────────────────┘                │
└────────────────────────────────────────────────┘
```

### 3.2 筛选器（Filters）

**组件路径**: [Code3/task3/frontend/components/Filters.tsx](../../task3/frontend/components/Filters.tsx)

| 筛选项 | 选项 | 默认值 |
|--------|------|--------|
| **Status** | All / Open / Started / PRSubmitted / CoolingDown / Paid / Cancelled | All |
| **Amount** | 滑块（0 - 1000 USDT） | 全范围 |
| **Network** | Testnet / Mainnet | Testnet |
| **Search** | 文本框（搜索 repo/title） | - |

### 3.3 BountyCard 组件

**文件路径**: [Code3/task3/frontend/components/BountyCard.tsx](../../task3/frontend/components/BountyCard.tsx)

```
┌────────────────────────────────────────────┐
│ #42  [Open]                      10 USDT  │
│                                            │
│ Implement user authentication system      │
│                                            │
│ 📍 owner/repo#123                          │
│ 👤 Sponsor: 0x1234...5678                  │
│ 🕒 Created: 2025-01-15 10:30               │
│                                            │
│ ┌──────────────┐                          │
│ │ View Details │                          │
│ └──────────────┘                          │
└────────────────────────────────────────────┘
```

**数据字段**:
```typescript
interface BountyCardProps {
  bounty_id: string;
  status: BountyStatus;
  title: string;                 // 从 GitHub Issue 读取
  amount: string;                // "10 USDT"
  repo_url: string;
  issue_number: number;
  sponsor: string;               // 短格式地址
  created_at: number;            // Unix timestamp
}
```

**状态徽标颜色**:
| 状态 | 颜色 | 图标 |
|------|------|------|
| Open | 绿色 | 🟢 |
| Started | 蓝色 | 🔵 |
| PRSubmitted | 紫色 | 🟣 |
| CoolingDown | 橙色 | 🟠 |
| Paid | 灰色 | ⚫ |
| Cancelled | 红色 | 🔴 |

---

## 4. 赏金详情页

### 4.1 页面布局

**文件路径**: [Code3/task3/frontend/app/bounty/[id]/page.tsx](../../task3/frontend/app/bounty/[id]/page.tsx)

```
┌────────────────────────────────────────────┐
│ Bounty #42                       [Open]   │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Basic Info                             │ │
│ │  Title: Implement user authentication  │ │
│ │  Amount: 10 USDT                       │ │
│ │  Repo: owner/repo#123                  │ │
│ │  Sponsor: 0x1234...5678                │ │
│ │  Created: 2025-01-15 10:30             │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ GitHub Links                           │ │
│ │  📄 Spec: specs/003-auth/spec.md       │ │
│ │  🔗 Issue: github.com/owner/repo#123   │ │
│ │  🔀 PR: github.com/owner/repo/pull/456 │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Worker Info (if started)               │ │
│ │  Winner: 0xabcd...ef01                 │ │
│ │  PR Submitted: 2025-01-16 14:20        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Cooling Period (if applicable)         │ │
│ │  Merged At: 2025-01-17 09:00           │ │
│ │  Cooling Until: 2025-01-24 09:00       │ │
│ │  ⏳ Time Remaining: 3 days 5 hours     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Actions (M4 with Wallet)               │ │
│ │  [Accept Task] [Claim Payout]          │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Timeline (Events)                      │ │
│ │  🟢 Created      2025-01-15 10:30      │ │
│ │  🔵 Accepted     2025-01-15 11:00      │ │
│ │  🟣 PR Submitted 2025-01-16 14:20      │ │
│ │  🟠 Merged       2025-01-17 09:00      │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 4.2 详情组件

#### 4.2.1 Basic Info

**组件路径**: [Code3/task3/frontend/components/BountyDetail.tsx](../../task3/frontend/components/BountyDetail.tsx)

**字段**:
- `bounty_id`: 链上赏金 ID
- `title`: GitHub Issue 标题
- `amount`: 赏金金额 + 资产类型（"10 USDT"）
- `repo_url`: GitHub 仓库 URL
- `issue_number`: Issue 编号
- `sponsor`: Sponsor 地址（短格式，点击展开完整地址）
- `created_at`: 创建时间（本地时区格式化）

#### 4.2.2 GitHub Links

**链接列表**:
1. **Spec**: 链接到 `specs/NNN/spec.md`（在仓库中）
2. **Issue**: 链接到 GitHub Issue
3. **PR**: 链接到 GitHub PR（若已提交）

#### 4.2.3 Worker Info

**显示条件**: `status >= Started`

**字段**:
- `winner`: Worker 地址
- `pr_url`: PR URL（若已提交）
- `pr_submitted_at`: PR 提交时间

#### 4.2.4 Cooling Period

**显示条件**: `status == CoolingDown`

**组件路径**: [Code3/task3/frontend/components/CoolingCountdown.tsx](../../task3/frontend/components/CoolingCountdown.tsx)

**字段**:
- `merged_at`: PR 合并时间
- `cooling_until`: 冷静期结束时间
- **倒计时**（实时更新）：
  ```typescript
  const timeRemaining = cooling_until - Date.now();
  const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  // 显示: "3 days 5 hours remaining"
  ```

#### 4.2.5 Actions（M4 钱包交互）

**显示条件**: 钱包已连接

**按钮**:
| 按钮 | 显示条件 | 权限 | 调用工具 |
|------|---------|------|---------|
| **Accept Task** | `status == Open` | 任意地址 | `aptos-chain-mcp.accept_bounty` |
| **Claim Payout** | `status == CoolingDown && cooling_until <= now` | `signer == winner` | `aptos-chain-mcp.claim_payout` |
| **Cancel Bounty** | `status == Open \|\| Started` | `signer == sponsor` | `aptos-chain-mcp.cancel_bounty` |

**交互流程**（以 Accept Task 为例）:
1. 用户点击 "Accept Task"
2. 前端调用 Wallet Adapter 请求签名
3. 钱包弹窗确认
4. 签名成功后，前端调用 `aptos-chain-mcp.accept_bounty({ bounty_id: "0x..." })`
5. 交易提交，显示 Loading 状态
6. 交易确认后，刷新页面状态

#### 4.2.6 Timeline（事件时间线）

**数据来源**: 链上事件（从 Backend API 读取）

**事件列表**:
| 事件 | 图标 | 显示字段 |
|------|------|---------|
| BountyCreated | 🟢 | Created at {timestamp} |
| BountyAccepted | 🔵 | Accepted by {winner} at {timestamp} |
| PRSubmitted | 🟣 | PR submitted at {timestamp} |
| BountyMerged | 🟠 | Merged at {timestamp}, cooling until {cooling_until} |
| BountyPaid | ⚫ | Paid {amount} to {winner} at {timestamp} |
| BountyCancelled | 🔴 | Cancelled at {timestamp} |

---

## 5. 统计页面（M4）

### 5.1 页面布局

**文件路径**: [Code3/task3/frontend/app/stats/page.tsx](../../task3/frontend/app/stats/page.tsx)

```
┌────────────────────────────────────────────┐
│ Statistics                                 │
├────────────────────────────────────────────┤
│                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ Total    │ │ Total    │ │ Total    │    │
│ │ Bounties │ │ Paid Out │ │ Workers  │    │
│ │   142    │ │  $1,420  │ │    56    │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Status Distribution (Pie Chart)        │ │
│ │  Open: 30%                             │ │
│ │  Started: 20%                          │ │
│ │  Paid: 40%                             │ │
│ │  Cancelled: 10%                        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Top Workers (Leaderboard)              │ │
│ │  1. 0xabcd...ef01 - 15 bounties        │ │
│ │  2. 0x1234...5678 - 12 bounties        │ │
│ │  3. 0x9876...5432 - 10 bounties        │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 5.2 统计指标

**数据来源**: 链上事件聚合（Backend API）

| 指标 | 计算逻辑 | API 端点 |
|------|---------|---------|
| Total Bounties | COUNT(BountyCreated) | `/api/stats/total_bounties` |
| Total Paid Out | SUM(amount WHERE status=Paid) | `/api/stats/total_paid` |
| Total Workers | COUNT(DISTINCT winner) | `/api/stats/total_workers` |
| Status Distribution | GROUP BY status | `/api/stats/status_distribution` |
| Top Workers | GROUP BY winner ORDER BY count DESC LIMIT 10 | `/api/stats/top_workers` |

---

## 6. 组件库

### 6.1 StatusBadge（状态徽标）

**文件路径**: [Code3/task3/frontend/components/StatusBadge.tsx](../../task3/frontend/components/StatusBadge.tsx)

```typescript
interface StatusBadgeProps {
  status: BountyStatus;
  size?: "sm" | "md" | "lg";
}

// 使用示例
<StatusBadge status="Open" size="md" />
// 输出: 🟢 Open
```

**样式规范**:
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status-badge.open { background: #22c55e; color: white; }
.status-badge.started { background: #3b82f6; color: white; }
.status-badge.cooling-down { background: #f59e0b; color: white; }
.status-badge.paid { background: #6b7280; color: white; }
.status-badge.cancelled { background: #ef4444; color: white; }
```

### 6.2 AddressDisplay（地址展示）

**文件路径**: [Code3/task3/frontend/components/AddressDisplay.tsx](../../task3/frontend/components/AddressDisplay.tsx)

```typescript
interface AddressDisplayProps {
  address: string;               // 完整地址 (0x...)
  truncate?: boolean;            // 默认 true
  copyable?: boolean;            // 默认 true
  explorerLink?: boolean;        // 默认 true
}

// 使用示例
<AddressDisplay
  address="0x1234567890abcdef1234567890abcdef"
  truncate={true}
  copyable={true}
  explorerLink={true}
/>
// 输出: 0x1234...cdef [Copy] [Explorer]
```

**截断逻辑**:
```typescript
const truncateAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
```

### 6.3 WalletConnect（钱包连接按钮，M4）

**文件路径**: [Code3/task3/frontend/components/WalletConnect.tsx](../../task3/frontend/components/WalletConnect.tsx)

**依赖**: `@aptos-labs/wallet-adapter-react`

```typescript
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function WalletConnect() {
  const { connected, account, connect, disconnect } = useWallet();

  if (connected) {
    return (
      <button onClick={disconnect}>
        {truncateAddress(account!.address)} [Disconnect]
      </button>
    );
  }

  return <button onClick={connect}>Connect Wallet</button>;
}
```

---

## 7. 响应式设计

### 7.1 断点

| 断点 | 宽度 | 目标设备 |
|------|------|---------|
| xs | < 640px | 手机（竖屏） |
| sm | 640px - 768px | 手机（横屏）/ 小平板 |
| md | 768px - 1024px | 平板 |
| lg | 1024px - 1280px | 笔记本 |
| xl | >= 1280px | 桌面 |

### 7.2 布局调整

**任务列表页**:
- xs/sm: 单列，BountyCard 全宽
- md: 双列
- lg/xl: 三列

**赏金详情页**:
- xs/sm: 单列，所有卡片堆叠
- md/lg/xl: 左侧主要信息（70%），右侧操作栏（30%）

---

## 8. 视觉规范

### 8.1 颜色

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色 | `#3b82f6` | 蓝色（链接、按钮） |
| 成功 | `#22c55e` | 绿色（Open 状态） |
| 警告 | `#f59e0b` | 橙色（CoolingDown） |
| 错误 | `#ef4444` | 红色（Cancelled） |
| 中性 | `#6b7280` | 灰色（Paid、禁用） |
| 背景 | `#f9fafb` | 浅灰（页面背景） |
| 卡片 | `#ffffff` | 白色（卡片背景） |

### 8.2 字体

| 类型 | 字体族 | 大小 |
|------|--------|------|
| 标题 | Inter, sans-serif | 24px - 32px |
| 正文 | Inter, sans-serif | 14px - 16px |
| 小字 | Inter, sans-serif | 12px |
| 代码 | JetBrains Mono, monospace | 14px |

### 8.3 间距

- 卡片边距: `16px`
- 元素间距: `8px` / `16px` / `24px`
- 页面边距: `24px` (移动端) / `48px` (桌面端)

---

## 9. 性能优化

### 9.1 数据加载

- **分页加载**: 每页 20 条任务，点击 "Load More" 加载下一页
- **虚拟滚动**: 超过 100 条任务时使用虚拟滚动（`react-window`）
- **缓存策略**: 使用 SWR 缓存链上数据，5 秒自动刷新

### 9.2 图片优化

- 使用 Next.js Image 组件（自动优化）
- 懒加载：页面可见时才加载图片

### 9.3 代码分割

- 按路由分割（Next.js App Router 自动）
- 钱包组件按需加载（dynamic import）

---

## 10. 参考

- 数据模型：[05-data-model.md](./05-data-model.md)
- 系统架构：[02-architecture.md](./02-architecture.md)
- 安全策略（零密钥存储）：[09-security.md](./09-security.md)
- Aptos Wallet Adapter 文档：https://github.com/aptos-labs/aptos-wallet-adapter
- TRUTH.md ADR-007：[../../TRUTH.md](../../TRUTH.md)
