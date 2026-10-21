const { execFileSync } = require('child_process');

const workflowId = 'EacMagRAHMF43N0B';

const githubCredential = {
  id: 'BN0Imv1ugtlo81b5',
  name: 'Unnamed credential',
};

const openAiCredential = {
  id: '72U13pD36OuC7M9T',
  name: 'OpenAI account',
};

const nodes = [
  {
    name: 'Search GitHub Repositories',
    node: {
      id: 'e4ccbee7-b1de-4196-be5c-de8634a5c2e9',
      name: 'Search GitHub Repositories',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.4,
      position: [832, 352],
      credentials: {
        httpBasicAuth: githubCredential,
      },
      notes: '按当天轮换关键词调用 GitHub Search API，拉取近 90 天活跃且 stars >= 50 的候选仓库。使用 GitHub 凭据模式。',
      parameters: {
        url: 'https://api.github.com/search/repositories',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBasicAuth',
        sendQuery: true,
        queryParameters: {
          parameters: [
            { name: 'q', value: '={{ $json.query }}' },
            { name: 'sort', value: 'stars' },
            { name: 'order', value: 'desc' },
            { name: 'per_page', value: '={{ $json.per_page }}' },
          ],
        },
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Accept', value: 'application/vnd.github+json' },
            { name: 'X-GitHub-Api-Version', value: '2022-11-28' },
            { name: 'User-Agent', value: 'n8n-github-ai-collector' },
          ],
        },
        options: {
          batching: {
            batch: {
              batchSize: 1,
              batchInterval: 1200,
            },
          },
          timeout: 30000,
        },
      },
    },
  },
  {
    name: 'Fetch Repository Readme',
    node: {
      id: 'f7479fe7-aab3-4ccf-b900-0bfed51e3f7c',
      name: 'Fetch Repository Readme',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.4,
      position: [1424, 352],
      credentials: {
        httpBasicAuth: githubCredential,
      },
      notes: '按 owner/repo 拉取 README 原文，供后续 AI 分类与摘要使用。保持 neverError，避免缺少 README 时中断流程。',
      parameters: {
        url: '=https://api.github.com/repos/{{ $json.owner }}/{{ $json.repo }}/readme',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBasicAuth',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Accept', value: 'application/vnd.github+json' },
            { name: 'X-GitHub-Api-Version', value: '2022-11-28' },
            { name: 'User-Agent', value: 'n8n-github-ai-collector' },
          ],
        },
        options: {
          batching: {
            batch: {
              batchSize: 1,
              batchInterval: 1200,
            },
          },
          response: {
            response: {
              fullResponse: true,
              neverError: true,
              responseFormat: 'json',
            },
          },
          timeout: 30000,
        },
      },
    },
  },
  {
    name: 'Prepare Classification Context',
    node: {
      id: '67f9afbb-2ff2-4514-8e78-996bd0fd05d2',
      name: 'Prepare Classification Context',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2032, 208],
      notes: '把 README 从 base64 解码并截断成预览文本，减少后续模型输入体积，同时保留关键上下文。',
      parameters: {
        mode: 'runOnceForEachItem',
        jsCode: `const decodeReadme = (content, encoding) => {
  if (!content) return '';
  if (encoding === 'base64') {
    try {
      return Buffer.from(content, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }
  return String(content);
};

const repo = $json ?? {};
const readmePreview = decodeReadme(repo.readme_content, repo.readme_encoding)
  .replace(/\\0/g, '')
  .slice(0, 6000);

return {
  json: {
    ...repo,
    readme_preview: readmePreview,
  },
};`,
      },
    },
  },
  {
    name: 'Classify Repository',
    node: {
      id: '40d403c6-16c2-4ded-819f-ba46f85ada9a',
      name: 'Classify Repository',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1.1,
      position: [2032, 496],
      credentials: {
        openAiApi: openAiCredential,
      },
      notes: '调用 OpenAI `gpt-5.4` 识别仓库是否属于 AI 项目并生成结构化分类结果。节点报错时继续往下游流转，由兜底规则补齐。',
      parameters: {
        resource: 'chat',
        chatModel: 'gpt-5.4',
        options: {
          maxTokens: 500,
          temperature: 0,
        },
        requestOptions: {},
      },
    },
    settings: {
      onError: 'continueRegularOutput',
      retryOnFail: true,
      maxTries: 2,
      waitBetweenTries: 1000,
    },
  },
  {
    name: 'Normalize Classification',
    node: {
      id: '6b7d7389-da8a-4fe2-b970-9bb9a69b2ee2',
      name: 'Normalize Classification',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2320, 80],
      notes: '优先解析模型输出的 JSON；如果模型失败、超时或输出不规范，则回退到本地启发式分类，并统一表字段。',
      parameters: {
        mode: 'runOnceForEachItem',
        jsCode: `const repo = $('Prepare Classification Context').item.json ?? {};

const requiredKeys = ['isAiRelated', 'category', 'tags', 'ai_summary', 'highlight', 'status'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const looksLikeClassification = (value) => isObject(value) && requiredKeys.every((key) => key in value);

const parseJsonString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directParsers = [
    () => JSON.parse(trimmed),
    () => {
      const match = trimmed.match(/\\{[\\s\\S]*\\}/);
      return match ? JSON.parse(match[0]) : null;
    },
  ];

  for (const parser of directParsers) {
    try {
      const parsed = parser();
      if (parsed !== null && parsed !== undefined) return parsed;
    } catch {}
  }

  return null;
};

const findClassification = (value, depth = 0) => {
  if (depth > 6 || value === null || value === undefined) return null;
  if (looksLikeClassification(value)) return value;

  if (typeof value === 'string') {
    const parsed = parseJsonString(value);
    return parsed ? findClassification(parsed, depth + 1) : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findClassification(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (isObject(value)) {
    const priorityKeys = ['output', 'data', 'result', 'response', 'message', 'content', 'text'];
    for (const key of priorityKeys) {
      if (key in value) {
        const found = findClassification(value[key], depth + 1);
        if (found) return found;
      }
    }
    for (const nested of Object.values(value)) {
      const found = findClassification(nested, depth + 1);
      if (found) return found;
    }
  }

  return null;
};

const heuristicClassification = () => {
  const corpus = [
    repo.project_name,
    repo.description,
    repo.readme_preview,
    ...(repo.topics ?? []),
    repo.keyword ?? '',
  ].join('\\n').toLowerCase();

  const contains = (pattern) => pattern.test(corpus);
  const unique = (values) => Array.from(new Set(values.filter(Boolean)));

  const categories = [
    {
      name: 'AI Agent',
      tags: ['agent', 'assistant', 'tool-calling'],
      patterns: [/\\bai agent\\b/, /\\bllm agent\\b/, /\\bagentic\\b/, /\\bmulti-agent\\b/, /\\btool calling\\b/, /\\bautonomous agent\\b/, /\\bagents sdk\\b/],
    },
    {
      name: 'RAG / Knowledge Base',
      tags: ['rag', 'retrieval', 'knowledge-base'],
      patterns: [/\\brag\\b/, /\\bretrieval augmented generation\\b/, /\\bembedding(s)?\\b/, /\\bvector database\\b/, /\\bknowledge base\\b/, /\\bsemantic search\\b/],
    },
    {
      name: 'Prompt / Skills',
      tags: ['prompt', 'skills', 'mcp'],
      patterns: [/\\bprompt(s)?\\b/, /\\bmodel context protocol\\b/, /\\bmcp\\b/, /\\bskill(s)?\\b/, /\\bsystem prompt\\b/],
    },
    {
      name: 'AI Coding',
      tags: ['coding', 'copilot', 'developer-tools'],
      patterns: [/\\bcopilot\\b/, /\\bcoding assistant\\b/, /\\bcode generation\\b/, /\\bai coding\\b/, /\\bcode completion\\b/],
    },
    {
      name: 'AI Workflow',
      tags: ['workflow', 'automation', 'orchestration'],
      patterns: [/\\bai workflow\\b/, /\\blanggraph\\b/, /\\bn8n\\b/, /\\borchestration\\b/, /\\bworkflow automation\\b/],
    },
    {
      name: 'Model / Inference',
      tags: ['model', 'inference', 'deployment'],
      patterns: [/\\binference\\b/, /\\bmodel serving\\b/, /\\bvllm\\b/, /\\bollama\\b/, /\\bllama\\.cpp\\b/, /\\btransformers?\\b/],
    },
  ];

  const strongSignals = [
    { tag: 'llm', pattern: /\\bllm(s)?\\b/ },
    { tag: 'gpt', pattern: /\\bgpt[- ]?\\d*\\b/ },
    { tag: 'generative-ai', pattern: /\\bgenerative ai\\b/ },
    { tag: 'genai', pattern: /\\bgenai\\b/ },
    { tag: 'ai-agent', pattern: /\\bai agent\\b/ },
    { tag: 'rag', pattern: /\\brag\\b/ },
    { tag: 'prompt-engineering', pattern: /\\bprompt engineering\\b/ },
    { tag: 'mcp', pattern: /\\bmodel context protocol\\b/ },
    { tag: 'mcp', pattern: /\\bmcp\\b/ },
    { tag: 'ai-coding', pattern: /\\bai coding\\b/ },
    { tag: 'copilot', pattern: /\\bcopilot\\b/ },
    { tag: 'model-serving', pattern: /\\bmodel serving\\b/ },
    { tag: 'vllm', pattern: /\\bvllm\\b/ },
    { tag: 'ollama', pattern: /\\bollama\\b/ },
  ].filter((signal) => contains(signal.pattern));

  const weakSignals = [
    /\\bai\\b/,
    /\\binference\\b/,
    /\\btransformers?\\b/,
    /\\bembedding(s)?\\b/,
    /\\bvector database\\b/,
  ].filter((pattern) => contains(pattern));

  const denySignals = {
    hard: [/\\bbuild your own\\b/, /\\bdeveloper roadmap\\b/, /\\broadmap(s)?\\b/, /\\btutorial(s)?\\b/, /\\blearning path\\b/].some((pattern) => contains(pattern)),
    soft: [/\\bawesome[- ]/i, /\\bcurated list\\b/, /\\binterview questions\\b/].some((pattern) => contains(pattern)),
  };

  const matchedCategory = categories.find((entry) => entry.patterns.some((pattern) => contains(pattern))) ?? null;
  const hasTopicAiSignal = (repo.topics ?? []).some((topic) => /(ai|llm|rag|mcp|copilot|agent|genai)/i.test(String(topic)));
  const hasStrongAiEvidence = strongSignals.length > 0 || hasTopicAiSignal;
  const shouldOverrideSoftDeny = strongSignals.length >= 2 || (strongSignals.length >= 1 && hasTopicAiSignal);

  const isAiRelated = !denySignals.hard
    && !(!shouldOverrideSoftDeny && denySignals.soft && !hasStrongAiEvidence)
    && (strongSignals.length > 0 || (Boolean(matchedCategory) && (weakSignals.length > 0 || hasTopicAiSignal)));

  const tags = isAiRelated
    ? unique([
        ...(matchedCategory?.tags ?? []),
        ...strongSignals.map((signal) => signal.tag),
        hasTopicAiSignal ? 'topic-match' : '',
      ]).slice(0, 6)
    : [];

  const category = matchedCategory?.name ?? (isAiRelated ? 'Other AI' : 'Non-AI');
  const summarySource = repo.description || repo.readme_preview.split('\\n').find((line) => line.trim()) || repo.project_name || '';

  return {
    isAiRelated,
    category,
    tags,
    ai_summary: isAiRelated
      ? \`\${repo.project_name} is a \${category} project focused on \${summarySource.slice(0, 120)}\`
      : \`\${repo.project_name} appears weakly related to AI and should be reviewed manually\`,
    highlight: '',
    status: isAiRelated ? (Number(repo.stars ?? 0) >= 500 ? 'reviewed' : 'collected') : 'skipped',
  };
};

const raw = findClassification($json) ?? heuristicClassification();

const allowedCategories = new Set([
  'AI Agent',
  'RAG / Knowledge Base',
  'Prompt / Skills',
  'AI Coding',
  'AI Workflow',
  'Model / Inference',
  'Other AI',
  'Non-AI',
]);

const normalizeTags = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const fallbackHighlight = [];
if (repo.stars) fallbackHighlight.push(\`\${repo.stars} stars\`);
if (repo.language) fallbackHighlight.push(\`primary language: \${repo.language}\`);
if (repo.updated_at) fallbackHighlight.push(\`recently updated: \${String(repo.updated_at).slice(0, 10)}\`);
if (repo.readme_preview) fallbackHighlight.push('README analyzed');

const isAiRelated = Boolean(raw.isAiRelated);
const category = allowedCategories.has(String(raw.category)) ? String(raw.category) : (isAiRelated ? 'Other AI' : 'Non-AI');
const tags = normalizeTags(raw.tags).slice(0, 8);
const aiSummary = String(raw.ai_summary || '').trim() || heuristicClassification().ai_summary;
const highlight = String(raw.highlight || '').trim() || fallbackHighlight.join(' | ');
const normalizedStatus = ['reviewed', 'collected', 'skipped'].includes(String(raw.status))
  ? String(raw.status)
  : (isAiRelated ? (Number(repo.stars ?? 0) >= 500 ? 'reviewed' : 'collected') : 'skipped');

return {
  json: {
    project_name: repo.project_name,
    github_url: repo.github_url,
    description: repo.description,
    category,
    tags: tags.join(', '),
    stars: repo.stars,
    language: repo.language,
    updated_at: String(repo.updated_at).slice(0, 10),
    ai_summary: aiSummary.slice(0, 240),
    highlight: highlight.slice(0, 240),
    status: normalizedStatus,
    last_checked_at: String(repo.fetchedAt).slice(0, 10),
    keyword: repo.keyword ?? '',
    isAiRelated,
  },
};`,
      },
    },
  },
  {
    name: 'Upsert To Data Table',
    node: {
      id: '1208dbf8-dcc3-4f34-acf4-5324974f2a74',
      name: 'Upsert To Data Table',
      type: 'n8n-nodes-base.dataTable',
      typeVersion: 1.1,
      position: [2624, 352],
      notes: '按 github_url 做幂等 upsert，持续更新项目分类、标签、摘要、状态和最后检查时间到 Data Table。',
      parameters: {
        operation: 'upsert',
        dataTableId: {
          __rl: true,
          mode: 'id',
          value: 'eBUC3YqG8cCt2cYF',
        },
        matchType: 'allConditions',
        filters: {
          conditions: [
            {
              keyName: 'github_url',
              keyValue: '={{ $json.github_url }}',
            },
          ],
        },
        columns: {
          mappingMode: 'defineBelow',
          value: {
            project_name: '={{ $json.project_name }}',
            github_url: '={{ $json.github_url }}',
            description: '={{ $json.description }}',
            category: '={{ $json.category }}',
            tags: '={{ $json.tags }}',
            stars: '={{ $json.stars }}',
            language: '={{ $json.language }}',
            updated_at: '={{ $json.updated_at }}',
            ai_summary: '={{ $json.ai_summary }}',
            highlight: '={{ $json.highlight }}',
            status: '={{ $json.status }}',
            last_checked_at: '={{ $json.last_checked_at }}',
          },
          matchingColumns: [],
          schema: [
            { id: 'project_name', displayName: 'project_name', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'github_url', displayName: 'github_url', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'description', displayName: 'description', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'category', displayName: 'category', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'tags', displayName: 'tags', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'stars', displayName: 'stars', required: false, defaultMatch: false, display: true, type: 'number', readOnly: false, removed: false },
            { id: 'language', displayName: 'language', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'updated_at', displayName: 'updated_at', required: false, defaultMatch: false, display: true, type: 'dateTime', readOnly: false, removed: false },
            { id: 'ai_summary', displayName: 'ai_summary', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'highlight', displayName: 'highlight', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'status', displayName: 'status', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false },
            { id: 'last_checked_at', displayName: 'last_checked_at', required: false, defaultMatch: false, display: true, type: 'dateTime', readOnly: false, removed: false },
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
        options: {},
      },
    },
  },
];

const connections = [
  ['Build Search Queries', 'Search GitHub Repositories'],
  ['Search GitHub Repositories', 'Extract Repositories'],
  ['Extract Repositories', 'Fetch Repository Readme'],
  ['Fetch Repository Readme', 'Normalize Repository Context'],
  ['Normalize Repository Context', 'Prepare Classification Context'],
  ['Prepare Classification Context', 'Classify Repository'],
  ['Classify Repository', 'Normalize Classification'],
  ['Normalize Classification', 'Keep AI Projects'],
  ['Keep AI Projects', 'Upsert To Data Table'],
];

const operations = [];

for (const { name } of nodes) {
  operations.push({ type: 'removeNode', nodeName: name });
}

for (const { node } of nodes) {
  operations.push({ type: 'addNode', node });
}

for (const [source, target] of connections) {
  operations.push({ type: 'addConnection', source, target });
}

for (const { name, settings } of nodes) {
  if (!settings) {
    continue;
  }

  operations.push({
    type: 'setNodeSettings',
    nodeName: name,
    settings,
  });
}

const payload = { workflowId, operations };

if (require.main === module) {
  const output = execFileSync(
    'node',
    ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
    { encoding: 'utf8', cwd: __dirname + '/..' },
  );

  process.stdout.write(output);
}

module.exports = { payload };
