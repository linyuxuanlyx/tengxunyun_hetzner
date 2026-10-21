# n8n MCP Client

This workspace contains a minimal local client for the remote n8n MCP server.

It reads these environment variables:

- `n8n_lab_url`
- `n8n_lab_mcp_token`

Commands:

```bash
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js initialize
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js tools/list
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js tools/call search_workflows '{"limit":10}'
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js search-projects 'Marketing'
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js search-folders '<projectId>' 'Campaigns'
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js search-workflows '{"limit":10,"sortBy":"updatedAt:desc"}'
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js workflow-details '<workflowId>'
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js sdk-reference guidelines
node /Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-client.js rpc resources/list '{}'
```

The script prints structured JSON so it can be reused in later turns when creating or updating workflows in n8n via MCP tools.

For Codex global MCP configuration without storing the token in plaintext, use:

- [n8n-mcp-stdio-proxy.js](/Users/linyuxuan/Documents/codex/tengxunyun/n8n-mcp-stdio-proxy.js)

That proxy speaks MCP over stdio locally and forwards requests to the remote n8n MCP HTTP endpoint using `n8n_lab_url` and `n8n_lab_mcp_token` from the environment.

Relevant live MCP tools confirmed on this n8n instance include:

- `search_projects`
- `search_folders`
- `search_workflows`
- `get_workflow_details`
- `create_workflow_from_code`
- `update_workflow`
- `publish_workflow`
- `unpublish_workflow`
