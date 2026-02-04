import { spawn } from "child_process";
import { watch } from "chokidar";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Load environment variables
config({ path: join(rootDir, ".env") });

// Auto-detect Zotero binary path if not set
function getDefaultZoteroBin() {
  if (process.platform === "darwin") {
    return "/Applications/Zotero.app/Contents/MacOS/zotero";
  }
  if (process.platform === "win32") {
    return "C:\\Program Files (x86)\\Zotero\\zotero.exe";
  }
  // Linux - try common locations
  return "/usr/bin/zotero";
}

const ZOTERO_BIN = process.env.ZOTERO_BIN || getDefaultZoteroBin();
const ZOTERO_PROFILE = process.env.ZOTERO_PROFILE;

console.log("Starting development server...");
console.log(`Platform: ${process.platform}`);
console.log(`Zotero binary: ${ZOTERO_BIN}`);
console.log(`Zotero profile: ${ZOTERO_PROFILE || "(auto)"}`);

// Check if Zotero binary exists
if (!existsSync(ZOTERO_BIN)) {
  console.error("\n❌ Zotero binary not found at:", ZOTERO_BIN);
  console.error("\nPlease create a .env file with the correct path:");
  console.error("  cp .env.example .env");
  console.error("\nThen edit .env and set ZOTERO_BIN to your Zotero installation:");
  if (process.platform === "darwin") {
    console.error("  macOS: /Applications/Zotero.app/Contents/MacOS/zotero");
  } else if (process.platform === "win32") {
    console.error("  Windows: C:\\Program Files (x86)\\Zotero\\zotero.exe");
    console.error("       or: C:\\Program Files\\Zotero\\zotero.exe");
  } else {
    console.error("  Linux: /usr/bin/zotero or /usr/local/bin/zotero");
  }
  process.exit(1);
}

const PROFILES_INI_PATH = getProfilesIniPath();

async function getZoteroProfileArgs(profileName) {
  const profiles = await readProfilesIni(PROFILES_INI_PATH);
  if (profileName) {
    const match = profiles.find((profile) => profile.name === profileName);
    if (match?.path) {
      return {
        args: ["-profile", match.path],
        label: `profile ${profileName}`,
        profilePath: match.path,
      };
    }

    if (profileName.toLowerCase() === "default") {
      const defaultProfile = profiles.find((profile) => profile.isDefault);
      if (defaultProfile?.path) {
        return {
          args: ["-profile", defaultProfile.path],
          label: `default profile (${defaultProfile.name || "unnamed"})`,
          profilePath: defaultProfile.path,
        };
      }
    }

    return { args: ["-P", profileName], label: `profile ${profileName}`, profilePath: null };
  }

  const defaultProfile = profiles.find((profile) => profile.isDefault);
  if (defaultProfile?.path) {
    return {
      args: ["-profile", defaultProfile.path],
      label: `default profile (${defaultProfile.name || "unnamed"})`,
      profilePath: defaultProfile.path,
    };
  }

  return { args: [], label: "default profile", profilePath: null };
}

function getProfilesIniPath() {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Zotero", "profiles.ini");
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appData, "Zotero", "profiles.ini");
  }

  return join(homedir(), ".zotero", "zotero", "profiles.ini");
}

