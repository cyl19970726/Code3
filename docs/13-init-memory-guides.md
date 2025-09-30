Init Memory Guides — 初始化与记忆（替代 specify init 的交互步骤）

本文件定义在不同代理环境（Codex/Claude）中初始化 MCP 工具栈与记忆指南，替代传统 `specify init` 的“助手选择/脚本类型/脚手架下载”交互步骤。

## 1) Codex 初始化
- 添加 MCP servers：
  - `spec-workflow-mcp`（带仪表盘）：`npx -y @pimzino/spec-workflow-mcp@latest -- /path/to/project --AutoStartDashboard`
  - `github-mcp-server`：按其 README 启动；ENV: `GITHUB_TOKEN`
  - `aptos-chain-mcp`：按 aptos-chain-mcp 文档添加；ENV: `APTOS_API_KEY`（可选 `APTOS_GAS_STATION_API_KEY`）
- 注入 ENV：`GITHUB_TOKEN`, `APTOS_API_KEY`, `APTOS_GAS_STATION_API_KEY?`, `APTOS_PRIVATE_KEY?`
- 快速自检：
  - 列表工具：能看到 `spec_mcp.*`, `server_mcp.*`（占位/后续实现）
  - 调用示例：`spec_mcp.specify` → 生成 `specs/<NNN-slug>/spec.md`
  - 发布示例：`spec_mcp.publish_issue_with_metadata`

## 2) Claude Code 初始化
- 添加 MCP：
  - `claude mcp add spec-workflow npx -y @pimzino/spec-workflow-mcp@latest -- /path/to/project`
  - `claude mcp add github <启动命令> -- <flags>`（按 github-mcp-server 文档）
  - 添加 aptos-chain-mcp；ENV 与 Codex 一致
- 参考仓库根 `CLAUDE.md` 获取常用指令与注意事项（aptos-chain-mcp）

## 3) 初始化检查清单
- [ ] MCP servers 连通，工具列表可见
- [ ] ENV 注入生效（Aptos/GitHub）
- [ ] 能创建本地 `spec.md` 与发布到 Issue（含 JSON 元数据）
- [ ] 能在仪表盘看到任务列表与状态
