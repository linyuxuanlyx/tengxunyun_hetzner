import { workflow, trigger, node, expr } from '@n8n/workflow-sdk';

const manualStart = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Start',
    position: [240, 220],
  },
  output: [{ json: {} }],
});

const dailySchedule = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Daily Schedule',
    position: [240, 460],
    parameters: {
      rule: {
        interval: [
          {
            field: 'days',
            daysInterval: 1,
            triggerAtHour: 9,
            triggerAtMinute: 0,
          },
        ],
      },
    },
  },
  output: [{ json: {} }],
});

const buildSearchQueries = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Search Queries',
    position: [520, 340],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const profiles = [
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
}];`,
    },
  },
  output: [
    {
      keyword: 'ai',
      search_alias: 'generative-ai',
      per_page: 20,
      fetchedAt: '2026-06-29T08:00:00.000Z',
      minDate: '2026-03-31',
      query: '"generative ai" in:name,description,readme fork:false archived:false pushed:>=2026-03-31 stars:>=50 -awesome -tutorial -tutorials -roadmap -interview',
    },
  ],
});

const searchGitHubRepositories = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Search GitHub Repositories',
    position: [820, 340],
    parameters: {
      method: 'GET',
      url: 'https://api.github.com/search/repositories',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          {
            name: 'q',
            value: expr('{{ $json.query }}'),
          },
          {
            name: 'sort',
            value: 'stars',
          },
          {
            name: 'order',
            value: 'desc',
          },
          {
            name: 'per_page',
            value: expr('{{ $json.per_page }}'),
          },
        ],
      },
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          {
            name: 'Accept',
            value: 'application/vnd.github+json',
          },
          {
            name: 'X-GitHub-Api-Version',
            value: '2022-11-28',
          },
          {
            name: 'User-Agent',
            value: 'n8n-github-ai-collector',
          },
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
  output: [
    {
      total_count: 1,
      items: [
        {
          full_name: 'openai/openai-cookbook',
          html_url: 'https://github.com/openai/openai-cookbook',
          description: 'Examples and guides for building with AI.',
          stargazers_count: 1000,
          language: 'Python',
          pushed_at: '2026-06-20T10:00:00Z',
          archived: false,
          fork: false,
          owner: { login: 'openai' },
          name: 'openai-cookbook',
          topics: ['llm', 'ai'],
        },
      ],
    },
  ],
});

const extractRepositories = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extract Repositories',
    position: [1120, 340],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const seen = new Set();
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

return rows;`,
    },
  },
  output: [
    {
      project_name: 'openai/openai-cookbook',
      github_url: 'https://github.com/openai/openai-cookbook',
      description: 'Examples and guides for building with AI.',
      stars: 1000,
      language: 'Python',
      updated_at: '2026-06-20T10:00:00Z',
      owner: 'openai',
      repo: 'openai-cookbook',
      topics: ['llm', 'ai'],
      keyword: 'ai',
      search_alias: 'generative-ai',
      fetchedAt: '2026-06-29T08:00:00.000Z',
    },
  ],
});

const fetchRepositoryReadme = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Repository Readme',
    position: [1420, 340],
    parameters: {
      method: 'GET',
      url: expr('https://api.github.com/repos/{{ $json.owner }}/{{ $json.repo }}/readme'),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          {
            name: 'Accept',
            value: 'application/vnd.github+json',
          },
          {
            name: 'X-GitHub-Api-Version',
            value: '2022-11-28',
          },
          {
            name: 'User-Agent',
            value: 'n8n-github-ai-collector',
          },
        ],
      },
      options: {
        response: {
          response: {
            fullResponse: true,
            neverError: true,
            responseFormat: 'json',
          },
        },
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
  output: [
    {
      statusCode: 200,
      body: {
        content: 'IyBFeGFtcGxlIFJFQURNRQ==',
        encoding: 'base64',
      },
    },
  ],
});

