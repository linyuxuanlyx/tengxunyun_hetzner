## 1. 项目目标

通过 n8n 自动搜索 GitHub 上热门 AI 相关开源项目，使用 AI 对项目进行简单分类和摘要，并先写入 n8n Data Tables。第一版目标是跑通“采集、过滤、分类、存储”的完整流程，等流程稳定后再接入 Notion 作为展示和知识库管理界面。

## 2. 使用场景

用户希望持续关注 GitHub 上值得学习的 AI 项目，例如 AI Agent、RAG、Prompt、Skills、AI Coding、AI Workflow、AI UI、模型部署等方向。系统自动整理项目，减少人工搜索和记录成本。

## 3. 第一版功能范围

### 3.1 GitHub 项目采集

n8n 定时触发 GitHub 搜索任务。

搜索方向包括：

- AI
- LLM
- Agent
- RAG
- Prompt
- Skills
- MCP
- Copilot
- AI Workflow
- AI Coding

实现时允许为每个方向配置更适合 GitHub 搜索的别名词，例如：

- `AI` 可映射到 `generative ai`
- `Agent` 可映射到 `ai agent`
- `Prompt` 可映射到 `prompt engineering`
- `AI Coding` 可映射到 `ai coding`

但最终仍然要回收到以上业务方向口径，避免采集维度和展示维度脱节。

采集规则：

- 按 Stars 排序；
- 每次获取 20 到 50 个项目；
- 过滤 fork 项目；
- 过滤 archived 项目；
- 优先采集最近 90 天内更新过的项目。

### 3.2 项目信息提取

每个项目只提取基础信息：

- 项目名称
- GitHub 地址
- 项目简介
- Stars 数量
- 主要语言
- 更新时间
- README 摘要

第一版不保存完整源码，也不保存完整 README，避免 Data Tables 数据量过大。

说明：

- README 会被读取并截断后参与分类；
- 第一版不单独新增 `readme_summary` 字段；
- README 相关信息最终体现在 `ai_summary` 和 `highlight` 两个结果字段中。

### 3.3 AI 分类与摘要

AI 根据项目简介和 README 摘要判断项目类型，并输出：

- 是否为 AI 相关项目；
- 项目分类；
- 标签；
- 一句话总结；
- 核心亮点；
- 是否值得后续深入查看。

第一版分类保留以下几类：

- AI Agent
- RAG / Knowledge Base
- Prompt / Skills
- AI Coding
- AI Workflow
- AI UI / Design
- Model / Inference
- Other AI

运行时允许增加一个内部兜底分类 `Non-AI`，用于拦截教程、roadmap、资源导航站等非目标项目，但该分类不属于对外 AI 分类口径。

## 4. n8n Data Tables 设计

第一版使用 n8n Data Tables 作为临时数据库，表名建议为：

`github_ai_projects`

字段如下：

|   |   |
|---|---|
|字段|说明|
|project_name|项目名称|
|github_url|GitHub 仓库地址|
|description|GitHub 简介|
|category|AI 分类|
|tags|AI 标签|
|stars|Star 数|
|language|主要语言|
|updated_at|GitHub 更新时间|
|ai_summary|AI 一句话总结|
|highlight|核心亮点|
|status|collected / reviewed / skipped|
|last_checked_at|最近采集时间|

## 5. n8n 主流程

```
定时触发
 ↓
搜索 GitHub 热门 AI 项目
 ↓
过滤 fork 和 archived 项目
 ↓
读取 README
 ↓
AI 分类和摘要
 ↓
通过 github_url 检查 Data Tables 是否已存在
 ↓
不存在则新增
 ↓
存在则更新 stars、updated_at、ai_summary、last_checked_at
```

## 6. 去重规则

使用 `github_url` 作为唯一标识。

如果 Data Tables 中已经存在该项目，则更新动态字段。

如果不存在，则插入新记录。

## 7. 第一版不做的内容

第一版暂不做：

- Notion 写入；
- 全仓库代码深度分析；
- 保存完整源码；
- 保存完整 README；
- Star 增长趋势；
- License 风险分析；
- 安全扫描；
- 自动周报；
- 复杂评分系统。

## 8. 后续接入 Notion

当 Data Tables 版本稳定后，再增加第二阶段流程：

```
读取 Data Tables 中 status = reviewed 或 collected 的项目
 ↓
转换字段格式
 ↓
写入 Notion 数据库
 ↓
Notion 中做分类视图、收藏视图、值得深入视图
```

Notion 后续主要作为展示层和知识沉淀层，不作为第一版核心存储。

## 9. 验收标准

1. n8n 可以按设定时间自动运行；
2. 系统可以从 GitHub 获取 AI 相关热门项目；
3. 系统可以过滤 fork 和 archived 项目；
4. AI 可以输出分类、标签和一句话总结；
5. 项目信息可以写入 n8n Data Tables；
6. 重复项目不会重复插入；
7. 已存在项目可以更新 Stars 和更新时间；
8. 用户可以在 n8n Data Tables 中查看采集结果。

## 10. 总结

第一版目标是先跑通自动化闭环，而不是直接建设完整知识库。

当前阶段只需要完成：

GitHub 采集 → AI 分类摘要 → Data Tables 存储。

等这个流程稳定后，再接入 Notion 做更好的展示、筛选和知识管理。
