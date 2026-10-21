# 2026-06-25：n8n 最终部署只读检查（历史补录）

补录日期：2026-10-21，Asia/Shanghai。依据为本对话 SSH 检查输出；本次未重新核验远端。

## 目的与操作范围

用户表示已自行完成部署，要求仅熟悉部署方式。执行 docker ps、inspect、logs，以及配置文件和目录权限读取；没有执行远端配置写入或容器重启。

## 当时观察结果

- n8n：n8nio/n8n:2.26.8，用户 node。
- n8n-runners：n8nio/runners:2.26.8，用户 runner。
- n8n-pg：postgres:16，健康检查通过。
- 三个容器当时均已运行约 17 小时，重启策略 always，使用 ipsec_net。
- Compose 文件：/root/data/docker_data/n8n/docker-compose.yml。
- 配置与存储详情见 [n8n 部署档案](../deployments/n8n/README.md)。

## 验证结果与限制

- 读取到 PostgreSQL 健康检查通过、数据库迁移完成，以及 JavaScript/Python runners 注册成功的日志。
- 日志记录编辑器地址、Owner 创建成功和 license 激活；未读取工作流数据或凭据。
- .env 仅回显变量名，值已脱敏。
- 未检查反向代理的 upstream、证书或实际监听协议，未进行公网 HTTP、浏览器或工作流执行验证。
- N8N_RUNNERS_ENABLED 在日志中提示不再需要。

## 实际变更与回滚

本次远端只读，无配置变更，无需回滚。用户自行部署的完整命令过程和部署前备份位置未在本对话提供，不能将该部署归为代理执行。
