import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
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
  run("npm", ["install", "--no-audit", "--no-fund"], { cwd: arcadeSource });
  run("npm", ["run", "build", "--", "--base=./"], { cwd: arcadeSource });

  const arcadeOutput = join(output, "arcade");
  await mkdir(arcadeOutput, { recursive: true });
  await cp(arcadeDist, arcadeOutput, { recursive: true });

  console.log("PlayVerse static files copied to dist/.");
  console.log("GH-Arcade production build copied to dist/arcade/.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
