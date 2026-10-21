# Notion MCP 接入排障补录

补录日期：2026-10-21（Asia/Shanghai）。操作发生于本线程 2026-06-25 至 2026-06-26 的历史记录；本次没有重新连接服务器或 Notion。

## 归属与目的

用户希望在本机 Codex 中配置 Notion MCP 并测试写文档。该接入直接连接 Notion SaaS，不经过 `170.106.188.104` 或 `46.225.223.166`。本记录放在腾讯云关联客户端档案中，仅因该工作区已有 n8n MCP 客户端；不计为虚拟机部署或变更。

## 有执行结果的操作

- 读取本机 `~/.codex/config.toml`，追加官方 Notion MCP 地址；曾将内部 connection 的访问令牌作为静态 Bearer 配置。
- 创建本机配置备份 `~/.codex/config.toml.bak-notion-20260625-2`，后续创建 `~/.codex/config.toml.bak-notion-oauth-20260626`。这是历史创建结果，本次未检查文件是否仍存在；备份可能含敏感内容，不复制进档案。
- 通过本机已有 MCP SDK 的 Streamable HTTP 客户端发起握手，服务端返回 `invalid_token` / `Invalid access token`。握手失败，未取得工具列表，不能记为已成功执行 `listTools`。
- 用浏览器 MCP 读取内部 connection 详情，页面将其令牌说明为工作空间 API 请求使用；随后对照官方 MCP 接入页中的 OAuth 流程。
- 执行 `codex mcp login notion`，命令返回 `Successfully logged in to MCP server 'notion'.`，证明当时 OAuth 登录完成。
- 随后的当前线程工具检索未找到可调用的 Notion 工具；资源列表和资源模板列表为空。空资源列表本身不能证明没有工具或鉴权失败。
- 用户实际输入 `/reload-mcp` 后收到 `Unrecognized command`，本线程未实现该命令重载。

## 排障结论与纠正

- `invalid_token` 仅证明那次提交的令牌未被托管 MCP 端点接受，不能推出该令牌对普通 Notion API 也无效。此前反复要求重新生成 connection token 的建议没有解决认证方式不匹配的问题。
- 排查曾引用本地 Hermes 的 MCP 文档，将其 `auth: oauth` 和 `/reload-mcp` 用法套用于 Codex，并写入 `auth = "oauth"`。这些证据属于 Hermes，不能证明 Codex 支持这些字段或命令；本记录不将其作为可复用 Codex 配置模板。
- Codex CLI 实际提供 `mcp login <NAME>`；成功登录后 `mcp list` 仍显示 `Auth Unsupported`。当时未查明原因，不能直接归为显示缺陷，也不能据此否定登录成功返回。
- 当前线程没有完成通过自身工具创建并回读文档的闭环。其他会话的后续建页证据另见已有历史补录，不混作本线程完成的测试。

## 本次变更、验证和回滚

本次仅整理本地 Markdown 与索引，未修改本机 MCP 配置、认证状态、Notion 页面或任何远端服务。无新增远端备份或回滚点。历史配置备份如需用于恢复，必须先核对当前配置并保留后续改动，不能直接覆盖。

关联记录：[MCP 客户端与应用操作历史](2026-10-21-mcp-history-backfill.md)、[关联客户端说明](../deployments/mcp-clients/README.md)。历史来源为当前 Codex 会话 `019efde3-7a4b-7973-9da9-26ad5e757f52` 的工具返回及用户反馈；不复制可能含令牌的原始输出。
