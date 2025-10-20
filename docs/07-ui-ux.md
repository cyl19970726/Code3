# 07 — UI/UX 设计

> 本文定义 Code3 Dashboard 的用户界面和交互设计
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 设计原则

### 1.1 核心原则

**简洁优先**：
- 减少认知负担
- 突出核心操作
- 隐藏次要信息

**状态透明**：
- 清晰展示 Bounty 状态
- 实时反馈交易进度
- 明确下一步操作

**多链无感**：
- 统一的交互体验
- 自动切换链
- 钱包无缝连接

**移动友好**：
- 响应式布局
- 触摸优化
- 离线可用（渐进式 Web 应用）

### 1.2 设计系统

**配色方案**：
- 主色：`#3B82F6`（蓝色）— 品牌色、主要按钮
- 成功：`#10B981`（绿色）— 成功状态、确认操作
- 警告：`#F59E0B`（橙色）— 警告提示、冷静期倒计时
- 错误：`#EF4444`（红色）— 错误状态、失败提示
- 中性：`#6B7280`（灰色）— 次要文本、边框

**字体**：
- 标题：Inter（无衬线字体，清晰）
- 正文：Inter（保持一致性）
- 代码：JetBrains Mono（等宽字体）

**间距系统**：
- 基准：8px
- 小间距：8px, 12px
- 中间距：16px, 24px
- 大间距：32px, 48px

---

## 2. 页面结构

### 2.1 全局导航

**顶部导航栏**：
```
┌─────────────────────────────────────────────────────────┐
│ Code3 Logo    Bounties   Publish   Dashboard   [Wallet] │
└─────────────────────────────────────────────────────────┘
```

**组成部分**：
- Logo（左上角）：点击返回首页
- 主导航（中间）：
  - Bounties — Bounty 列表页
  - Publish — 发布 Bounty 页
  - Dashboard — 用户仪表板（我的 Bounty）
- 钱包按钮（右上角）：
  - 未连接：显示"Connect Wallet"
  - 已连接：显示地址缩写（如 `0xAbC...D123`）+ 链图标

**响应式**：
- 桌面：横向导航栏
- 移动：汉堡菜单（≡）

---

### 2.2 页面布局

