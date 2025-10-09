# spec-kit-mcp Critical Findings Summary

> **日期**: 2025-10-07
> **审查**: Scripts + Templates + Prompts 完整工作流

---

## 🔴 核心问题确认

### 问题：Templates 使用 Handlebars，但 Scripts 只做复制，无渲染

**Scripts 实际行为**:
```bash
# create-new-feature.sh (Line 48-50)
cp "$TEMPLATE" "$SPEC_FILE"  # 只是简单复制，无渲染

# setup-plan.sh (Line 10-11)
cp "$TEMPLATE" "$IMPL_PLAN"  # 只是简单复制，无渲染
```

**Templates 包含的内容**:
```markdown
# Feature Specification: {{FEATURE_NAME}}
**Feature Branch**: `{{FEATURE_ID}}`

{{#each SCENARIOS}}
{{@index}}. **Given** {{this.given}}, **When** {{this.when}}, **Then** {{this.then}}
{{/each}}

{{#if ENTITIES.length}}
### Key Entities
{{#each ENTITIES}}
- **{{this.name}}**: {{this.description}}
{{/each}}
{{/if}}
```

**LLM 看到的内容**:
- ❌ 原始的 `{{FEATURE_NAME}}`（未替换）
- ❌ 原始的 `{{#each SCENARIOS}}`（未处理的循环）
- ❌ 原始的 `{{#if ENTITIES.length}}`（未处理的条件）

**LLM 的困惑**:
1. 我应该保留 `{{}}` 吗？
2. 我应该删除这些 `{{}}` 吗？
3. 我应该如何处理 `{{#each}}` 循环？
4. 我应该如何处理 `{{#if}}` 条件？

---

## 📊 影响范围

### spec.md Template
- 简单占位符: 8个
- 条件语句: 3个
- 循环语句: 4个
- **严重程度**: 🔴 CRITICAL

### plan.md Template
- 简单占位符: 15个
- 条件语句: 10个（包括复杂的嵌套）
- 循环语句: 6个
- **严重程度**: 🔴 CRITICAL
- **额外问题**: Prompt 指令说"The template is self-contained and executable"，完全误导

### tasks.md Template
- 简单占位符: 6个
- 条件语句: 15个（每个 task 3个条件）
- 循环语句: 5个
- **严重程度**: 🔴 CRITICAL
- **额外问题**: 指令说"Replace example tasks"，但 template 中没有示例

---

## 🎯 根本原因

### 设计不匹配

**当前实现** = Option A（纯 Markdown）+ Option B（Handlebars）的混合体

| 组件 | Option A（纯 Markdown） | Option B（Handlebars） | 当前实际 |
|------|----------------------|---------------------|---------|
| Templates | 纯 Markdown 示例 | Handlebars 模板 | **Handlebars** ✅ |
| Scripts | 复制示例 | 复制模板 | **复制模板** ✅ |
| Prompts | "Load example and follow structure" | "Load template, will be rendered" | **"Load template and replace placeholders"** ⚠️ |
| 渲染逻辑 | 不需要 | **必须有** | **没有** ❌ |

**结论**: Templates 设计成 Option B，但实现只做了 Option A 的一半（复制），缺少关键的渲染逻辑。

### 历史原因

```typescript
// src/prompts/specify.ts:2-3
/**
 * /specify Prompt - 创建 spec.md
 * 基于 observer/.codex/prompts/specify.md
 */
```

**推测**:
1. spec-kit-mcp 基于 observer 项目
2. 复制了 observer 的 Handlebars templates
3. **但没有复制 observer 的渲染逻辑**
4. 导致设计与实现不匹配

---

## ✅ 解决方案

### 推荐方案：转换为纯 Markdown 示例

**为什么推荐**:
- ✅ 无需添加依赖（Handlebars）
- ✅ 无需大量代码改动
- ✅ LLM 可以直接理解和模仿
- ✅ 实施简单（3-4小时）
- ✅ 维护简单

**实施步骤**:

1. **重写 spec.md template**（移除 Handlebars，添加完整示例）:
```markdown
# Feature Specification: User Authentication

**Feature Branch**: `feat/001-user-auth`
**Created**: 2025-10-01
**Status**: Draft

## User Scenarios & Testing

### Primary User Story
As a new user, I want to create an account so that I can access personalized features.

### Acceptance Scenarios
1. **Given** user visits signup page, **When** user enters valid email and password, **Then** account is created and user is logged in
2. **Given** user enters existing email, **When** user submits form, **Then** error message "Email already exists" is shown
3. **Given** user enters weak password, **When** user submits form, **Then** error message "Password must be at least 8 characters" is shown

### Functional Requirements
- **FR-1**: System shall allow users to register with email and password
- **FR-2**: System shall validate email format (RFC 5322)
- **FR-3**: System shall enforce password requirements (min 8 chars, 1 uppercase, 1 number)
- **FR-4**: System shall hash passwords using bcrypt (cost factor 12)
- **FR-5**: System shall send verification email after registration
- **FR-6**: System shall prevent duplicate email registrations
- **FR-7**: System shall allow users to login with verified email
- **FR-8**: System shall lock account after 5 failed login attempts
- **FR-9**: System shall provide password reset via email
- **FR-10**: System shall expire password reset tokens after 1 hour

### Key Entities
- **User**: id, email, passwordHash, emailVerified, createdAt, lastLogin
- **VerificationToken**: token, userId, expiresAt, type (email_verify | password_reset)
- **LoginAttempt**: userId, ipAddress, success, timestamp
```

