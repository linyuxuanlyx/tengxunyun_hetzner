# 2026-09-17：CLIProxyAPI 初始部署（根据本任务历史补录）

补录日期：2026-10-21。以下来自本任务先前执行结果，本次没有重新登录服务器核验。

- 用户从腾讯云控制台核对 SSH ED25519 指纹后，更新本机 known_hosts；原记录备份为 `~/.ssh/known_hosts.pre-cliproxy-20260917`。
- 本机 SSH 公钥由用户添加到远端 root 的 authorized_keys，随后成功连接。
- 服务器当时为 Ubuntu 24.04.4 LTS、x86_64，Docker 29.5.3、Compose v5.1.4。
- 在 `/root/data/cliproxy` 部署 `eceasy/cli-proxy-api:v7.3.6`，挂载 config.yaml、auths、logs、plugins；自动重启策略为 unless-stopped。
- 用户下载的 linux/amd64 二进制包 SHA-256 与官方 Release 匹配；Docker 部署未使用该压缩包。
- 沿用已有 `cli.kobayashiii.cloud` 代理和通配符证书，将 Nginx Proxy Manager proxy host ID 3 指向 `172.26.39.1:8317`，开启强制 HTTPS。
- 后端端口由公网绑定改为 `172.26.39.1:8317`。启用独立管理密钥，API Key 与管理密钥用途分离。
- 启用管理密钥期间配置尾部出现 NUL 字节，容器短暂重启循环；使用已生成的 bcrypt 哈希重写完整配置后恢复。尾部 NUL 原因未通过源码确认，不视为已经证实的上游缺陷。

当时验证：HTTP 301 到 HTTPS、管理页面 200、管理接口无密钥 401/正确密钥 200、模型列表 200，公网 IP:8317 无法直连。模型列表当时为空，未配置上游账号。

远端当时保留的回滚文件：

- `/root/data/cliproxy/compose.yaml.pre-management-20260917`
- `/root/data/cliproxy/config.yaml.pre-management-20260917`
- `/root/data/npm2026_codex/data/nginx/proxy_host/3.conf.pre-cliproxy-20260917`
- `/root/data/npm2026_codex/data/database.sqlite.pre-cliproxy-20260917`
