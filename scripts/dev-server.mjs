#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let port = process.env.PORT;

if (!port && existsSync(path.join(root, ".env"))) {
  const env = readFileSync(path.join(root, ".env"), "utf8");
  const match = env.match(/^\s*PORT\s*=\s*["']?(\d+)["']?\s*$/m);
  if (match) port = match[1];
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run this script through `npm run dev:server` so npm can be located.");
  process.exit(1);
}

port = port || "3100";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`Invalid development server port: ${port}`);
}

const server = spawn(
  process.execPath,
  [npmCli, "run", "dev", "--workspace=server"],
  { stdio: "inherit", env: { ...process.env, PORT: port } }
);

server.on("error", (error) => {
  console.error("Could not start the game server:", error);
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
