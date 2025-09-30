API & Config — aptos-chain-mcp 接入与配置要点

本文件罗列前端/后端在接入 aptos-chain-mcp 时的关键配置与 API 使用要点（以 aptos-chain-mcp 文档为唯一权威）。

## 1) 钱包连接（前端）
- 使用 `@aptos-labs/wallet-adapter-react` 包装应用根，注入网络与 API Key（参考 aptos-chain-mcp 文档“如何接入钱包连接”）
- 在页面/组件中以 `useWallet()` 获取 `account/connected/signAndSubmitTransaction`

## 2) 交易签名与提交
- 所有交易通过 `useWallet().signAndSubmitTransaction` 完成（参考 aptos-chain-mcp 文档“如何签名与提交交易”）
- 重要：提交后等待确认（`aptos.waitForTransaction`）并捕获错误

## 3) Gas Station（可选）
- 安装 `@aptos-labs/gas-station-client` 并创建 `GasStationTransactionSubmitter`（参考 aptos-chain-mcp 文档）
- 通过 `AptosConfig.pluginSettings.TRANSACTION_SUBMITTER` 注入；Provider 侧传入 `transactionSubmitter`

## 4) Fungible Asset（USDT）
- 统一采用 USDT（测试网）；余额查询/转账按 FA 标准（参考“集成同质化资产标准”）
- 相关地址以 aptos-chain-mcp 文档公布为准

## 5) Full Node API Key
- 在 Provider 与 SDK `AptosConfig` 注入 `APTOS_API_KEY`（参考 aptos-chain-mcp 文档“配置全节点 API Key”）
- 网络参数需与 API Key 网络一致

## 6) ENV 与运行配置
- `APTOS_API_KEY`, `APTOS_GAS_STATION_API_KEY?`
- 仅在接单者本机可配置 `APTOS_PRIVATE_KEY` 用于自动化签名（非前端）

## 7) 合约方法调用
- `create_bounty/accept_bounty/submit_pr/claim_payout` 由前端钱包签名
- `mark_merged` 建议由 Resolver（后端或 Sponsor 前端）触发
