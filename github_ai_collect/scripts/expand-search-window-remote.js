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

const windowSize = 3;
const perPage = 8;
const minDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const fetchedAt = new Date().toISOString();
const executionSeed = Number($execution?.id ?? Date.now());
const startIndex = Math.abs(executionSeed) % profiles.length;

return Array.from({ length: windowSize }, (_, offset) => {
  const profile = profiles[(startIndex + offset) % profiles.length];
  const query = profile.queryTerm
    + ' in:' + profile.searchIn
    + ' fork:false archived:false pushed:>=' + minDate
    + ' stars:>=50 '
    + profile.exclusions.join(' ');

  return {
    json: {
      keyword: profile.keyword,
      search_alias: profile.alias,
      per_page: perPage,
      fetchedAt,
      minDate,
      query,
      query_window_size: windowSize,
      query_start_index: startIndex,
    },
  };
});`;

const payload = {
  workflowId,
  operations: [
   {
      type: 'updateNodeParameters',
      nodeName: 'Build Search Queries',
      parameters: {
        jsCode: buildSearchQueriesCode,
      },
    },
    {
      type: 'setNodeParameter',
      nodeName: 'Sticky - Triggers',
      path: '/content',
      value: '## 运行入口\\n- `Manual Start`：手动调试\\n- `Daily Schedule`：每日定时触发\\n- `Build Search Queries`：按执行轮换一组关键词窗口并生成 GitHub 搜索条件',
    },
    {
      type: 'setNodeParameter',
      nodeName: 'Sticky - GitHub Collect',
      path: '/content',
      value: '## GitHub 采集区\\n- `Search GitHub Repositories`：按多关键词窗口搜索仓库\\n- `Extract Repositories`：跨关键词提取并去重候选项目\\n- `Fetch Repository Readme`：拉取 README\\n- `Normalize Repository Context`：整理统一字段',
    },
  ],
};

const output = execFileSync(
  'node',
  ['../n8n-mcp-client.js', 'tools/call', 'update_workflow', JSON.stringify(payload)],
  { encoding: 'utf8', cwd: __dirname + '/..' },
);

process.stdout.write(output);