**标准布局**：
```
┌─────────────────────────────────────────────────────────┐
│                    Top Navigation Bar                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    Page Content                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**容器宽度**：
- 最大宽度：1280px
- 居中对齐
- 左右边距：24px（移动）/ 48px（桌面）

---

## 3. Bounty 列表页（`/`）

### 3.1 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  Bounties                                    [Connect]  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ Filter & Sort                                   │   │
│  │ [All] [Open] [Accepted] [Submitted]             │   │
│  │ Chain: [All] [Aptos] [Ethereum]                 │   │
│  │ Sort: [Latest] [Amount ↓] [Amount ↑]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⭐ Bounty #123                        100 APT    │   │
│  │ Implement user authentication                    │   │
│  │ Status: Open    Chain: Aptos    2 hours ago     │   │
│  │ [View Details]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔒 Bounty #124                         50 USDT   │   │
│  │ Create dashboard component                       │   │
│  │ Status: Accepted   Chain: Ethereum   1 day ago  │   │
│  │ [View Details]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Load More...]                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Bounty 卡片组件

**BountyCard 组件**：
```typescript
interface BountyCardProps {
  bounty: {
    bountyId: string;
    taskId: string;
    amount: string;
    asset: string;
    status: BountyStatus;
    chain: 'aptos' | 'ethereum';
    createdAt: number;
    title: string; // 从 taskMetadata 获取
  };
}
```

**卡片布局**：
```
┌─────────────────────────────────────────────────────────┐
│ [状态图标] Bounty #123              [金额] 100 APT      │
│                                                         │
│ Implement user authentication                           │
│                                                         │
│ Status: Open    Chain: [Aptos图标]    2 hours ago      │
│                                                         │
│ [View Details]                                          │
└─────────────────────────────────────────────────────────┘
```

**状态图标**：
- Open: ⭐（黄色星星）
- Accepted: 🔒（蓝色锁）
- Submitted: ✍️（绿色钢笔）
- Confirmed: ✅（绿色勾）
- Claimed: 💰（金色钱袋）
- Cancelled: ❌（红色叉）

**链图标**：
- Aptos: [Aptos Logo]
- Ethereum: [Ethereum Logo]

### 3.3 过滤与排序

**过滤选项**：
- 按状态：All, Open, Accepted, Submitted, Confirmed
- 按链：All, Aptos, Ethereum
- 按金额范围：`<10`, `10-100`, `>100`

**排序选项**：
- Latest（默认）：按 `createdAt` 降序
- Amount ↓：按 `amount` 降序
- Amount ↑：按 `amount` 升序

**URL 参数**（利于分享）：
```
/?status=Open&chain=aptos&sort=amount-desc
```

---

## 4. Bounty 详情页（`/bounty/[id]`）

### 4.1 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Bounties                          [Connect]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bounty #123                                     │   │
│  │                                                 │   │
│  │ Implement user authentication                   │   │
│  │                                                 │   │
│  │ Status: [Open]    Chain: [Aptos]    100 APT    │   │
│  │ Created: 2 hours ago                            │   │
│  │ Sponsor: 0xAbC...D123                           │   │
│  │                                                 │   │
│  │ ┌─────────────────────────────────────────┐     │   │
│  │ │ Task Description                        │     │   │
│  │ │                                         │     │   │
│  │ │ [Markdown 渲染的任务描述]                │     │   │
│  │ │                                         │     │   │
│  │ └─────────────────────────────────────────┘     │   │
│  │                                                 │   │
│  │ [Accept Bounty]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 状态流转 UI

**Open 状态**（等待接单）：
```
┌─────────────────────────────────────────────────────────┐
│ Status: ⭐ Open                                          │
│                                                         │
│ This bounty is available for anyone to accept.         │
│                                                         │
│ [Accept Bounty]  ← 主要按钮（蓝色）                     │
└─────────────────────────────────────────────────────────┘
```

**Accepted 状态**（Worker 工作中）：
```
┌─────────────────────────────────────────────────────────┐
│ Status: 🔒 Accepted                                     │
│                                                         │
│ Worker: 0xDef...456                                     │
│ Accepted: 1 hour ago                                    │
│                                                         │
│ [如果是 Worker]                                         │
│ [Submit Work] ← 主要按钮                                │
│                                                         │
│ [如果是其他人]                                          │
│ This bounty has been accepted by another worker.       │
└─────────────────────────────────────────────────────────┘
```

**Submitted 状态**（等待确认）：
```
┌─────────────────────────────────────────────────────────┐
│ Status: ✍️ Submitted                                    │
│                                                         │
│ Worker: 0xDef...456                                     │
│ Submitted: 30 minutes ago                               │
│ Submission: [View PR] https://github.com/owner/repo/pr/10│
│                                                         │
│ [如果是 Requester]                                      │
│ [Confirm Work] ← 主要按钮（绿色）                       │
│ [Reject Work] ← 次要按钮（灰色）                        │
│                                                         │
│ [如果是其他人]                                          │
│ Waiting for requester to confirm...                    │
└─────────────────────────────────────────────────────────┘
```

**Confirmed 状态**（冷静期）：
```
┌─────────────────────────────────────────────────────────┐
│ Status: ✅ Confirmed (Cooling Period)                   │
│                                                         │
│ Worker: 0xDef...456                                     │
│ Confirmed: 2 hours ago                                  │
│                                                         │
│ ⏳ Cooling Period: 6 days 22 hours remaining           │
│ Claimable after: Oct 20, 2025 10:30 AM                 │
│                                                         │
│ [如果是 Worker]                                         │
│ [Claim Reward] ← 禁用按钮（灰色）                       │
│ "Cooling period not ended"                              │
└─────────────────────────────────────────────────────────┘
```

**Claimed 状态**（已领取）：
```
┌─────────────────────────────────────────────────────────┐
│ Status: 💰 Claimed                                      │
│                                                         │
│ Worker: 0xDef...456                                     │
│ Claimed: 1 day ago                                      │
│ Amount: 100 APT                                         │
│ Tx: [View on Explorer] 0xabc...def                      │
│                                                         │
│ This bounty has been completed and claimed.            │
└─────────────────────────────────────────────────────────┘
```

### 4.3 操作按钮状态

**按钮状态逻辑**：
```typescript
// Accept Bounty 按钮
disabled = status !== 'Open' || !walletConnected

