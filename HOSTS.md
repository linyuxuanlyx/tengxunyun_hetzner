# 主机档案索引

用户指定的 Git 远端：`git@github.com:linyuxuanlyx/tengxunyun_hetzner.git`。
2026-10-21 本地检查：当前目录不是 Git 工作区，尚未核实或建立实际 remote 绑定。

按目标主机选择目录，避免把不同服务器的脚本、备份和变更记录混在一起。

| 主机 | 地址 | 档案目录 | 状态 |
|---|---|---|---|
| 腾讯云 | `170.106.188.104` | `tengxunyun170.106.188.104/` | 已建立，包含 CLIProxyAPI 与 n8n 历史操作记录 |
| Hetzner | `46.225.223.166` | `hetzner46.225.223.166/` | 已建立，待首次核验 |

后续规则：远端文件备份放入对应主机的 `backups/`，服务资料放入 `deployments/<service>/`，一次操作记录放入 `changes/YYYY-MM-DD-<topic>.md`。

工作区自动遵循的具体规则见 `AGENTS.md`。清单是有日期的快照，操作前应核验实时状态。根目录原有 n8n 项目暂保留原位。
