import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "fs/promises";
import path from "path";
import http from "http";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_FILE = path.resolve(__dirname, "instantdb-mcp-session.json");
const REDIRECT_PORT = 48271;
const REDIRECT_PATH = "/callback";
const REDIRECT_URL = `http://127.0.0.1:${REDIRECT_PORT}${REDIRECT_PATH}`;
const SERVER_ENV_PATH = path.resolve(__dirname, "..", "server", ".env");
const ROOT_ENV_PATH = path.resolve(__dirname, "..", ".env.local");
const SERVER_TSCONFIG_PATH = path.resolve(__dirname, "..", "server", "tsconfig.json");

const ensureDirExists = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const readJsonIfExists = async (filePath) => {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
};

const writeJson = async (filePath, data) => {
  await ensureDirExists(filePath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const parseEnvFile = (text) => {
  const lines = text.split(/\r?\n/);
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    result[key] = value;
  }
  return result;
};

const loadAppIdFromEnv = async () => {
  if (process.env.INSTANT_DB_APP_ID) {
    return process.env.INSTANT_DB_APP_ID;
  }
  for (const candidate of [SERVER_ENV_PATH, ROOT_ENV_PATH]) {
    try {
      const text = await fs.readFile(candidate, "utf8");
      const env = parseEnvFile(text);
      if (env.INSTANT_DB_APP_ID) {
        return env.INSTANT_DB_APP_ID;
      }
      if (env.VITE_INSTANT_DB_APP_ID) {
        return env.VITE_INSTANT_DB_APP_ID;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  throw new Error("INSTANT_DB_APP_ID not found in environment or .env files");
};

const resolveInstantSchema = () => {
  const require = createRequire(__filename);
  if (!process.env.TS_NODE_PROJECT) {
    process.env.TS_NODE_PROJECT = SERVER_TSCONFIG_PATH;
  }
  require("../server/node_modules/ts-node/register");
  const { instantDBSchema } = require("../server/src/types/database.ts");
  return instantDBSchema;
};

const normalizeSchema = (raw) => {
  const parseType = (value) => {
    if (typeof value !== "string") {
      return { type: "json", required: true };
    }
    const optional = value.endsWith("?");
    const base = optional ? value.slice(0, -1) : value;
    const normalized = ["string", "number", "boolean", "date", "json"].includes(base) ? base : "string";
    return { type: normalized, required: !optional };
  };

  const additions = { entities: {}, links: {} };

  if (raw?.entities) {
    for (const [entityName, attrs] of Object.entries(raw.entities)) {
      const normalizedAttrs = {};
      for (const [attrName, definition] of Object.entries(attrs)) {
        normalizedAttrs[attrName] = parseType(definition);
      }
      additions.entities[entityName] = normalizedAttrs;
    }
  }

  if (raw?.links) {
    for (const [linkName, linkDef] of Object.entries(raw.links)) {
      const forward = linkDef.forward ?? linkDef.from ?? {};
      const reverse = linkDef.reverse ?? linkDef.to ?? {};
      additions.links[linkName] = {
        from: {
          entity: forward.on ?? forward.entity,
          label: forward.label,
          has: forward.has,
        },
        to: {
          entity: reverse.on ?? reverse.entity,
          label: reverse.label,
          has: reverse.has,
        },
      };
    }
  }

  return additions;
};

const openInBrowser = (url) => {
  const platform = process.platform;
  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
};

class LocalOAuthProvider {
  constructor(storageFile) {
    this.storageFile = storageFile;
    this.data = { tokens: undefined, client: undefined };
    this.currentState = undefined;
    this.currentVerifier = undefined;
    this.pendingAuth = undefined;
    this.server = undefined;
  }

  async init() {
    this.data = await readJsonIfExists(this.storageFile);
  }

  get redirectUrl() {
    return REDIRECT_URL;
  }

  get clientMetadata() {
    return {
      redirect_uris: [this.redirectUrl],
      response_types: ["code"],
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "client_secret_post",
      client_name: "Mechanic Shop OS MCP CLI",
      scope: "apps-read apps-write"
    };
  }

  async state() {
    this.currentState = crypto.randomBytes(16).toString("hex");
    return this.currentState;
  }

  async clientInformation() {
    return this.data.client;
  }

  async saveClientInformation(info) {
    this.data.client = info;
    await writeJson(this.storageFile, this.data);
  }

  async tokens() {
    const tokens = this.data.tokens;
    if (!tokens) {
      return undefined;
    }
    if (tokens.expires_at && Date.now() >= tokens.expires_at) {
      return undefined;
    }
    return tokens;
  }

  async saveTokens(tokens) {
    const stored = { ...tokens };
    if (tokens.expires_in) {
      stored.expires_at = Date.now() + Math.max(tokens.expires_in - 60, 0) * 1000;
    }
    delete this.data.codeVerifier;
    this.data.tokens = stored;
    await writeJson(this.storageFile, this.data);
  }

  async redirectToAuthorization(authorizationUrl) {
    await this.ensureServer();
    console.log("\nA browser window should open for InstantDB authorization.");
    console.log("If it does not, open this URL manually:\n", authorizationUrl.href, "\n");
    openInBrowser(authorizationUrl.href);
  }

  async saveCodeVerifier(codeVerifier) {
    this.currentVerifier = codeVerifier;
    this.data.codeVerifier = codeVerifier;
    await writeJson(this.storageFile, this.data);
  }

  async codeVerifier() {
    if (this.currentVerifier) {
      return this.currentVerifier;
    }
    if (this.data.codeVerifier) {
      this.currentVerifier = this.data.codeVerifier;
      return this.currentVerifier;
    }
    throw new Error("PKCE code verifier not set");
  }

  async validateResourceURL(serverUrl, resource) {
    if (!resource) {
      return new URL(serverUrl);
    }
    return new URL(resource);
  }

  async invalidateCredentials(scope) {
    if (scope === "all" || scope === "client") {
      delete this.data.client;
    }
    if (scope === "all" || scope === "tokens") {
      delete this.data.tokens;
    }
    if (scope === "all" || scope === "verifier") {
      delete this.data.codeVerifier;
    }
    await writeJson(this.storageFile, this.data);
  }

  async ensureServer() {
    if (this.server) {
      return;
    }

    this.pendingAuth = new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const requestUrl = new URL(req.url ?? "", this.redirectUrl);
        if (requestUrl.pathname !== REDIRECT_PATH) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing authorization code");
          return;
        }

        if (!state || state !== this.currentState) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("State mismatch. Close this tab and retry.");
          reject(new Error("State mismatch"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body style="font-family: sans-serif; text-align: center; margin-top: 3rem;">
<h1>InstantDB authorization complete</h1>
<p>You can close this tab and return to the CLI.</p>
</body></html>`);

        resolve({ code, state });
        this.currentState = undefined;
        setImmediate(async () => {
          try {
            await new Promise((resolveClose) => server.close(resolveClose));
          } catch (closeError) {
            console.warn("Failed to close local auth server", closeError);
          }
          this.server = undefined;
        });
      });

      server.on("error", (error) => {
        reject(error);
      });

      server.listen(REDIRECT_PORT, "127.0.0.1", () => {
        console.log(`Listening for InstantDB OAuth callback at ${this.redirectUrl}`);
      });

      this.server = server;
    });
  }

  async waitForAuthorizationCode() {
    if (!this.pendingAuth) {
      throw new Error("Authorization was not initiated");
    }
    const result = await this.pendingAuth;
    this.pendingAuth = undefined;
    return result.code;
  }
}

function createTransport(provider) {
  return new StreamableHTTPClientTransport(new URL("https://mcp.instantdb.com/mcp"), {
    authProvider: provider,
  });
}

function createClient() {
  return new Client({
    name: "mechanic-shop-cli",
    version: "0.1.0",
  });
}

async function connectClient() {
  const provider = new LocalOAuthProvider(STORAGE_FILE);
  await provider.init();

  let transport = createTransport(provider);
  let client = createClient();

  while (true) {
    try {
      await client.connect(transport);
      return { client, transport, provider };
    } catch (error) {
      if (error?.message?.includes("Unauthorized")) {
        console.log("Authorization required. Waiting for callback...");
        const authorizationCode = await provider.waitForAuthorizationCode();
        await transport.finishAuth(authorizationCode);
        await client.close().catch(() => {});
        await transport.close().catch(() => {});
        transport = createTransport(provider);
        client = createClient();
        continue;
      }
      throw error;
    }
  }
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({
    name,
    arguments: args,
  });
  return result?.content ?? [];
}

const displayContent = (content) => {
  if (!content.length) {
    return "(empty response)";
  }
  return content
    .map((item) => {
      if (item.type === "text") {
        return item.text;
      }
      if (item.type === "json") {
        return JSON.stringify(item.data, null, 2);
      }
      return JSON.stringify(item);
    })
    .join("\n");
};

async function logToolResult(label, content) {
  console.log(`\n${label}:`);
  console.log(displayContent(content));
}

async function main() {
  try {
    const { client, transport } = await connectClient();

    const tools = await client.listTools();
    console.log("Available tools:");
    for (const tool of tools.tools) {
      console.log(`- ${tool.name}`);
      if (tool.name === "plan-schema-push" || tool.name === "push-schema") {
        if (tool.inputSchema) {
          console.log("  inputSchema:", JSON.stringify(tool.inputSchema, null, 2));
        }
      }
    }

    try {
      const resources = await client.listResources();
      console.log("\nAvailable resources:");
      for (const resource of resources.resources) {
        console.log(`- ${resource.uri}`);
      }
    } catch (error) {
      console.log("\nResource listing not supported on this server (skipping).");
    }

    await logToolResult("All apps", await callTool(client, "get-apps"));

    const appId = await loadAppIdFromEnv();
    await logToolResult(`App details (${appId})`, await callTool(client, "get-app", { appId }));

    const rawSchema = resolveInstantSchema();
    const additions = normalizeSchema(rawSchema);
    console.log("\nSchema additions payload:", JSON.stringify({
      entities: Object.keys(additions.entities),
      links: Object.keys(additions.links),
    }, null, 2));

    await logToolResult("Schema push plan", await callTool(client, "plan-schema-push", { appId, additions }));
    await logToolResult("Schema push result", await callTool(client, "push-schema", { appId, additions }));

    await logToolResult(`Schema (${appId})`, await callTool(client, "get-schema", { appId }));

    await client.close();
    await transport.close();
  } catch (error) {
    console.error("InstantDB MCP inspection failed:", error);
    process.exitCode = 1;
  }
}

main();