async function readProfilesIni(profilesIniPath) {
  if (!profilesIniPath || !existsSync(profilesIniPath)) {
    return [];
  }

  const contents = await readFile(profilesIniPath, "utf-8");
  const profilesRoot = dirname(profilesIniPath);
  const profiles = [];
  let current = null;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[")) {
      if (current) {
        profiles.push(current);
      }
      current = {
        name: "",
        path: "",
        isRelative: false,
        isDefault: false,
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim();

    switch (key) {
      case "Name":
        current.name = value;
        break;
      case "Path":
        current.path = value;
        break;
      case "IsRelative":
        current.isRelative = value === "1";
        break;
      case "Default":
        current.isDefault = value === "1";
        break;
      default:
        break;
    }
  }

  if (current) {
    profiles.push(current);
  }

  return profiles
    .filter((profile) => profile.path)
    .map((profile) => ({
      ...profile,
      path: profile.isRelative ? join(profilesRoot, profile.path) : profile.path,
    }));
}

async function installAddonToProfile(profilePath, devXpiPath, addonID) {
  if (!profilePath || !addonID) {
    return;
  }

  const extensionsDir = join(profilePath, "extensions");
  await mkdir(extensionsDir, { recursive: true });
  const targetPath = join(extensionsDir, `${addonID}.xpi`);
  await copyFile(devXpiPath, targetPath);
  console.log(`Copied dev XPI to ${targetPath}`);
}

async function ensureAddonEnabled(profilePath, addonID) {
  const extensionsJsonPath = join(profilePath, "extensions.json");

  if (!existsSync(extensionsJsonPath)) {
    return;
  }

  try {
    const raw = await readFile(extensionsJsonPath, "utf-8");
    const data = JSON.parse(raw);
    const addons = Array.isArray(data.addons) ? data.addons : [];
    let updated = false;

    for (const addon of addons) {
      if (!addon) continue;

      if (addon.foreignInstall) {
        addon.foreignInstall = false;
        addon.installTelemetryInfo = null;
        updated = true;
      }

      if (addon.id === addonID) {
        if (addon.userDisabled || addon.softDisabled || !addon.seen) {
          addon.userDisabled = false;
          addon.softDisabled = false;
          addon.seen = true;
          updated = true;
        }
      }
    }

    if (updated) {
      await writeExtensionsJson(extensionsJsonPath, data);
      console.log(`Updated extensions.json to approve add-ons (including ${addonID})`);
    }
  } catch (error) {
    console.warn("Failed to update extensions.json:", error);
  }
}

async function writeExtensionsJson(filePath, data) {
  const json = JSON.stringify(data);
  await rm(filePath, { force: true });
  await new Promise((resolve) => setTimeout(resolve, 50));
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, json);
}

async function ensureAddonPrefs(profilePath) {
  const userJsPath = join(profilePath, "user.js");
  const prefs = {
    "extensions.autoDisableScopes": 0,
    "extensions.startupScanScopes": 15,
    "extensions.zotero.debug.store": true,
  };

  let contents = "";
  if (existsSync(userJsPath)) {
    contents = await readFile(userJsPath, "utf-8");
  }

  let updated = contents;
  for (const [key, value] of Object.entries(prefs)) {
    const line = `user_pref("${key}", ${value});`;
    const regex = new RegExp(`user_pref\\(\"${key}\\",[^\n]*\\);`);
    if (regex.test(updated)) {
      updated = updated.replace(regex, line);
    } else {
      updated += (updated.trim().length ? "\n" : "") + line;
    }
  }

  if (updated !== contents) {
    await writeFile(userJsPath, `${updated.trim()}\n`);
    console.log(`Updated ${userJsPath} with addon prefs`);
  }
}

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

const pkg = JSON.parse(await readFile(join(rootDir, "package.json"), "utf-8"));
const devXpiName = `${pkg.config.addonRef}-dev.xpi`;
const devXpiPath = join(rootDir, devXpiName);

try {
  await access(devXpiPath);
} catch (error) {
  console.error(`Dev XPI missing at ${devXpiPath}. Make sure the build succeeded.`);
  process.exit(1);
}

const installArgs = ["-install-addon", devXpiPath];

const profileArgs = await getZoteroProfileArgs(ZOTERO_PROFILE);
if (profileArgs.args.length > 0) {
  installArgs.push(...profileArgs.args);
}

if (profileArgs.profilePath) {
  await installAddonToProfile(profileArgs.profilePath, devXpiPath, pkg.config.addonID);
  await ensureAddonEnabled(profileArgs.profilePath, pkg.config.addonID);
  await ensureAddonPrefs(profileArgs.profilePath);
}

console.log(`Launching Zotero with the dev addon installed (${profileArgs.label})...`);
const zoteroProcess = spawn(ZOTERO_BIN, installArgs, { stdio: "inherit" });

zoteroProcess.on("close", (code) => {
  if (code !== 0) {
    console.error(`Zotero exited with code ${code}`);
  }
});

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
