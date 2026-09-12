import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, chmod, mkdir, readFile, rename, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const { config, engines } = JSON.parse(await readFile("package.json", "utf8"));
if (process.versions.node !== engines.node) throw new Error(`Use Node ${engines.node}`);
if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error("This companion is tested and packaged for Linux x64 only.");
const version = config.cosmoVersion;
await mkdir(".bin", { recursive: true });
await mkdir(".cache", { recursive: true });
const binary = `.bin/cosmo-${version}`;
try {
  await access(binary);
} catch {
  const asset = `router-router@${version}-linux-amd64.tar.gz`;
  const url = `https://github.com/wundergraph/cosmo/releases/download/router%40${version}/${encodeURIComponent(asset)}`;
  process.stdout.write(`Downloading Cosmo ${version}\n`);
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) throw new Error(`Router download: HTTP ${response.status}`);
  const archive = ".cache/cosmo.tar.gz";
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
    await exec("tar", ["-xzf", archive, "-C", ".cache", "router"]);
    const hash = createHash("sha256")
      .update(await readFile(".cache/router"))
      .digest("hex");
    if (hash !== config.cosmoSha256)
      throw new Error("Downloaded router SHA256 differs from the recorded binary");
    await chmod(".cache/router", 0o755);
    await rename(".cache/router", binary);
  } finally {
    await rm(archive, { force: true });
    await rm(".cache/router", { force: true });
  }
}
const hash = createHash("sha256")
  .update(await readFile(binary))
  .digest("hex");
if (hash !== config.cosmoSha256)
  throw new Error("Cached router SHA256 differs from the recorded binary");
const result = await exec(binary, ["--version"]);
if (
  !new RegExp(`Version:\\s*v?${version.replaceAll(".", "\\.")}(?:\\s|$)`).test(
    result.stdout + result.stderr,
  )
)
  throw new Error(`Router does not report ${version}`);
process.stdout.write(`Cosmo ${version} ready at ${binary}\n`);
