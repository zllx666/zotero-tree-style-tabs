import { build } from "esbuild";
import { existsSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import compressing from "compressing";
import { replaceInFileSync } from "replace-in-file";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const env = process.argv[2] || "development";
const isProduction = env === "production";

console.log(`Building in ${env} mode...`);

// Read package.json
const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"));
const { config } = pkg;

// Clean build directory
const buildDir = join(rootDir, "build");
if (existsSync(buildDir)) {
  rmSync(buildDir, { recursive: true });
}
mkdirSync(buildDir, { recursive: true });

// Copy addon files
const addonDir = join(rootDir, "addon");
cpSync(addonDir, buildDir, { recursive: true });

// Create scripts directory
const scriptsDir = join(buildDir, "content", "scripts");
if (!existsSync(scriptsDir)) {
  mkdirSync(scriptsDir, { recursive: true });
}

// Build TypeScript with esbuild
await build({
  entryPoints: [join(rootDir, "src", "index.ts")],
  bundle: true,
  outfile: join(scriptsDir, "index.js"),
  format: "iife",
  target: "firefox115",
  minify: isProduction,
  sourcemap: !isProduction,
  define: {
    __env__: JSON.stringify(env),
  },
  external: [],
  // Handle node_modules
  platform: "browser",
});

console.log("TypeScript compiled successfully");

// Replace placeholders in build files
const replacements = {
  __addonName__: config.addonName,
  __addonID__: config.addonID,
  __addonRef__: config.addonRef,
  __addonInstance__: config.addonInstance,
  __version__: pkg.version,
  __author__: pkg.author || "Unknown",
  __homepage__: pkg.homepage || "",
  __updateURL__: pkg.updateURL || "",
};

const files = [
  join(buildDir, "manifest.json"),
  join(buildDir, "bootstrap.js"),
  join(buildDir, "prefs.js"),
  join(scriptsDir, "index.js"),
];

for (const file of files) {
  if (existsSync(file)) {
    for (const [key, value] of Object.entries(replacements)) {
      replaceInFileSync({
        files: file,
        from: new RegExp(key, "g"),
        to: value,
      });
    }
  }
}

console.log("Placeholders replaced");

// Create icons directory with placeholder
const iconsDir = join(buildDir, "content", "icons");
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create a simple SVG icon
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="12" fill="#4a90d9"/>
  <path d="M20 24h12v48H20V24zm20 0h12v48H40V24zm20 16h12v32H60V40z" fill="white"/>
</svg>`;

writeFileSync(join(iconsDir, "favicon.svg"), iconSvg);
writeFileSync(join(iconsDir, "favicon.png"), Buffer.from(iconSvg)); // Placeholder - in real use, convert to PNG
writeFileSync(join(iconsDir, "favicon@0.5x.png"), Buffer.from(iconSvg)); // Placeholder

// Build XPI
if (isProduction) {
  const xpiName = `${config.addonRef}-${pkg.version}.xpi`;
  const xpiPath = join(rootDir, xpiName);
  
  await compressing.zip.compressDir(buildDir, xpiPath);
  console.log(`XPI created: ${xpiName}`);
}

console.log("Build completed successfully!");
