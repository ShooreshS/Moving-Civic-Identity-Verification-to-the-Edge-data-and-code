#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestName = "MANIFEST.sha256";
const ignoredNames = new Set([".git", "node_modules", ".DS_Store"]);
const hashFile = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fail = (message) => { throw new Error(message); };

function safePath(path) {
  const relative = path.startsWith("./") ? path.slice(2) : path;
  if (!relative || /[\\:\x00-\x1f\x7f]/.test(relative)
      || relative.split("/").some((part) => !part || part === "." || part === "..")) {
    fail(`Unsafe package path: ${JSON.stringify(path)}`);
  }
  return relative;
}

function excluded(relative) {
  return relative === manifestName
    || relative.split("/").some((part) => ignoredNames.has(part));
}

export function sensitiveName(relative) {
  return relative.split("/").some((part) => {
    const name = part.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    return name.startsWith(".env") || /(^|[._ -])env($|[._ -])/.test(name)
      || /\.(?:key|pem|p12|pfx|pcap|pcapng|cap|har)$/.test(name)
      || /(^|[._ -])(?:keys?|keypairs?|private|secrets?|captures?|raw(?:[._ -]?(?:data|exports?|sessions?|votes?|ballots?|logs?))?)($|[._ -])/.test(name)
      || /(^|[._ -])id_(?:rsa|dsa|ecdsa|ed25519)($|[._ -])/.test(name);
  });
}

function packageFiles(root, rejectSensitive = false) {
  const absoluteRoot = resolve(root);
  const rootInfo = lstatSync(absoluteRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    fail("Package root must be a directory, not a symlink.");
  }
  const files = [];
  function walk(directory, prefix = "") {
    for (const name of readdirSync(directory).sort()) {
      const relative = safePath(prefix ? `${prefix}/${name}` : name);
      const fullPath = join(directory, name);
      const info = lstatSync(fullPath);
      if (info.isSymbolicLink()) fail(`Symlink is not allowed: ${relative}`);
      if (relative === manifestName && !info.isFile()) fail("Manifest must be a regular file.");
      if (excluded(relative)) continue;
      if (rejectSensitive && sensitiveName(relative)) {
        fail(`Refusing manifest generation: sensitive-looking path ${JSON.stringify(relative)}.`);
      }
      if (info.isDirectory()) walk(fullPath, relative);
      else if (info.isFile()) files.push(relative);
      else fail(`Unsupported file type: ${relative}`);
    }
  }
  walk(absoluteRoot);
  return { absoluteRoot, files: files.sort() };
}

function readManifest(root) {
  const path = join(root, manifestName);
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isFile()) fail("Manifest must be a regular file, not a symlink.");
  const contents = readFileSync(path, "utf8");
  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const entries = new Map();
  for (const [index, line] of lines.entries()) {
    const match = /^([a-fA-F0-9]{64}) [ *](.+)$/.exec(line);
    if (!match) fail(`Malformed manifest entry at line ${index + 1}.`);
    const relative = safePath(match[2]);
    if (excluded(relative)) fail(`Excluded path in manifest: ${relative}`);
    if (entries.has(relative)) fail(`Duplicate manifest entry: ${relative}`);
    entries.set(relative, match[1].toLowerCase());
  }
  return entries;
}

/** Check file coverage and hashes without writing files or contacting a service. */
export function verifyManifest(root) {
  const { absoluteRoot, files } = packageFiles(root);
  const entries = readManifest(absoluteRoot);
  const actualFiles = new Set(files);
  for (const relative of entries.keys()) {
    if (!actualFiles.has(relative)) fail(`Manifest file is missing: ${relative}`);
  }
  for (const relative of files) {
    if (!entries.has(relative)) fail(`File is absent from manifest: ${relative}`);
    if (hashFile(join(absoluteRoot, relative)) !== entries.get(relative)) {
      fail(`Manifest hash mismatch: ${relative}`);
    }
  }
  return { fileCount: files.length };
}

/** Explicitly regenerate the manifest; sensitive-looking filenames stop the write. */
export function writeManifest(root) {
  const { absoluteRoot, files } = packageFiles(root, true);
  const lines = files.map((relative) => `${hashFile(join(absoluteRoot, relative))}  ./${relative}`);
  writeFileSync(join(absoluteRoot, manifestName), lines.length ? `${lines.join("\n")}\n` : "", "utf8");
  return { fileCount: files.length };
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== "--write")) {
      fail("Usage: node scripts/verify-manifest.mjs [--write]");
    }
    const root = fileURLToPath(new URL("..", import.meta.url));
    const writing = args[0] === "--write";
    const { fileCount } = writing ? writeManifest(root) : verifyManifest(root);
    console.log(`Manifest ${writing ? "written" : "verified"}: ${fileCount} package files.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
