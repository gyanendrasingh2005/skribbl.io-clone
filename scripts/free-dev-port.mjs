#!/usr/bin/env node
/**
 * Frees the dev game server port so `npm run dev` does not fail with EADDRINUSE
 * when a previous tsx/node server was left running.
 */
import { readFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let port = process.env.PORT;

if (!port && existsSync(path.join(root, ".env"))) {
  const env = readFileSync(path.join(root, ".env"), "utf8");
  const m = env.match(/^PORT=(\d+)/m);
  if (m) port = m[1];
}

port = port || "3100";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`Invalid development server port: ${port}`);
}

if (process.platform === "win32") {
  const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[3] !== "LISTENING") continue;
    if (!new RegExp(`:${port}$`).test(columns[1])) continue;
    if (/^\d+$/.test(columns[4])) pids.add(columns[4]);
  }

  for (const pid of pids) {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", `Stop-Process -Id ${pid} -Force`],
      { stdio: "ignore" }
    );
  }
  if (pids.size) console.log(`Freed port ${port} (stopped previous dev server).`);
} else {
  try {
    execFileSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
    console.log(`Freed port ${port} (stopped previous dev server).`);
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}
