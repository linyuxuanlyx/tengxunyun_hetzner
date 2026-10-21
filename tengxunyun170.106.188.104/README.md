# 腾讯云主机：170.106.188.104

本目录保存 `170.106.188.104` 的运维记录、部署说明、脚本和脱敏配置模板。

## 目录约定

- `inventory/`：主机、网络、服务和端口清单
- `deployments/`：按应用保存部署记录和 Compose 模板
- `scripts/`：只针对本主机的可重复运维脚本
- `backups/`：从远端下载的配置备份；敏感文件不进入版本库
- `changes/`：按日期记录变更、验证结果和回滚点

## 当前服务

- CLIProxyAPI：`/root/data/cliproxy`
- 版本：`v8.0.36`
- 对外域名：`https://cli.kobayashiii.cloud`
- 管理页面：`https://cli.kobayashiii.cloud/management.html`
- 运行方式：Docker Compose，容器名 `cli-proxy-api`

## 凭据规则

API Key、Management Key、OAuth 文件和私钥只保存在远端受保护位置或密码管理器中。本目录只记录变量名、用途和远端路径，不保存明文密钥。

## n8n 历史档案

- [部署结构与核验限制](deployments/n8n/README.md)：记录 2026-06-25 只读检查所得的 PostgreSQL、n8n、external runners 方案。
- [2026-06-24 初始部署尝试](changes/2026-06-24-n8n-initial-deployment.md)：单容器部署、权限故障及验证范围。
- [2026-06-25 最终部署只读检查](changes/2026-06-25-n8n-readonly-inspection.md)：用户自行部署后的实际配置。
- [2026-06-26 Notion 说明书](changes/2026-06-26-n8n-notion-documentation.md)：文档写入记录与已知待修正内容。

以上记录于 2026-10-21 根据本对话执行结果补录，本次未连接远端。不同日期的快照不得视为当前状态。