const normalizeRepositoryContext = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Repository Context',
    position: [1720, 340],
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          {
            id: 'project-name',
            name: 'project_name',
            value: expr('{{ $("Extract Repositories").item.json.project_name }}'),
            type: 'string',
          },
          {
            id: 'github-url',
            name: 'github_url',
            value: expr('{{ $("Extract Repositories").item.json.github_url }}'),
            type: 'string',
          },
          {
            id: 'description',
            name: 'description',
            value: expr('{{ $("Extract Repositories").item.json.description }}'),
            type: 'string',
          },
          {
            id: 'stars',
            name: 'stars',
            value: expr('{{ $("Extract Repositories").item.json.stars }}'),
            type: 'number',
          },
          {
            id: 'language',
            name: 'language',
            value: expr('{{ $("Extract Repositories").item.json.language }}'),
            type: 'string',
          },
          {
            id: 'updated-at',
            name: 'updated_at',
            value: expr('{{ $("Extract Repositories").item.json.updated_at }}'),
            type: 'string',
          },
          {
            id: 'topics',
            name: 'topics',
            value: expr('{{ $("Extract Repositories").item.json.topics }}'),
            type: 'array',
          },
          {
            id: 'fetched-at',
            name: 'fetchedAt',
            value: expr('{{ $("Extract Repositories").item.json.fetchedAt }}'),
            type: 'string',
          },
          {
            id: 'keyword',
            name: 'keyword',
            value: expr('{{ $("Extract Repositories").item.json.keyword }}'),
            type: 'string',
          },
          {
            id: 'search-alias',
            name: 'search_alias',
            value: expr('{{ $("Extract Repositories").item.json.search_alias }}'),
            type: 'string',
          },
          {
            id: 'readme-content',
            name: 'readme_content',
            value: expr('{{ $json.body?.content ?? "" }}'),
            type: 'string',
          },
          {
            id: 'readme-encoding',
            name: 'readme_encoding',
            value: expr('{{ $json.body?.encoding ?? "" }}'),
            type: 'string',
          },
          {
            id: 'readme-status',
            name: 'readme_status',
            value: expr('{{ $json.statusCode ?? 0 }}'),
            type: 'number',
          },
        ],
      },
    },
  },
  output: [
    {
      project_name: 'openai/openai-cookbook',
      github_url: 'https://github.com/openai/openai-cookbook',
      description: 'Examples and guides for building with AI.',
      stars: 1000,
      language: 'Python',
      updated_at: '2026-06-20T10:00:00Z',
      topics: ['llm', 'ai'],
      fetchedAt: '2026-06-29T08:00:00.000Z',
      keyword: 'ai',
      search_alias: 'generative-ai',
      readme_content: 'IyBFeGFtcGxlIFJFQURNRQ==',
      readme_encoding: 'base64',
      readme_status: 200,
    },
  ],
});

const classifyRepository = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Classify Repository',
    position: [2020, 340],
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const decodeReadme = (content, encoding) => {
  if (!content) {
    return '';
  }

  if (encoding === 'base64') {
    try {
      return Buffer.from(content, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  return String(content);
};

const repo = $json;
const readme = decodeReadme(repo.readme_content, repo.readme_encoding).slice(0, 5000);
const corpus = [repo.project_name, repo.description, readme, ...(repo.topics ?? []), repo.keyword ?? '', repo.search_alias ?? ''].join('\\n').toLowerCase();

const contains = (pattern) => pattern.test(corpus);
const findAll = (signals) => signals.filter((signal) => contains(signal.pattern));
const unique = (values) => Array.from(new Set(values));

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

const strongAiSignals = [
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
];
const weakAiSignals = [
  { tag: 'ai', pattern: /\\bai\\b/ },
  { tag: 'inference', pattern: /\\binference\\b/ },
  { tag: 'transformer', pattern: /\\btransformers?\\b/ },
  { tag: 'embeddings', pattern: /\\bembedding(s)?\\b/ },
  { tag: 'vector-db', pattern: /\\bvector database\\b/ },
  { tag: 'design', pattern: /\\bdesign\\b/ },
  { tag: 'ui', pattern: /\\bui\\b/ },
];
const denySignals = [
  { tag: 'awesome-list', kind: 'soft', pattern: /\\bawesome[- ]/i },
  { tag: 'build-your-own', kind: 'hard', pattern: /\\bbuild your own\\b/ },
  { tag: 'developer-roadmap', kind: 'hard', pattern: /\\bdeveloper roadmap\\b/ },
  { tag: 'roadmap', kind: 'hard', pattern: /\\broadmap(s)?\\b/ },
  { tag: 'tutorial', kind: 'hard', pattern: /\\btutorial(s)?\\b/ },
  { tag: 'curated-list', kind: 'soft', pattern: /\\bcurated list\\b/ },
  { tag: 'learning-path', kind: 'hard', pattern: /\\blearning path\\b/ },
  { tag: 'interview-questions', kind: 'soft', pattern: /\\binterview questions\\b/ },
];

const rawMatchedCategory = categories.find((entry) => entry.patterns.some((pattern) => contains(pattern)));
const strongMatches = findAll(strongAiSignals);
const weakMatches = findAll(weakAiSignals);
const denyMatches = findAll(denySignals);
const hasTopicAiSignal = (repo.topics ?? []).some((topic) => /(ai|llm|rag|mcp|copilot|agent|genai|design|ui|frontend)/i.test(String(topic)));
const hasHardDeny = denyMatches.some((signal) => signal.kind === 'hard');
const hasSoftDeny = denyMatches.some((signal) => signal.kind === 'soft');
const hasStrongAiEvidence = strongMatches.length > 0 || hasTopicAiSignal;
const shouldOverrideSoftDeny = strongMatches.length >= 2 || (strongMatches.length >= 1 && hasTopicAiSignal);
const matchedCategory = hasHardDeny ? null : rawMatchedCategory;
const matchedTags = new Set();

if (hasTopicAiSignal) {
  matchedTags.add('topic-match');
}

for (const tag of matchedCategory?.tags ?? []) {
  matchedTags.add(tag);
}

for (const signal of strongMatches) {
  matchedTags.add(signal.tag);
}

const isAiRelated = !hasHardDeny
  && !(!shouldOverrideSoftDeny && hasSoftDeny && !hasStrongAiEvidence)
  && (strongMatches.length > 0 || (Boolean(matchedCategory) && (weakMatches.length > 0 || hasTopicAiSignal)));
const category = matchedCategory?.name ?? (isAiRelated ? 'Other AI' : 'Non-AI');
const tags = isAiRelated ? unique(Array.from(matchedTags)).slice(0, 6) : [];
const primaryFocus = matchedCategory?.name ?? 'AI project';
const summarySource = repo.description || readme.split('\\n').find((line) => line.trim()) || repo.project_name;
const aiSummary = isAiRelated
  ? \`\${repo.project_name} is a \${primaryFocus} project focused on \${summarySource.slice(0, 120)}\`
  : \`\${repo.project_name} appears weakly related to AI and should be reviewed manually\`;

const highlightParts = [];
if (repo.stars) {
  highlightParts.push(\`\${repo.stars} stars\`);
}
if (repo.language) {
  highlightParts.push(\`primary language: \${repo.language}\`);
}
if (repo.updated_at) {
  highlightParts.push(\`recently updated: \${String(repo.updated_at).slice(0, 10)}\`);
}
if (repo.readme_status === 200 && readme) {
  highlightParts.push('README available');
}

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
    highlight: highlightParts.join(' | ').slice(0, 240),
    status: isAiRelated ? (repo.stars >= 500 ? 'reviewed' : 'collected') : 'skipped',
    last_checked_at: String(repo.fetchedAt).slice(0, 10),
    keyword: repo.keyword ?? '',
    isAiRelated,
  },
};`,
    },
  },
  output: [
    {
      project_name: 'openai/openai-cookbook',
      github_url: 'https://github.com/openai/openai-cookbook',
      description: 'Examples and guides for building with AI.',
      category: 'Prompt / Skills',
      tags: 'prompt, skills, ai, llm',
      stars: 1000,
      language: 'Python',
      updated_at: '2026-06-20',
      ai_summary: 'openai/openai-cookbook is a Prompt / Skills project focused on Examples and guides for building with AI.',
      highlight: '1000 stars | primary language: Python | recently updated: 2026-06-20 | README available',
      status: 'reviewed',
      last_checked_at: '2026-06-29',
      isAiRelated: true,
    },
  ],
});

