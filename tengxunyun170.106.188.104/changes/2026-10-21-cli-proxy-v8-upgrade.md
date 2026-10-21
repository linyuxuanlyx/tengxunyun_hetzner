# 2026-10-21：CLIProxyAPI 升级到 v8.0.36

## 变更

- 将镜像从 `eceasy/cli-proxy-api:v7.3.6` 升级到 `eceasy/cli-proxy-api:v8.0.36`。
- 保留 `/root/data/cliproxy` 下的配置、OAuth 认证、日志和插件目录。
- 保留 API Key 与 Management Key，不在本地记录明文。
- 保持端口仅绑定到 Docker/Nginx 内部地址 `172.26.39.1:8317`。

## 验证

- 容器状态：running，重启次数为 0。
- 3 个已有认证条目成功加载。
- `GET /v8/management/config`：HTTP 200。
- `GET /v1/models`：HTTP 200。
- 本次后端 v8 管理接口与模型列表通过服务器内部地址验证均为 200；公网自动检查收到 WAF 人机验证页面，不能将其 HTTP 200 当作应用成功。
- HTTPS 及 HTTP 自动跳转的配置建立于 2026-09-17，本次未再次验证 HTTP 跳转。

## 回滚点

远端目录保留升级前备份：

- `/root/data/cliproxy/compose.yaml.pre-v8-upgrade-*`
- `/root/data/cliproxy/config.yaml.pre-v8-upgrade-*`
