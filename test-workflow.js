import { workflow, node, trigger } from '@n8n/workflow-sdk';

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Start',
    output: [{ json: {} }],
  },
});

const markTestRun = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Mark Test Run',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          {
            id: 'test-status',
            name: 'testStatus',
            value: 'created-by-codex',
            type: 'string',
          },
        ],
      },
    },
    output: [{ json: { testStatus: 'created-by-codex' } }],
  },
});

export default workflow('codex-test-workflow', 'Codex Test Workflow')
  .add(startTrigger)
  .to(markTestRun);
