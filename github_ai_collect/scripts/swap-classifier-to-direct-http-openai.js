const { execFileSync } = require('child_process');

const workflowId = 'EacMagRAHMF43N0B';
const openAiBaseUrl = 'http://192.168.50.170:3000/v1/chat/completions';
const openAiCredentialId = '72U13pD36OuC7M9T';
const openAiCredentialName = 'OpenAI account';

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
        name: 'Classify Repository',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.4,
        position: [2032, 352],
        notes: '通过 HTTP Request 直连 OpenAI 兼容接口，绕过当前 n8n OpenAI 凭据/节点的模型路由异常。',
        parameters: {
          method: 'POST',
          url: openAiBaseUrl,
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'openAiApi',
          sendHeaders: true,
          specifyHeaders: 'keypair',
          headerParameters: {
            parameters: [
              {
                name: 'Content-Type',
                value: 'application/json',
              },
            ],
          },
          sendBody: true,
          contentType: 'json',
          specifyBody: 'json',
          jsonBody: `={{
({
  model: 'gpt-5.4',
  temperature: 0,
  max_tokens: 500,
  response_format: { type: 'json_object' },
  messages: [
    {
      role: 'system',
      content: 'You classify GitHub repositories for an AI project discovery table. Return JSON only with keys isAiRelated, category, tags, ai_summary, highlight, status. Use exactly one category from AI Agent, RAG / Knowledge Base, Prompt / Skills, AI Coding, AI Workflow, AI UI / Design, Model / Inference, Other AI, Non-AI. Status must be reviewed, collected, or skipped. Keep tags concise and grounded in repository evidence.',
    },
    {
      role: 'user',
      content: [
        'Repository: ' + ($json.project_name ?? ''),
        'URL: ' + ($json.github_url ?? ''),
        'Description: ' + ($json.description ?? ''),
        'Topics: ' + JSON.stringify($json.topics ?? []),
        'Primary language: ' + ($json.language ?? ''),
        'Stars: ' + String($json.stars ?? 0),
        'Updated at: ' + ($json.updated_at ?? ''),
        'Search keyword: ' + ($json.keyword ?? ''),
        'Search alias: ' + ($json.search_alias ?? ''),
        'README excerpt:',
        ($json.readme_preview ?? '').slice(0, 5000),
      ].join('\\n'),
    },
  ],
})
}}`,
          options: {
            response: {
              response: {
                neverError: true,
                responseFormat: 'json',
              },
            },
            timeout: 60000,
          },
        },
      },
    },
    {
      type: 'setNodeCredential',
      nodeName: 'Classify Repository',
      credentialKey: 'openAiApi',
      credentialId: openAiCredentialId,
      credentialName: openAiCredentialName,
    },
    {
      type: 'setNodeSettings',
      nodeName: 'Classify Repository',
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
      target: 'Classify Repository',
    },
    {
      type: 'addConnection',
      source: 'Classify Repository',
      target: 'Normalize Classification',
    },
  ],
};

const output = execFileSync(
  'node',
  ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
  { encoding: 'utf8', cwd: __dirname + '/..' },
);

process.stdout.write(output);
