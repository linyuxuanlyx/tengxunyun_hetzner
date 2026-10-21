# 关联 MCP 客户端记录

整理日期：2026-10-21。以下是历史接入说明，不是本日实时核验结果。客户端运行在本机，不是部署在腾讯云虚拟机上的新服务。

## n8n 客户端

- 历史服务入口：`https://n8n.kobayashiii.cloud/mcp-server/http`。
- [独立调试客户端](../../../n8n-mcp-client.js)：支持协议初始化、列工具与调用工具。
- [stdio 代理](../../../n8n-mcp-stdio-proxy.js)：向本机 MCP 客户端提供 stdio 接口，再转发到远端 HTTP MCP。
- 环境变量 `n8n_lab_url` 保存基础地址，`n8n_lab_mcp_token` 保存 MCP 访问凭据；历史 Public API 测试另用 `n8n_lab_api_token`。
- 2026-06-25 的本机 Codex 配置曾指向根目录代理脚本，因此这些既有文件保留原位；本次未核验当前全局配置。
- [根目录说明](../../../README.md)提供调试命令。

凭据由本机运行环境提供，档案只记录变量名，不保存值。历史全局配置备份曾包含明文凭据，不复制进主机档案；其当前存在性和安全存放情况未在本次核验。

## Notion 的两条历史链路

1. `本机 Codex -> n8n MCP -> n8n 内已有 Notion credential -> Notion`：2026-06-26 execution `4` 成功建页。Notion credential 由 n8n 管理，本次没有导出。
2. `本机 Codex -> 官方 Notion MCP -> Notion`：2026-06-26 完成 OAuth 并成功建页，不经过这台腾讯云主机。

OAuth 认证文件及 token 不进入本目录；本次没有检查、复制或刷新认证凭据。

完整时间线、对象 ID 与验证限制见 [历史补录](../../changes/2026-10-21-mcp-history-backfill.md)。
