# GitHub AI 热门项目自动采集与分类

当前目录沉淀的是第一版 n8n 工作流的脚本化交付物与对齐文档，目标是跑通：

`GitHub 采集 -> README 提取 -> AI 分类摘要 -> Data Table 幂等写入`

## 当前远端状态

- 远端工作流：`GitHub AI Hot Projects V1`
- Workflow ID：`EacMagRAHMF43N0B`
- Data Table：`github_ai_projects`
- Data Table ID：`eBUC3YqG8cCt2cYF`
- 当前分类链路：`AI Agent + OpenAI Chat Model + Structured Output Parser + Normalize Classification`
- 当前远端描述：`采集 GitHub 热门 AI 项目，读取 README 后通过 AI Agent 分类，再幂等写入 Data Table。`
- 当前已确认远端节点包含：
  - `Classify Repository Agent`
  - `Classifier Chat Model`
  - `Classifier Output Parser`
  - `Sticky - AI Classify`

## 与需求文档对齐情况

### 已符合

- `Manual Start` + `Daily Schedule` 双入口存在。
- GitHub 搜索方向保持需求原始 10 个业务方向：
  - `AI`
  - `LLM`
  - `Agent`
  - `RAG`
  - `Prompt`
  - `Skills`
  - `MCP`
  - `Copilot`
  - `AI Workflow`
  - `AI Coding`
- 运行时允许映射 GitHub 搜索别名词，但最终仍回收到需求口径字段。
- 搜索结果按 `stars desc` 获取，每次抓取 `20` 个候选项目。
- 已过滤 `fork`、`archived`，并限制最近 `90` 天更新。
- 会读取 README，并仅以截断后的 README 参与分类，不保存完整 README。
- AI 输出覆盖：
  - `isAiRelated`
  - `category`
  - `tags`
  - `ai_summary`
  - `highlight`
  - `status`
- Data Table 按 `github_url` 做 upsert，满足去重与更新要求。
- 第一版未接 Notion，仍以 Data Table 为主存储，符合范围约束。
- 分类集合包含需求要求的 8 个对外类别，并保留内部兜底类 `Non-AI`。

### 当前实现的增强项

- `Normalize Classification` 在模型失败、超时、输出不规范时，会回退到启发式分类，保证流程不中断。
- sticky note 已按功能区拆分：
  - `Sticky - Triggers`
  - `Sticky - GitHub Collect`
  - `Sticky - AI Classify`
  - `Sticky - Data Table`
- `Classify Repository Agent` 使用结构化输出解析器，避免“自由文本难解析”的问题。

### 仍需注意

- 当前 README 只记录“现状有效状态”；历史上旧版 OpenAI 节点、直连 HTTP 兼容方案仍保留在 `scripts/` 中，仅作为排障脚本，不代表当前生产链路。
- 真实模型可用性仍依赖 n8n 中的 `OpenAI account` 凭据配置；工作流结构已对齐，但外部模型服务稳定性仍需要以每次实跑结果为准。

## 最近校验

- `executionId=35`
  - 时间：`2026-06-30T10:10:54.122Z` 到 `2026-06-30T10:13:28.628Z`
  - 结果：`success`
  - 结论：`Classify Repository Agent`、`Classifier Chat Model`、`Classifier Output Parser` 均成功跑通，结构化结果进入 `Normalize Classification`，最终完成写表。

## 脚本说明

- `scripts/align-demand-remote.js`
  - 按需求文档对齐远端主流程与字段口径。
- `scripts/patch-remote-workflow.js`
  - 早期远端工作流补丁脚本。
- `scripts/add-node-notes-remote.js`
  - 给关键节点与 sticky note 添加说明。
- `scripts/swap-classifier-to-ai-agent.js`
  - 将旧分类节点切换为 `AI Agent` 架构。
- `scripts/swap-classifier-to-direct-http-openai.js`
  - 排障脚本，用于在特定情况下切换到 `HTTP Request` 直连兼容接口。

## 验收结论

按当前已核验的远端工作流结构与最近一次成功执行结果看，第一版主目标已经满足：

`GitHub 采集 -> AI 分类摘要 -> Data Table 存储`

后续如果要继续增强，优先级建议是：

1. 持续观察 `OpenAI account` 的稳定性。
2. 增加更多执行样本，验证不同关键词轮转下的分类质量。
3. 等 Data Table 数据稳定后，再接入 Notion 展示层。
