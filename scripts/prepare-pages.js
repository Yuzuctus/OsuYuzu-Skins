/**
 * Prepares the React Router build output for Cloudflare Pages deployment.
 *
 * Pages Advanced Mode expects a _worker.js directory with an index.js entry
 * that exports a default fetch handler. The React Router build produces
 * a multi-file ESM output in build/server/ — we copy it into
 * build/client/_worker.js/ as a directory.
 */
import {
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const clientDir = resolve(root, "build/client");
const serverDir = resolve(root, "build/server");
const workerDir = resolve(clientDir, "_worker.js");

// 1. Remove any old _worker.js file (from previous builds)
if (existsSync(workerDir)) {
  rmSync(workerDir, { recursive: true, force: true });
}

// 2. Copy entire server build into _worker.js/ directory
mkdirSync(workerDir, { recursive: true });
cpSync(serverDir, workerDir, { recursive: true });

// 3. Create a clean Pages-compatible wrangler.json
const serverConfig = resolve(root, "build/server/wrangler.json");
const clientConfig = resolve(root, "build/client/wrangler.json");
if (existsSync(serverConfig)) {
  const full = JSON.parse(readFileSync(serverConfig, "utf-8"));
  // Only keep Pages-compatible keys
  const pagesConfig = {
    name: full.name,
    compatibility_date: full.compatibility_date,
    compatibility_flags: full.compatibility_flags,
    pages_build_output_dir: "./",
    d1_databases: full.d1_databases,
    r2_buckets: full.r2_buckets,
    vars: full.vars,
  };
  writeFileSync(clientConfig, JSON.stringify(pagesConfig, null, 2));
}

console.log(
  "✅ Pages build prepared — _worker.js + server assets copied to build/client/",
);

// 4. Update deploy config to point to the Pages-compatible config
const deployConfig = resolve(root, ".wrangler/deploy/config.json");
if (existsSync(deployConfig)) {
  writeFileSync(
    deployConfig,
    JSON.stringify({
      configPath: "../../build/client/wrangler.json",
      auxiliaryWorkers: [],
    }),
  );
}
