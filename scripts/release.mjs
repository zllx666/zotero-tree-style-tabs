import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Read current version
const pkgPath = join(rootDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

// Parse version
const [major, minor, patch] = pkg.version.split(".").map(Number);

// Determine version bump type from argument
const bumpType = process.argv[2] || "patch";

let newVersion;
switch (bumpType) {
  case "major":
    newVersion = `${major + 1}.0.0`;
    break;
  case "minor":
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case "patch":
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
}

console.log(`Bumping version from ${pkg.version} to ${newVersion}`);

// Update package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Build production
console.log("Building production version...");
execSync("node scripts/build.mjs production", { cwd: rootDir, stdio: "inherit" });

console.log(`\nRelease ${newVersion} ready!`);
console.log(`XPI file: ${pkg.config.addonRef}-${newVersion}.xpi`);
