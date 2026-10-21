# MCP 客户端与应用操作历史补录

补录日期：2026-10-21（Asia/Shanghai）。历史操作日期见下表；本次仅核对本地文件与 Codex 会话记录，没有 SSH 登录、远端写入或实时服务检查。

## 归属与范围

- 目标应用为腾讯云主机档案中登记的 n8n，历史入口为 `https://n8n.kobayashiii.cloud`。
- n8n API/MCP 操作属于应用层操作，不代表安装、升级或修改宿主机。
- 本机直连 `https://mcp.notion.com/mcp` 的授权与建页发生在本机和 Notion SaaS，附在此处作为关联客户端记录，不计为腾讯云或 Hetzner 虚拟机变更。
- 已有 CLIProxyAPI 记录保留原位：[初始部署](2026-09-17-cli-proxy-initial-deployment.md)、[v8 升级](2026-10-21-cli-proxy-v8-upgrade.md)。

## 历史操作与结果

| 操作日期 | 实际操作 | 历史验证结果与边界 |
|---|---|---|
| 2026-06-25 | 测试 n8n Public API 和 MCP | API 使用 `X-N8N-API-KEY` 返回 200；MCP 使用 Bearer 完成 `initialize`、`tools/list`，当时报告 `n8n MCP Server 1.1.0`。两种接口使用不同凭据。 |
| 2026-06-25 | 创建本地客户端及 stdio 转发代理，配置本机 Codex | 最终代理读取 `n8n_lab_url` 和 `n8n_lab_mcp_token`，避免把 token 明文写入 MCP 配置；握手成功。文件仍位于工作区根目录。 |
| 2026-06-25 | 在现有个人项目创建测试 workflow 并执行 | workflow `SLV1DST2NtDNFXKF`，名称 `Codex Test Workflow`，项目 `z3oCDBxAZkosO6I3`；execution `2` 为 `success`，输出 `testStatus=created-by-codex`。 |
| 2026-06-26 | 将测试 workflow 改为使用现有 Notion credential 建页并执行 | execution `4` 为 `success`；创建页面 `38b77475-6a34-814b-a907-d36ee08ab1e5`，名称 `Codex MCP Notion Write Test`。此时测试 workflow 已修改，不能再视作原始 Set 节点测试。 |
| 2026-06-26 | 在本机完成官方 Notion MCP OAuth 登录，再由新 Codex 子会话调用建页工具 | 登录命令返回 `Successfully logged in to MCP server 'notion'.`；`notion-create-pages` 完成，页面 ID 为 `38b77475-6a34-81c4-86de-ebf4bc2f0be5`。这是直连 Notion 的另一条链路。 |

## 历史故障与限制

- n8n 的代码型 MCP 写请求曾收到 WAF 403。用户报告放行后，后续创建、执行和读取结果完成闭环；没有证据证明本会话修改了 WAF 配置。
- 当时 MCP 未提供 `create_project`，实例报告 `teamProjectsEnabled=false`；实际是在已有 personal project 创建 workflow，没有创建新项目。
- Notion 登录后，原对话未暴露新工具，新起子会话才完成建页；这次证据不能证明每次都需要登录。
- 之前未取得 Notion MCP 访问凭据的确切到期时间，也未验证到期后的自动刷新。不能将“长期可用”或具体有效天数写成实测结论；OAuth 凭据实际存储位置也未查明，不应认定在 `auth.json` 中。
- 上述成功结果属于各自历史时点，不证明 2026-10-21 的连通性、凭据有效性或页面仍然存在。

## 证据与关联文件

- Codex 会话 `019efdcc-8f4f-7990-a9df-bd78dd6d2452`：n8n 客户端、创建执行及经 n8n 写 Notion 的历史完成记录。
- Codex 会话 `019f0278-7d56-7ce2-bc38-6ae2356a79fd`：本机 Notion OAuth、子会话创建测试页的命令与结果。
- 原始会话存储在本机 `~/.codex/sessions/`；可能包含敏感内容，本次不复制原文或认证内容进档案。
- [客户端说明](../deployments/mcp-clients/README.md)、[根目录客户端说明](../../README.md)。

## 回滚与本次变更

本次只新增历史说明及关联文档，没有修改现有配置、工作流、页面或服务器状态，不需要远端回滚。历史测试 workflow 和页面的删除记录未找到，不视为已清理；如需清理，应先核对对象是否已被后续业务复用。
