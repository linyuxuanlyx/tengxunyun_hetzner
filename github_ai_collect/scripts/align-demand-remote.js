const { execFileSync } = require('child_process');

const workflowId = 'EacMagRAHMF43N0B';

const buildSearchQueriesCode = `const profiles = [
  { keyword: 'ai', alias: 'generative-ai', queryTerm: '"generative ai"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
  { keyword: 'llm', alias: 'llm', queryTerm: '"llm"', searchIn: 'name,description', exclusions: ['-awesome', '-roadmap', '-interview'] },
  { keyword: 'agent', alias: 'ai-agent', queryTerm: '"ai agent"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
  { keyword: 'rag', alias: 'rag', queryTerm: '"rag"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
  { keyword: 'prompt', alias: 'prompt-engineering', queryTerm: '"prompt engineering"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-roadmap', '-interview'] },
  { keyword: 'skills', alias: 'skills', queryTerm: '"skills"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
  { keyword: 'mcp', alias: 'mcp', queryTerm: '"model context protocol"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-roadmap', '-interview'] },
  { keyword: 'copilot', alias: 'copilot', queryTerm: '"copilot"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-roadmap', '-interview'] },
  { keyword: 'ai-workflow', alias: 'ai-workflow', queryTerm: '"ai workflow"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
  { keyword: 'ai-coding', alias: 'ai-coding', queryTerm: '"ai coding"', searchIn: 'name,description,readme', exclusions: ['-awesome', '-tutorial', '-tutorials', '-roadmap', '-interview'] },
];
const perPage = 20;
const minDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const fetchedAt = new Date().toISOString();
const profileIndex = new Date().getUTCDate() % profiles.length;
const profile = profiles[profileIndex];
const query = profile.queryTerm + ' in:' + profile.searchIn + ' fork:false archived:false pushed:>=' + minDate + ' stars:>=50 ' + profile.exclusions.join(' ');

return [{
  json: {
    keyword: profile.keyword,
    search_alias: profile.alias,
    per_page: perPage,
    fetchedAt,
    minDate,
    query,
  },
}];`;

const extractRepositoriesCode = `const seen = new Set();
const rows = [];
const source = $('Build Search Queries').first().json ?? {};

for (const item of items) {
  const payload = item.json ?? {};
  for (const repo of payload.items ?? []) {
    if (!repo || repo.fork || repo.archived || !repo.html_url) {
      continue;
    }

    if (seen.has(repo.html_url)) {
      continue;
    }

    seen.add(repo.html_url);
    rows.push({
      json: {
        project_name: repo.full_name ?? repo.name ?? '',
        github_url: repo.html_url,
        description: repo.description ?? '',
        stars: repo.stargazers_count ?? 0,
        language: repo.language ?? '',
        updated_at: repo.pushed_at ?? repo.updated_at ?? '',
        owner: repo.owner?.login ?? '',
        repo: repo.name ?? '',
        topics: repo.topics ?? [],
        keyword: source.keyword ?? '',
        search_alias: source.search_alias ?? '',
        fetchedAt: source.fetchedAt ?? new Date().toISOString(),
      },
    });
  }
}

return rows;`;