const keepAiProjects = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Keep AI Projects',
    position: [2320, 340],
    parameters: {
      conditions: {
        combinator: 'and',
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            leftValue: expr('{{ $json.isAiRelated }}'),
            operator: {
              type: 'boolean',
              operation: 'true',
            },
          },
        ],
      },
    },
  },
  output: [
    {
      project_name: 'openai/openai-cookbook',
      github_url: 'https://github.com/openai/openai-cookbook',
      description: 'Examples and guides for building with AI.',
      category: 'Prompt / Skills',
      tags: 'prompt, skills, ai, llm',
      stars: 1000,
      language: 'Python',
      updated_at: '2026-06-20',
      ai_summary: 'openai/openai-cookbook is a Prompt / Skills project focused on Examples and guides for building with AI.',
      highlight: '1000 stars | primary language: Python | recently updated: 2026-06-20 | README available',
      status: 'reviewed',
      last_checked_at: '2026-06-29',
      isAiRelated: true,
    },
  ],
});

const upsertToDataTable = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Upsert To Data Table',
    position: [2620, 340],
    parameters: {
      resource: 'row',
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
            condition: 'eq',
            keyValue: expr('{{ $json.github_url }}'),
          },
        ],
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          project_name: expr('{{ $json.project_name }}'),
          github_url: expr('{{ $json.github_url }}'),
          description: expr('{{ $json.description }}'),
          category: expr('{{ $json.category }}'),
          tags: expr('{{ $json.tags }}'),
          stars: expr('{{ $json.stars }}'),
          language: expr('{{ $json.language }}'),
          updated_at: expr('{{ $json.updated_at }}'),
          ai_summary: expr('{{ $json.ai_summary }}'),
          highlight: expr('{{ $json.highlight }}'),
          status: expr('{{ $json.status }}'),
          last_checked_at: expr('{{ $json.last_checked_at }}'),
        },
      },
    },
  },
  output: [
    {
      id: 1,
      project_name: 'openai/openai-cookbook',
      github_url: 'https://github.com/openai/openai-cookbook',
      status: 'reviewed',
    },
  ],
});

export default workflow('github-ai-hot-projects-v1', 'GitHub AI Hot Projects V1')
  .add(manualStart)
  .to(buildSearchQueries)
  .to(searchGitHubRepositories)
  .to(extractRepositories)
  .to(fetchRepositoryReadme)
  .to(normalizeRepositoryContext)
  .to(classifyRepository)
  .to(keepAiProjects)
  .to(upsertToDataTable)
  .add(dailySchedule)
  .to(buildSearchQueries);
