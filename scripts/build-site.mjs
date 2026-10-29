import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = join(root, "dist");
const temp = await mkdtemp(join(tmpdir(), "playverse-arcade-"));
const arcadeSource = join(temp, "GH-Arcade");
const arcadeDist = join(arcadeSource, "dist");

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

try {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  // Preserve the existing static PlayVerse site as-is in the deployment output.
  const excluded = new Set([".git", "node_modules", "dist", "scripts", "package.json", "package-lock.json"]);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.startsWith(".")) continue;
    await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
  }

  // Build the licensed upstream collection as a separate sub-site, without changing its source repo.
  run("git", ["clone", "--depth", "1", "https://github.com/TMHSDigital/GH-Arcade.git", arcadeSource]);

  // The upstream repo targets GitHub Pages at /GH-Arcade/. Align its PWA manifest and app base
  // with PlayVerse's /arcade/ subpath before building; Vite's CLI base alone cannot change BASE.
  const viteConfigPath = join(arcadeSource, "vite.config.ts");
  const viteConfig = await readFile(viteConfigPath, "utf8");
  const upstreamBase = "const BASE = '/GH-Arcade/';";
  if (!viteConfig.includes(upstreamBase)) {
    throw new Error("GH-Arcade vite.config.ts changed: expected base setting was not found; refusing an unsafe build.");
  }
  await writeFile(viteConfigPath, viteConfig.replace(upstreamBase, "const BASE = '/arcade/';"), "utf8");

  run("npm", ["install", "--no-audit", "--no-fund"], { cwd: arcadeSource });
  run("npm", ["run", "build", "--", "--base=/arcade/"], { cwd: arcadeSource });

  const arcadeOutput = join(output, "arcade");
  await mkdir(arcadeOutput, { recursive: true });
  await cp(arcadeDist, arcadeOutput, { recursive: true });

  // Fail the deployment if expected sub-site files or the corrected PWA scope are missing.
  const arcadeIndex = await readFile(join(arcadeOutput, "index.html"), "utf8");
  if (!arcadeIndex.includes("/arcade/")) {
    throw new Error("GH-Arcade output does not reference the /arcade/ base path.");
  }
  const manifestPath = join(arcadeOutput, "manifest.webmanifest");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.start_url !== "/arcade/" || manifest.scope !== "/arcade/") {
    throw new Error("GH-Arcade PWA manifest does not use the /arcade/ path.");
  }

  console.log("PlayVerse static files copied to dist/.");
  console.log("GH-Arcade production build copied to dist/arcade/.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