const normalizeRepositoryContextParameters = {
  assignments: {
    assignments: [
      { id: 'project-name', name: 'project_name', value: '={{ $("Extract Repositories").item.json.project_name }}', type: 'string' },
      { id: 'github-url', name: 'github_url', value: '={{ $("Extract Repositories").item.json.github_url }}', type: 'string' },
      { id: 'description', name: 'description', value: '={{ $("Extract Repositories").item.json.description }}', type: 'string' },
      { id: 'stars', name: 'stars', value: '={{ $("Extract Repositories").item.json.stars }}', type: 'number' },
      { id: 'language', name: 'language', value: '={{ $("Extract Repositories").item.json.language }}', type: 'string' },
      { id: 'updated-at', name: 'updated_at', value: '={{ $("Extract Repositories").item.json.updated_at }}', type: 'string' },
      { id: 'topics', name: 'topics', value: '={{ $("Extract Repositories").item.json.topics }}', type: 'array' },
      { id: 'fetched-at', name: 'fetchedAt', value: '={{ $("Extract Repositories").item.json.fetchedAt }}', type: 'string' },
      { id: 'keyword', name: 'keyword', value: '={{ $("Extract Repositories").item.json.keyword }}', type: 'string' },
      { id: 'search-alias', name: 'search_alias', value: '={{ $("Extract Repositories").item.json.search_alias }}', type: 'string' },
      { id: 'readme-content', name: 'readme_content', value: '={{ $json.body?.content ?? "" }}', type: 'string' },
      { id: 'readme-encoding', name: 'readme_encoding', value: '={{ $json.body?.encoding ?? "" }}', type: 'string' },
      { id: 'readme-status', name: 'readme_status', value: '={{ $json.statusCode ?? 0 }}', type: 'number' },
    ],
  },
  options: {},
};

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
    repo.search_alias ?? '',
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
      name: 'AI UI / Design',
      tags: ['ui', 'design', 'frontend'],
      patterns: [/\\bai ui\\b/, /\\bchat ui\\b/, /\\bui generator\\b/, /\\bui builder\\b/, /\\bdesign assistant\\b/, /\\bgenerative design\\b/, /\\bdesign tool\\b/, /\\bdesign system\\b/, /\\bfrontend ai\\b/],
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
    { tag: 'skills', pattern: /\\bskills\\b/ },
    { tag: 'mcp', pattern: /\\bmodel context protocol\\b/ },
    { tag: 'mcp', pattern: /\\bmcp\\b/ },
    { tag: 'ai-coding', pattern: /\\bai coding\\b/ },
    { tag: 'copilot', pattern: /\\bcopilot\\b/ },
    { tag: 'ai-ui', pattern: /\\bai ui\\b/ },
    { tag: 'design', pattern: /\\bgenerative design\\b/ },
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
    /\\bdesign\\b/,
    /\\bui\\b/,
  ].filter((pattern) => contains(pattern));

  const denySignals = {
    hard: [/\\bbuild your own\\b/, /\\bdeveloper roadmap\\b/, /\\broadmap(s)?\\b/, /\\btutorial(s)?\\b/, /\\blearning path\\b/].some((pattern) => contains(pattern)),
    soft: [/\\bawesome[- ]/i, /\\bcurated list\\b/, /\\binterview questions\\b/].some((pattern) => contains(pattern)),
  };

  const matchedCategory = categories.find((entry) => entry.patterns.some((pattern) => contains(pattern))) ?? null;
  const hasTopicAiSignal = (repo.topics ?? []).some((topic) => /(ai|llm|rag|mcp|copilot|agent|genai|design|ui|frontend)/i.test(String(topic)));
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
  'AI UI / Design',
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

const payload = {
  workflowId,
  operations: [
    {
      type: 'updateNodeParameters',
      nodeName: 'Build Search Queries',
      replace: true,
      parameters: {
        jsCode: buildSearchQueriesCode,
      },
    },
    {
      type: 'updateNodeParameters',
      nodeName: 'Extract Repositories',
      replace: true,
      parameters: {
        jsCode: extractRepositoriesCode,
      },
    },
    {
      type: 'updateNodeParameters',
      nodeName: 'Normalize Repository Context',
      replace: true,
      parameters: normalizeRepositoryContextParameters,
    },
    {
      type: 'updateNodeParameters',
      nodeName: 'Normalize Classification',
      replace: true,
      parameters: {
        mode: 'runOnceForEachItem',
        jsCode: normalizeClassificationCode,
      },
    },
  ],
};

if (require.main === module) {
  const output = execFileSync(
    'node',
    ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
    { encoding: 'utf8', cwd: __dirname + '/..' },
  );

  process.stdout.write(output);
}

module.exports = { payload };
