#!/usr/bin/env node

const baseUrl = process.env.n8n_lab_url;
const token = process.env.n8n_lab_mcp_token;

if (!baseUrl || !token) {
  console.error(
    "Missing required environment variables: n8n_lab_url and/or n8n_lab_mcp_token",
  );
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/+$/, "")}/mcp-server/http`;

function usage() {
  console.error(`Usage:
  node n8n-mcp-client.js initialize
  node n8n-mcp-client.js tools/list
  node n8n-mcp-client.js tools/call <toolName> [jsonArgs]
  node n8n-mcp-client.js search-projects [query]
  node n8n-mcp-client.js search-folders <projectId> [query]
  node n8n-mcp-client.js search-workflows [jsonArgs]
  node n8n-mcp-client.js workflow-details <workflowId>
  node n8n-mcp-client.js sdk-reference [section]
  node n8n-mcp-client.js rpc <method> [jsonParams]
`);
}

function parseJsonArg(raw, fallback) {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Invalid JSON: ${error.message}`);
    process.exit(1);
  }
}

function parseSsePayload(text) {
  const events = [];
  const blocks = text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const dataLines = [];
    let event = "message";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    const rawData = dataLines.join("\n");
    try {
      events.push({ event, data: JSON.parse(rawData) });
    } catch {
      events.push({ event, data: rawData });
    }
  }

  return events;
}

async function rpc(method, params = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!response.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: rawText,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if (contentType.includes("text/event-stream")) {
    const events = parseSsePayload(rawText);
    const messageEvent = events.find((entry) => entry.event === "message");
    console.log(
      JSON.stringify(
        {
          ok: true,
          status: response.status,
          contentType,
          events,
          result: messageEvent?.data?.result ?? null,
          error: messageEvent?.data?.error ?? null,
        },
        null,
        2,
      ),
    );
    return;
  }

  let parsed = rawText;
  try {
    parsed = JSON.parse(rawText);
  } catch {}

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: response.status,
        contentType,
        body: parsed,
      },
      null,
      2,
    ),
  );
}

async function callTool(name, args = {}) {
  await rpc("tools/call", {
    name,
    arguments: args,
  });
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    usage();
    process.exit(1);
  }

  if (command === "initialize") {
    await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "codex-local-client",
        version: "1.0.0",
      },
    });
    return;
  }

  if (command === "tools/list") {
    await rpc("tools/list", {});
    return;
  }

  if (command === "tools/call") {
    const [toolName, rawArgs] = args;
    if (!toolName) {
      usage();
      process.exit(1);
    }

    await callTool(toolName, parseJsonArg(rawArgs, {}));
    return;
  }

  if (command === "search-projects") {
    const [query] = args;
    await callTool("search_projects", query ? { query } : {});
    return;
  }

  if (command === "search-folders") {
    const [projectId, query] = args;
    if (!projectId) {
      usage();
      process.exit(1);
    }

    await callTool("search_folders", query ? { projectId, query } : { projectId });
    return;
  }

  if (command === "search-workflows") {
    const [rawArgs] = args;
    await callTool("search_workflows", parseJsonArg(rawArgs, {}));
    return;
  }

  if (command === "workflow-details") {
    const [workflowId] = args;
    if (!workflowId) {
      usage();
      process.exit(1);
    }

    await callTool("get_workflow_details", { workflowId });
    return;
  }

  if (command === "sdk-reference") {
    const [section] = args;
    await callTool(
      "get_sdk_reference",
      section ? { section } : {},
    );
    return;
  }

  if (command === "rpc") {
    const [method, rawParams] = args;
    if (!method) {
      usage();
      process.exit(1);
    }

    await rpc(method, parseJsonArg(rawParams, {}));
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error.message,
        stack: error.stack,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
