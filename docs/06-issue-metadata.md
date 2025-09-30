Issue Metadata — JSON Schema（code3/v1）

本文件定义发布任务到 GitHub Issue 时所嵌入的机器可读 JSON 元数据。该元数据用于 server-remote 接单、链上映射、状态同步与幂等控制。

## 版本与位置
- `schema`: 固定 `code3/v1`
- 建议作为 Issue 正文内的代码块粘贴（以三反引号包裹的 JSON），并在首行注明 `code3-meta`

## 字段定义
```
{
  "schema": "code3/v1",
  "repo": "https://github.com/{owner}/{repo}",
  "issue_number": 123,
  "issue_hash": "sha256(<canonical-json>)",
  "feature_id": "NNN-slug",
  "task_id": "{owner}/{repo}#123",
  "bounty": {
    "network": "testnet",
    "asset": "USDT",
    "amount": "1",
    "bounty_id": null,
    "merged_at": null,          // ISO8601 字符串或区块时间序列化
    "cooling_until": null       // 同上，标记冷静期结束
  },
  "spec_refs": [
    "specs/NNN-slug/spec.md"
  ],
  "labels": ["code3", "open"]
}
```

### 说明
- `issue_hash`：发布端根据 canonical JSON（按字段名排序、去除空白）计算的 sha256，用作幂等键
- `task_id`：规范化任务标识，便于 server-remote 解析
- `bounty.*`：链上赏金映射字段；`merged_at/cooling_until` 由后端/合约状态更新回写
- `spec_refs`：源文档相对路径（或多路径）；便于接单端拉取上下文
- `labels`：初始至少包含 `code3` 与 `open`

## 标签语义（建议）
- `open` → 初始状态；`in-progress` → 已接单；`merged` → PR 已合并；`cooling` → 冷静期；`paid` → 已领取；`cancelled` → 已取消

## 版本化与兼容
- 每次 schema 增加新字段仅附加，不破坏旧字段
- 读取端遇到未知字段需忽略；写入端尽量保留原字段顺序（便于人类阅读）

## Canonical JSON 与 hash 计算
- 目的：生成稳定的 `issue_hash` 作为幂等键，避免空白/顺序差异导致 hash 不一致。
- 规则：
  1) 仅取必要字段（建议：schema/repo/issue_number/feature_id/spec_refs/bounty.asset/bounty.amount），或取完整对象但遵循下列规范；
  2) 递归按 key 升序排序对象属性；数组顺序保持输入自然顺序（若需稳定，可先排序字符串型数组）；
  3) 使用 UTF-8 编码、无缩进/空白的 JSON.stringify（紧凑形式）；
  4) 对该字符串计算 sha256，输出十六进制小写字符串。
- 伪代码：
```
function canonical(obj) {
  if (Array.isArray(obj)) return obj.map(canonical);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj).sort()) out[k] = canonical(obj[k]);
    return out;
  }
  return obj;
}
const s = JSON.stringify(canonical(metadata));
const issue_hash = sha256(s).hexLower();
```
