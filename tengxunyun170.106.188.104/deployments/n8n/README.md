# n8n 历史部署档案

观察日期：2026-06-25。补录日期：2026-10-21。来源为本对话只读 SSH 输出，不代表当前运行状态。最终三容器部署由用户完成。

## 文件与组件

部署目录：`/root/data/docker_data/n8n`。

- `docker-compose.yml`：PostgreSQL、n8n、external runners 三个服务。
- `.env`：数据库管理账号、业务账号、数据库名、镜像版本及 Runner token。档案不保存真实值。
- `init-data.sh`：在数据库首次初始化时创建业务账号，授予数据库权限。
- `db_storage`：挂载到 PostgreSQL 的 `/var/lib/postgresql/data`。
- `n8n_storage`：挂载到 n8n 的 `/home/node/.n8n`。
- `n8n_data`：挂载到 n8n 的 `/home/node/data`。

当时镜像为 `postgres:16`、`n8nio/n8n:2.26.8`、`n8nio/runners:2.26.8`。n8n 使用 node 用户，runners 使用 runner 用户。PostgreSQL 健康后启动 n8n；三个服务均使用 always 重启策略及外部网络 ipsec_net。

## 网络与入口

- 当时 ipsec_net 网关为 172.26.39.1，n8n 容器地址为 172.26.39.4。
- 宿主机映射为 172.26.39.1:5443 到容器 443，以及 172.26.39.1:5678 到容器 5678。
- 配置中 N8N_HOST 为 n8n.kobayashiii.cloud，N8N_PORT 为 443，N8N_PROTOCOL 为 https。
- WEBHOOK_URL 和 N8N_EDITOR_BASE_URL 均指向该域名的 HTTPS 地址，N8N_PROXY_HOPS=1。
- 既有 Nginx Proxy Manager 当时仍占用宿主机 80/443。

只读检查没有读取反代配置。端口映射存在不能证明两个端口均有应用监听，也不能证明后端启用 TLS。迁移前必须核对实际 upstream、监听端口、协议和证书终止位置；不得直接将两个映射端口视为等价入口。新环境的网关地址也不能直接假定为 172.26.39.1。

## 数据库与任务执行

n8n 使用 postgresdb，连接 Compose 服务名 postgres 的 5432 端口，数据库名来自 POSTGRES_DB，账号来自 POSTGRES_NON_ROOT_USER/PASSWORD。

初始化脚本包含 CREATE USER 和 GRANT ALL PRIVILEGES ON DATABASE。该记录不证明从空库重建时 schema 权限已充分配置；迁移或首次初始化需另行验证。已有数据库的账号密码也不会因只修改 .env 自动更新。

external runners 通过 http://n8n:5679 连接 Task Broker，两端引用同一 N8N_RUNNERS_AUTH_TOKEN。日志已确认 JavaScript 和 Python runners 注册。配置允许若干 Python 标准库；具体白名单迁移前需读现有配置确认。

## 文件权限与安全设置

- 当时 n8n_storage 和 n8n_data 的目录权限均为 0777，属主 UID 777；这两个 777 的含义不同。
- db_storage 当时属主 UID 999、组 GID 0，权限 0700。
- 宽松的 0777 是历史实测配置，不是推荐的通用权限要求；应按镜像实际 UID/GID 分配最小写权限。
- 数据位于宿主机 /root 下不要求容器以 root 运行；最终检查已经确认 n8n 以 node 运行。
- 当时启用配置文件权限检查、环境变量访问限制、filesystem 二进制模式、业务文件访问范围限制。
- NODES_EXCLUDE=[] 放开节点排除限制，复刻前应评估 ExecuteCommand 等节点的用途。

## 文档与复刻边界

Notion 页面 ID：`38b77475-6a34-81f8-8639-d9f2f7468893`。2026-06-26 已创建说明书并补充 .env 参数规则。本档案不包含真实密码、token 或加密密钥。

原说明书有已知不足：权限解释、端口与 TLS 的推断、数据库 schema 授权未验证，以及固定示例密码/token 不应复用。当前仅补录本地档案，未修改 Notion。该页面和本档案都不能替代空环境完整复刻验证。

迁移需保留数据库及 n8n_storage 中与凭据解密有关的配置，不能只复制业务文件或重新生成加密密钥。备份应位于受保护位置，不能提交明文敏感内容。
