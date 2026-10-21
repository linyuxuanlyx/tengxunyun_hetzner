# CLIProxyAPI

- 远端目录：`/root/data/cliproxy`
- Compose 文件：`/root/data/cliproxy/compose.yaml`
- 配置文件：`/root/data/cliproxy/config.yaml`
- 认证目录：`/root/data/cliproxy/auths`
- 日志目录：`/root/data/cliproxy/logs`
- 插件目录：`/root/data/cliproxy/plugins`
- 镜像：`eceasy/cli-proxy-api:v8.0.36`
- 反向代理：Nginx Proxy Manager 主机配置 ID `3`

## 验证命令

```bash
docker compose -f /root/data/cliproxy/compose.yaml ps
curl -H 'Authorization: Bearer <API_KEY>' https://cli.kobayashiii.cloud/v1/models
curl -H 'Authorization: Bearer <MANAGEMENT_KEY>' https://cli.kobayashiii.cloud/v8/management/config
```

密钥不写入本目录；使用时从密码管理器或用户提供的安全渠道取得。
