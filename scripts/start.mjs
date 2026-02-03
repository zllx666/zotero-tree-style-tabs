import { spawn } from "child_process";
import { watch } from "chokidar";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Load environment variables
config({ path: join(rootDir, ".env") });

const ZOTERO_BIN = process.env.ZOTERO_BIN || "/Applications/Zotero.app/Contents/MacOS/zotero";
const ZOTERO_PROFILE = process.env.ZOTERO_PROFILE || "default";

console.log("Starting development server...");
console.log(`Zotero binary: ${ZOTERO_BIN}`);
console.log(`Zotero profile: ${ZOTERO_PROFILE}`);

// Initial build
const buildProcess = spawn("node", [join(__dirname, "build.mjs"), "development"], {
  cwd: rootDir,
  stdio: "inherit",
});

await new Promise((resolve, reject) => {
  buildProcess.on("close", (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`Build failed with code ${code}`));
    }
  });
});

console.log("Initial build complete");

// Watch for changes
const watcher = watch([
  join(rootDir, "src/**/*"),
  join(rootDir, "addon/**/*"),
], {
  ignoreInitial: true,
  ignored: /node_modules/,
});

let rebuilding = false;

watcher.on("all", async (event, path) => {
  if (rebuilding) return;
  rebuilding = true;

  console.log(`\nFile changed: ${path}`);
  console.log("Rebuilding...");

  const rebuildProcess = spawn("node", [join(__dirname, "build.mjs"), "development"], {
    cwd: rootDir,
    stdio: "inherit",
  });

  rebuildProcess.on("close", (code) => {
    if (code === 0) {
      console.log("Rebuild complete. Reload Zotero to see changes.");
    } else {
      console.error("Rebuild failed");
    }
    rebuilding = false;
  });
});

console.log("\nWatching for changes...");
console.log("Press Ctrl+C to stop\n");

// Keep process running
process.on("SIGINT", () => {
  watcher.close();
  console.log("\nStopped watching");
  process.exit(0);
});