2. **重写 plan.md template**（类似转换）

3. **重写 tasks.md template**（类似转换，包含 20-30 个示例 tasks）

4. **更新 Prompt 指令**:
```typescript
// specify Prompt 新指令
text: `Given that feature description, do this:

1. Run the script...
2. Load .specify/templates/spec-template.md to see an EXAMPLE specification.
3. Write a NEW specification to SPEC_FILE following the EXAMPLE structure:
   - Use the same section headings
   - Follow the same format for requirements (FR-1, FR-2, etc.)
   - Use GIVEN-WHEN-THEN format for scenarios
   - Replace ALL example content with content derived from the feature description
   - DO NOT keep any example content from the template
4. Report completion...`
```

---

## 📋 优先级

### 🔴 Phase 1: Templates 重写（CRITICAL - 3-4 小时）

1. 重写 spec.md template
2. 重写 plan.md template
3. 重写 tasks.md template
4. 更新所有 Prompt 指令（specify, plan, tasks）

### 🟠 Phase 2: Descriptions 增强（HIGH - 1 小时）

1. 更新 init Tool description（添加 "MUST be called ONCE"）
2. 更新所有 Prompt descriptions（添加 [STEP X], 前置条件, 后续验证）
3. 更新所有 Context Tool descriptions（添加验证用途, 质量标准）

### 🟡 Phase 3: 验证与测试（MEDIUM - 1 小时）

1. 添加 template 验证测试（确保无 `{{...}}`）
2. 更新 E2E-01 测试文档
3. 重新运行 E2E-01 测试

---

## 🎓 关键教训

### 1. Templates 设计原则

**对于 LLM 使用的 templates**:
- ✅ 使用纯 Markdown 示例
- ✅ 包含完整的示例内容
- ✅ 清晰的格式和结构
- ❌ 避免 Handlebars/Jinja 等模板语法（除非有渲染引擎）

### 2. 从其他项目迁移时

**必须确认**:
1. 设计意图是什么？
2. 原项目有哪些支持代码？
3. 哪些部分需要重新实现？
4. 哪些设计需要简化？

**不要**:
- ❌ 只复制表面设计（templates）
- ❌ 忽略底层实现（渲染逻辑）
- ❌ 假设 LLM 能处理复杂语法

### 3. Prompt 指令编写

**清晰的指令**:
- ✅ "Load template to see EXAMPLE"
- ✅ "Write NEW content following the EXAMPLE structure"
- ✅ "Replace ALL example content with actual content"

**模糊的指令**:
- ❌ "Load template and replace placeholders"（什么 placeholders？）
- ❌ "The template is self-contained and executable"（什么意思？）
- ❌ "Replace example tasks"（哪里有 example？）

---

## 📈 预期效果

### 修复前

```
LLM 生成的 spec.md:
---
# Feature Specification: {{FEATURE_NAME}}  ❌ 未处理
**Feature Branch**: `feat/001-my-feature`

### Functional Requirements
{{#each REQUIREMENTS}}  ❌ 未处理
- **FR-{{@index}}**: {{this.description}}
{{/each}}
```

### 修复后

```
LLM 生成的 spec.md:
---
# Feature Specification: User Authentication  ✅ 正确
**Feature Branch**: `feat/001-user-auth`

### Functional Requirements
- **FR-1**: System shall allow users to register with email and password  ✅ 正确
- **FR-2**: System shall validate email format (RFC 5322)  ✅ 正确
- **FR-3**: System shall enforce password requirements  ✅ 正确
...
```

---

## 🚀 下一步

**立即执行**:
1. 开始 Phase 1: Templates 重写（spec.md → plan.md → tasks.md）
2. 更新所有相关 Prompt 指令
3. 测试验证

**目标**:
- ✅ 所有 templates 不包含 `{{...}}`
- ✅ LLM 生成的文件格式正确、内容完整
- ✅ E2E-01 测试通过

---

**详细分析**: 参见 `templates-audit.md` 和 `implementation-audit.md`