// Submit Work 按钮
disabled = status !== 'Accepted' || currentAddress !== worker

// Confirm Work 按钮
disabled = status !== 'Submitted' || currentAddress !== sponsor

// Claim Reward 按钮
disabled = status !== 'Confirmed' || currentAddress !== worker || Date.now() < coolingUntil
```

---

## 5. 发布 Bounty 页（`/publish`）

### 5.1 表单布局

```
┌─────────────────────────────────────────────────────────┐
│  Publish New Bounty                          [Connect]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Task Information                                │   │
│  │                                                 │   │
│  │ Title *                                         │   │
│  │ ┌─────────────────────────────────────────────┐│   │
│  │ │ Enter task title                            ││   │
│  │ └─────────────────────────────────────────────┘│   │
│  │                                                 │   │
│  │ Description *                                   │   │
│  │ ┌─────────────────────────────────────────────┐│   │
│  │ │                                             ││   │
│  │ │ Enter task description (Markdown supported) ││   │
│  │ │                                             ││   │
│  │ │                                             ││   │
│  │ └─────────────────────────────────────────────┘│   │
│  │                                                 │   │
│  │ Workflow *                                      │   │
│  │ ○ spec-kit-mcp   ○ observer-mcp                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bounty Configuration                            │   │
│  │                                                 │   │
│  │ Chain *                                         │   │
│  │ ○ Aptos   ○ Ethereum                            │   │
│  │                                                 │   │
│  │ Amount *                                        │   │
│  │ ┌─────────────────┐  ┌───────────────────────┐ │   │
│  │ │ 100             │  │ [APT ▼]               │ │   │
│  │ └─────────────────┘  └───────────────────────┘ │   │
│  │                                                 │   │
│  │ Estimated Gas: ~0.001 APT                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Preview                                         │   │
│  │                                                 │   │
│  │ [渲染后的任务预览]                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancel]                        [Publish Bounty]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 表单验证

**必填字段**：
- Title：最少 10 字符，最多 100 字符
- Description：最少 50 字符
- Workflow：必须选择
- Chain：必须选择
- Amount：必须 > 0

**实时验证**：
- 字段失焦时验证
- 显示错误提示（红色）
- 禁用"Publish"按钮直到所有字段有效

**错误提示示例**：
```
Title
┌─────────────────────────────────────────────┐
│ Test                                        │
└─────────────────────────────────────────────┘
⚠️ Title must be at least 10 characters
```

### 5.3 发布流程

**Step 1：点击"Publish Bounty"**
- 检查钱包连接
- 检查表单验证

**Step 2：钱包确认**
```
┌─────────────────────────────────────────────────────────┐
│ Confirm Transaction                                     │
│                                                         │
│ You are about to create a bounty:                      │
│ - Amount: 100 APT                                       │
│ - Gas: ~0.001 APT                                       │
│ - Total: 100.001 APT                                    │
│                                                         │
│ [Confirm in Wallet]                                     │
└─────────────────────────────────────────────────────────┘
```

**Step 3：交易提交中**
```
┌─────────────────────────────────────────────────────────┐
│ ⏳ Creating Bounty...                                   │
│                                                         │
│ 1. Uploading task data to GitHub ✅                     │
│ 2. Creating bounty on Aptos...                         │
│ 3. Updating metadata...                                 │
│                                                         │
│ Tx Hash: 0xabc...def                                    │
└─────────────────────────────────────────────────────────┘
```

