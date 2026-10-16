const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const serverRoot = path.join(__dirname, "..");
const repoRoot = path.join(serverRoot, "..");
const clientDist = path.join(repoRoot, "client", "dist");
const publicDir = path.join(serverRoot, "public");
const distPublicDir = path.join(serverRoot, "dist", "public");

execSync("npm run build", { cwd: path.join(repoRoot, "client"), stdio: "inherit" });
execSync("npm run build", { cwd: serverRoot, stdio: "inherit" });

for (const dir of [publicDir, distPublicDir]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(clientDist, dir, { recursive: true });
}

console.log("Copied client build to server/public and server/dist/public");
