const { execFileSync } = require('child_process');

const workflowId = 'EacMagRAHMF43N0B';
const openAiCredentialId = '72U13pD36OuC7M9T';
const openAiCredentialName = 'OpenAI account';

const jsonSchemaExample = JSON.stringify({
  isAiRelated: true,
  category: 'AI Agent',
  tags: ['agent', 'tool-calling'],
  ai_summary: 'Short summary grounded in repository evidence.',
  highlight: 'Key evidence such as stars, language, updates, or README signals.',
  status: 'reviewed',
});

const userPrompt = `={{[
  'Classify this GitHub repository for an AI project discovery table.',
  '',
  'Repository: ' + ($json.project_name ?? ''),
  'URL: ' + ($json.github_url ?? ''),
  'Description: ' + ($json.description ?? ''),
  'Topics: ' + JSON.stringify($json.topics ?? []),
  'Primary language: ' + ($json.language ?? ''),
  'Stars: ' + String($json.stars ?? 0),
  'Updated at: ' + ($json.updated_at ?? ''),
  'Search keyword: ' + ($json.keyword ?? ''),
  'Search alias: ' + ($json.search_alias ?? ''),
  '',
  'README excerpt:',
  ($json.readme_preview ?? '').slice(0, 5000),
].join('\\n')}}`;

const systemMessage = [
  'You classify GitHub repositories for an AI hot-project collection workflow.',
  'Return a structured JSON result only.',
  'Use exactly one category from: AI Agent, RAG / Knowledge Base, Prompt / Skills, AI Coding, AI Workflow, AI UI / Design, Model / Inference, Other AI, Non-AI.',
  'Set isAiRelated to true only when repository evidence clearly supports AI relevance.',
  'Keep tags concise, factual, and evidence-based.',
  'ai_summary should be one short sentence.',
  'highlight should be one short sentence or compact evidence summary.',
  'status must be one of reviewed, collected, skipped.',
  'For weak or unrelated evidence, prefer Non-AI and skipped.',
].join(' ');

const payload = {
  workflowId,
  operations: [
    {
      type: 'removeConnection',
      source: 'Prepare Classification Context',
      target: 'Classify Repository',
    },
    {
      type: 'removeConnection',
      source: 'Classify Repository',
      target: 'Normalize Classification',
    },
    {
      type: 'removeNode',
      nodeName: 'Classify Repository',
    },
    {
      type: 'addNode',
      node: {
        name: 'Classify Repository Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 3.1,
        position: [2032, 448],
        notes:
          '使用 AI Agent 承载分类逻辑，配合 OpenAI Chat Model 与结构化输出解析器返回稳定 JSON，再交给 Normalize Classification 做统一兜底。',
        parameters: {
          promptType: 'define',
          text: userPrompt,
          hasOutputParser: true,
          options: {
            systemMessage,
            maxIterations: 3,
            returnIntermediateSteps: false,
            passthroughBinaryImages: false,
            enableStreaming: false,
            batching: {
              batchSize: 1,
              delayBetweenBatches: 0,
            },
          },
        },
      },
    },
    {
      type: 'addNode',
      node: {
        name: 'Classifier Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        typeVersion: 1.3,
        position: [1840, 656],
        notes: '分类 Agent 使用的 OpenAI Chat Model，沿用已验证可用的 OpenAI account 凭据。',
        parameters: {
          model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-5.4',
          },
          responsesApiEnabled: false,
          options: {
            temperature: 0,
            maxTokens: 500,
            responseFormat: 'json_object',
            timeout: 60000,
            maxRetries: 2,
          },
        },
      },
    },
    {
      type: 'addNode',
      node: {
        name: 'Classifier Output Parser',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        typeVersion: 1.3,
        position: [2224, 656],
        notes: '把 Agent 输出约束为固定 JSON 结构，降低后续 Normalize Classification 的解析不确定性。',
        parameters: {
          schemaType: 'fromJson',
          jsonSchemaExample,
          autoFix: false,
        },
      },
    },
    {
      type: 'setNodeCredential',
      nodeName: 'Classifier Chat Model',
      credentialKey: 'openAiApi',
      credentialId: openAiCredentialId,
      credentialName: openAiCredentialName,
    },
    {
      type: 'setNodeSettings',
      nodeName: 'Classify Repository Agent',
      settings: {
        onError: 'continueRegularOutput',
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 5000,
      },
    },
    {
      type: 'addConnection',
      source: 'Prepare Classification Context',
      target: 'Classify Repository Agent',
    },
    {
      type: 'addConnection',
      source: 'Classify Repository Agent',
      target: 'Normalize Classification',
    },
    {
      type: 'addConnection',
      source: 'Classifier Chat Model',
      target: 'Classify Repository Agent',
      connectionType: 'ai_languageModel',
    },
    {
      type: 'addConnection',
      source: 'Classifier Output Parser',
      target: 'Classify Repository Agent',
      connectionType: 'ai_outputParser',
    },
    {
      type: 'setWorkflowMetadata',
      description:
        '采集 GitHub 热门 AI 项目，读取 README 后通过 AI Agent 分类，再幂等写入 Data Table。',
    },
  ],
};

const output = execFileSync(
  'node',
  ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
  { encoding: 'utf8', cwd: __dirname + '/..' },
);

process.stdout.write(output);