**Step 4：成功**
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Bounty Created Successfully!                         │
│                                                         │
│ Bounty ID: 123                                          │
│ Task URL: https://github.com/owner/repo/issues/1       │
│ Tx Hash: 0xabc...def                                    │
│                                                         │
│ [View Bounty]  [Create Another]                         │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 用户仪表板（`/dashboard`）

### 6.1 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                   [Connect]  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │
│  │ As Sponsor      │  │ As Worker       │  │ Stats   │ │
│  │ 5 Active        │  │ 3 In Progress   │  │ 8 Total │ │
│  │ 10 Completed    │  │ 7 Completed     │  │ 5 ETH   │ │
│  └─────────────────┘  └─────────────────┘  └─────────┘ │
│                                                         │
│  [My Bounties] [My Work]                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bounty #123                        100 APT      │   │
│  │ Status: Open    Created: 2 hours ago            │   │
│  │ [View]                                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 统计卡片

**As Sponsor**：
- Active Bounties（Open + Accepted + Submitted）
- Completed Bounties（Claimed）
- Total Amount Paid

**As Worker**：
- In Progress（Accepted + Submitted）
- Completed（Claimed）
- Total Earnings

**Overall Stats**：
- Total Bounties
- Total Value Locked
- Success Rate

---

## 7. 钱包连接

### 7.1 未连接状态

**钱包按钮**：
```
┌─────────────────────────┐
│ [🔗] Connect Wallet     │
└─────────────────────────┘
```

**点击后弹窗**：
```
┌─────────────────────────────────────────────────────────┐
│ Connect Wallet                                      [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Aptos Logo] Petra Wallet                       │   │
│  │ Connect to Aptos network                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Ethereum Logo] MetaMask                        │   │
│  │ Connect to Ethereum network                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 已连接状态

**钱包按钮**：
```
┌─────────────────────────────────┐
│ [Aptos Logo] 0xAbC...D123  [▼] │
└─────────────────────────────────┘
```

**点击后下拉菜单**：
```
┌─────────────────────────────────┐
│ Connected to Aptos Testnet      │
│ Balance: 123.45 APT             │
├─────────────────────────────────┤
│ [👤] My Dashboard               │
│ [📋] Copy Address               │
│ [🔗] Switch Network             │
│ [🚪] Disconnect                 │
└─────────────────────────────────┘
```

### 7.3 切换网络

**当前连接 Aptos，尝试操作 Ethereum Bounty**：
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Wrong Network                                        │
│                                                         │
│ This bounty is on Ethereum, but you are connected to   │
│ Aptos. Please switch your wallet to Ethereum.          │
│                                                         │
│ [Switch to Ethereum]  [Cancel]                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. 交互细节

### 8.1 加载状态

**全局加载**（页面级）：
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Loading Spinner]                    │
│                    Loading bounties...                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**局部加载**（组件级）：
```
┌─────────────────────────────────────────────────────────┐
│ Bounty #123                                             │
│ [Spinner] Loading details...                            │
└─────────────────────────────────────────────────────────┘
```

**按钮加载**：
```
┌─────────────────────────┐
│ [Spinner] Accepting...  │ ← 按钮禁用 + 显示进度
└─────────────────────────┘
```

### 8.2 成功反馈

**Toast 通知**（右上角弹出，3 秒后消失）：
```
┌─────────────────────────────────────┐
│ ✅ Bounty accepted successfully!   │
│ Tx: 0xabc...def                    │
└─────────────────────────────────────┘
```

### 8.3 错误处理

**Toast 通知**（红色）：
```
┌─────────────────────────────────────┐
│ ❌ Transaction failed               │
│ Insufficient balance                │
└─────────────────────────────────────┘
```

**表单错误**（字段下方）：
```
Amount
┌─────────────────────────────────────┐
│ -10                                 │
└─────────────────────────────────────┘
⚠️ Amount must be greater than 0
```

### 8.4 确认对话框

**危险操作确认**（如取消 Bounty）：
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Cancel Bounty?                                       │
│                                                         │
│ Are you sure you want to cancel this bounty?           │
│ This action cannot be undone.                           │
│                                                         │
│ [No, Keep It]  [Yes, Cancel]                            │
└─────────────────────────────────────────────────────────┘
```

