const { execFileSync } = require('child_process');

const workflowId = 'EacMagRAHMF43N0B';

const prepareClassificationContextCode = `const decodeReadme = (content, encoding) => {
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
};`;

const normalizeClassificationCode = `const repo = $('Prepare Classification Context').item.json ?? {};

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
};`;

const classificationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isAiRelated: { type: 'boolean' },
    category: {
      type: 'string',
      enum: [
        'AI Agent',
        'RAG / Knowledge Base',
        'Prompt / Skills',
        'AI Coding',
        'AI Workflow',
        'Model / Inference',
        'Other AI',
        'Non-AI',
      ],
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    ai_summary: { type: 'string' },
    highlight: { type: 'string' },
    status: {
      type: 'string',
      enum: ['reviewed', 'collected', 'skipped'],
    },
  },
  required: ['isAiRelated', 'category', 'tags', 'ai_summary', 'highlight', 'status'],
};

const systemPrompt = [
  'You classify GitHub repositories for an AI project discovery table.',
  'Return only structured data matching the schema.',
  'Base your decision on repository name, description, topics, and README excerpt.',
  'Use exactly one category from: AI Agent, RAG / Knowledge Base, Prompt / Skills, AI Coding, AI Workflow, Model / Inference, Other AI, Non-AI.',
  'Mark tutorial, roadmap, generic resource, or non-AI repositories as Non-AI unless the repository is clearly centered on AI tooling, models, agents, RAG, prompt engineering, MCP, or AI workflows.',
  'Keep ai_summary concise and factual. Keep highlight concise and mention the strongest evidence such as stars, language, update recency, or README focus.',
  'Use status=reviewed for strong/high-signal AI projects, status=collected for normal AI projects, and status=skipped for Non-AI.',
].join(' ');

const userPromptExpression = `={{ [
  'Repository: ' + ($json.project_name ?? ''),
  'URL: ' + ($json.github_url ?? ''),
  'Description: ' + ($json.description ?? ''),
  'Topics: ' + JSON.stringify($json.topics ?? []),
  'Primary language: ' + ($json.language ?? ''),
  'Stars: ' + String($json.stars ?? 0),
  'Updated at: ' + ($json.updated_at ?? ''),
  'Search keyword: ' + ($json.keyword ?? ''),
  'README excerpt:',
  ($json.readme_preview ?? '').slice(0, 5000),
].join('\\n') }}`;

const payload = {
  workflowId,
  operations: [
    {
      type: 'removeConnection',
      source: 'Normalize Repository Context',
      target: 'Classify Repository',
    },
    {
      type: 'removeConnection',
      source: 'Classify Repository',
      target: 'Keep AI Projects',
    },
    {
      type: 'removeNode',
      nodeName: 'Classify Repository',
    },
    {
      type: 'addNode',
      node: {
        name: 'Prepare Classification Context',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [2032, 208],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: prepareClassificationContextCode,
        },
      },
    },
    {
      type: 'addNode',
      node: {
        name: 'Classify Repository',
        type: '@n8n/n8n-nodes-langchain.openAi',
        typeVersion: 2.3,
        position: [2032, 352],
        credentials: {
          openAiApi: {
            id: '72U13pD36OuC7M9T',
            name: 'OpenAI account',
          },
        },
        parameters: {
          resource: 'text',
          operation: 'response',
          modelId: {
            __rl: true,
            mode: 'id',
            value: 'gpt-5-mini',
          },
          responses: {
            values: [
              {
                type: 'text',
                role: 'system',
                content: systemPrompt,
              },
              {
                type: 'text',
                role: 'user',
                content: userPromptExpression,
              },
            ],
          },
          simplify: true,
          options: {
            temperature: 0,
            maxTokens: 500,
            textFormat: {
              textOptions: {
                type: 'json_schema',
                name: 'repo_classification',
                strict: true,
                schema: JSON.stringify(classificationSchema),
              },
            },
          },
        },
      },
    },
    {
      type: 'setNodeSettings',
      nodeName: 'Classify Repository',
      settings: {
        onError: 'continueRegularOutput',
        retryOnFail: true,
        maxTries: 2,
        waitBetweenTries: 1000,
      },
    },
    {
      type: 'addNode',
      node: {
        name: 'Normalize Classification',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [2320, 352],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: normalizeClassificationCode,
        },
      },
    },
    {
      type: 'addConnection',
      source: 'Normalize Repository Context',
      target: 'Prepare Classification Context',
    },
    {
      type: 'addConnection',
      source: 'Prepare Classification Context',
      target: 'Classify Repository',
    },
    {
      type: 'addConnection',
      source: 'Classify Repository',
      target: 'Normalize Classification',
    },
    {
      type: 'addConnection',
      source: 'Normalize Classification',
      target: 'Keep AI Projects',
    },
  ],
};

const output = execFileSync(
  'node',
  ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
  { encoding: 'utf8', cwd: __dirname + '/..' },
);

process.stdout.write(output);
