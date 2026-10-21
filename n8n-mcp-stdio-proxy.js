#!/usr/bin/env node

const baseUrl = process.env.n8n_lab_url;
const token = process.env.n8n_lab_mcp_token;

if (!baseUrl || !token) {
  process.stderr.write(
    "Missing required environment variables: n8n_lab_url and/or n8n_lab_mcp_token\n",
  );
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/+$/, "")}/mcp-server/http`;

let buffer = Buffer.alloc(0);
let pendingRequests = 0;
let stdinEnded = false;

function writeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.from(
    `Content-Length: ${payload.length}\r\nContent-Type: application/json\r\n\r\n`,
    "utf8",
  );
  process.stdout.write(Buffer.concat([header, payload]));
}

function writeError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

function parseFrames() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.slice(0, headerEnd).toString("utf8");
    const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      process.stderr.write("Received frame without Content-Length header\n");
      process.exit(1);
    }

    const contentLength = Number(contentLengthMatch[1]);
    const frameLength = headerEnd + 4 + contentLength;
    if (buffer.length < frameLength) {
      return;
    }

    const body = buffer.slice(headerEnd + 4, frameLength).toString("utf8");
    buffer = buffer.slice(frameLength);

    let message;
    try {
      message = JSON.parse(body);
    } catch (error) {
      writeError(null, -32700, `Invalid JSON payload: ${error.message}`);
      continue;
    }

    handleMessage(message).catch((error) => {
      writeError(message?.id ?? null, -32000, error.message);
    });
  }
}

function parseSse(text) {
  const blocks = text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const messages = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());

    if (dataLines.length === 0) {
      continue;
    }

    const rawData = dataLines.join("\n");
    try {
      messages.push(JSON.parse(rawData));
    } catch {
      messages.push(rawData);
    }
  }

  return messages;
}

async function forwardToRemote(message) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(message),
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    const remoteMessage = text || `${response.status} ${response.statusText}`;
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: -32000,
        message: `Remote MCP error: ${remoteMessage}`,
      },
    };
  }

  if (contentType.includes("text/event-stream")) {
    const parsed = parseSse(text);
    const rpcResponse = parsed.find(
      (item) => item && typeof item === "object" && "jsonrpc" in item,
    );

    if (rpcResponse) {
      return rpcResponse;
    }

    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: -32000,
        message: "Remote MCP server returned SSE without a JSON-RPC message",
      },
    };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: -32000,
        message: `Unable to parse remote response: ${error.message}`,
      },
    };
  }
}

async function handleMessage(message) {
  pendingRequests += 1;
  try {
    const response = await forwardToRemote(message);

    // Notifications do not require a response, unless the remote endpoint returned one explicitly.
    if (message.id === undefined && !response?.id && !response?.result && !response?.error) {
      return;
    }

    writeMessage(response);
  } finally {
    pendingRequests -= 1;
    if (stdinEnded && pendingRequests === 0) {
      process.exit(0);
    }
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  parseFrames();
});

process.stdin.on("end", () => {
  stdinEnded = true;
  if (pendingRequests === 0) {
    process.exit(0);
  }
});