---

## 9. 响应式设计

### 9.1 断点

**Tailwind CSS 断点**：
- `sm`: 640px（手机横屏）
- `md`: 768px（平板）
- `lg`: 1024px（笔记本）
- `xl`: 1280px（桌面）

### 9.2 移动端布局

**Bounty 列表页（移动）**：
```
┌──────────────────────────┐
│ ☰ Code3          [Wallet]│
├──────────────────────────┤
│ [All] [Open] [Accepted]  │
│                          │
│ ┌──────────────────────┐ │
│ │ ⭐ Bounty #123       │ │
│ │ Implement user auth  │ │
│ │ 100 APT • Open       │ │
│ │ [View]               │ │
│ └──────────────────────┘ │
│                          │
└──────────────────────────┘
```

**发布页（移动）**：
- 单列布局
- 表单字段堆叠
- 按钮全宽

### 9.3 触摸优化

**按钮最小尺寸**：
- 高度：44px（Apple Human Interface Guidelines）
- 宽度：88px

**触摸目标间距**：
- 最小间距：8px

---

## 10. 可访问性（A11y）

### 10.1 WCAG 2.1 AA 标准

**色彩对比度**：
- 正文文本：至少 4.5:1
- 大文本（18px+）：至少 3:1

**键盘导航**：
- 所有交互元素可通过 Tab 键访问
- 焦点样式清晰可见
- 按 Enter/Space 触发操作

**屏幕阅读器**：
- 所有图像有 `alt` 文本
- 表单字段有 `label`
- 按钮有明确的 `aria-label`

### 10.2 语义化 HTML

**使用正确的标签**：
```html
<!-- ✅ 正确 -->
<button>Accept Bounty</button>
<nav><a href="/bounties">Bounties</a></nav>
<article><h2>Bounty #123</h2></article>

<!-- ❌ 错误 -->
<div onclick="...">Accept Bounty</div>
```

### 10.3 焦点管理

**模态框打开时**：
- 焦点移动到模态框
- Tab 键循环在模态框内
- Esc 键关闭模态框

**页面跳转后**：
- 焦点移动到页面主标题
- 屏幕阅读器宣告页面标题

---

## 11. 性能优化

### 11.1 加载策略

**首屏渲染**：
- 使用 Next.js Server Components
- 预加载关键 CSS
- 懒加载非关键组件

**图片优化**：
- 使用 Next.js `<Image>` 组件
- 自动生成 WebP 格式
- 懒加载图片

**代码分割**：
- 按路由分割（Next.js 自动）
- 动态导入大组件：
  ```typescript
  const BountyDetails = dynamic(() => import('./BountyDetails'))
  ```

### 11.2 缓存策略

**API 请求缓存**：
- 使用 React Query / SWR
- 缓存 Bounty 列表（5 分钟）
- 实时更新 Bounty 详情

**链上数据缓存**：
- 缓存不可变数据（Bounty 创建时间）
- 轮询可变数据（Bounty 状态，每 10 秒）

---

## 12. 参考

- **数据模型**：[01-data-model.md](./01-data-model.md) — Bounty 状态流转
- **快速开始**：[06-quickstart.md](./06-quickstart.md) — 完整用户流程
- **包结构**：[05-packages-structure.md](./05-packages-structure.md) — Frontend 目录结构
- **Tailwind CSS**：https://tailwindcss.com/docs
- **Next.js**：https://nextjs.org/docs
- **WCAG 2.1**：https://www.w3.org/WAI/WCAG21/quickref/
