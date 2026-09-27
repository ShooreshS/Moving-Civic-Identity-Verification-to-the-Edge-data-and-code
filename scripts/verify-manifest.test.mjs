import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifyManifest, writeManifest } from "./verify-manifest.mjs";

const script = fileURLToPath(new URL("./verify-manifest.mjs", import.meta.url));
const digest = (value) => createHash("sha256").update(value).digest("hex");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "civicos manifest test "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (relative, contents = "test data\n") => {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };
  put("README.md", "review data\n");
  return { root, put, manifest: join(root, "MANIFEST.sha256") };
}

test("valid package, sorted output, exclusions, and paths with spaces", (t) => {
  const { root, put, manifest } = fixture(t);
  put("data folder/z.json", '{"n":1}\n');
  put("data folder/a.txt", "a\n");
  put(".git/config");
  put("node_modules/dependency/index.js");
  put(".DS_Store");
  put("nested/.DS_Store");
  assert.deepEqual(writeManifest(root), { fileCount: 3 });
  const contents = readFileSync(manifest, "utf8");
  assert.deepEqual(contents.trimEnd().split("\n").map((line) => line.slice(66)), [
    "./README.md", "./data folder/a.txt", "./data folder/z.json",
  ]);
  assert.deepEqual(verifyManifest(root), { fileCount: 3 });
  writeManifest(root);
  assert.equal(readFileSync(manifest, "utf8"), contents);
});

test("manifest output is compatible with shasum when available", (t) => {
  const { root, put } = fixture(t);
  put("file with spaces.txt");
  writeManifest(root);
  const result = spawnSync("shasum", ["-a", "256", "-c", "MANIFEST.sha256"], { cwd: root, encoding: "utf8" });
  if (result.error?.code === "ENOENT") return t.skip("shasum is not installed");
  assert.equal(result.status, 0, result.stderr);
});

test("rejects tampered files", (t) => {
  const { root, put } = fixture(t);
  writeManifest(root);
  put("README.md", "changed\n");
  assert.throws(() => verifyManifest(root), /hash mismatch/);
});

test("rejects extra files", (t) => {
  const { root, put } = fixture(t);
  writeManifest(root);
  put("extra.txt");
  assert.throws(() => verifyManifest(root), /absent from manifest/);
});

test("rejects missing files", (t) => {
  const { root } = fixture(t);
  writeManifest(root);
  rmSync(join(root, "README.md"));
  assert.throws(() => verifyManifest(root), /file is missing/);
});

test("rejects a missing manifest without creating it", (t) => {
  const { root } = fixture(t);
  assert.throws(() => verifyManifest(root), /ENOENT/);
});

test("rejects duplicate entries including alternate ./ spelling", (t) => {
  const { root, manifest } = fixture(t);
  writeManifest(root);
  const entry = readFileSync(manifest, "utf8");
  writeFileSync(manifest, entry + entry.replace("./README.md", "README.md"));
  assert.throws(() => verifyManifest(root), /Duplicate manifest entry/);
});

test("rejects malformed entries and internal blank lines", (t) => {
  const { root, manifest } = fixture(t);
  for (const contents of ["not a checksum\n", `${"z".repeat(64)}  ./README.md\n`, `${digest("review data\n")} ./README.md\n`, "\n"]) {
    writeFileSync(manifest, contents);
    assert.throws(() => verifyManifest(root), /Malformed manifest entry/);
  }
});

test("rejects unsafe, excluded, and self-referential manifest paths", (t) => {
  const { root, manifest } = fixture(t);
  const paths = ["../outside", "./../outside", "/absolute", "C:/absolute", "folder/../README.md", "folder//file", "folder/./file", "folder\\file", "./MANIFEST.sha256", ".git/config", "node_modules/pkg/file", ".DS_Store"];
  for (const path of paths) {
    writeFileSync(manifest, `${digest("test")}  ${path}\n`);
    assert.throws(() => verifyManifest(root), /Unsafe package path|Excluded path/, path);
  }
});

test("rejects file and directory symlinks for both verification and generation", (t) => {
  const { root, put } = fixture(t);
  writeManifest(root);
  symlinkSync(join(root, "README.md"), join(root, "linked.txt"));
  assert.throws(() => verifyManifest(root), /Symlink/);
  assert.throws(() => writeManifest(root), /Symlink/);
  rmSync(join(root, "linked.txt"));
  put("data/file.txt");
  symlinkSync(join(root, "data"), join(root, "linked-directory"), "dir");
  assert.throws(() => verifyManifest(root), /Symlink/);
  assert.throws(() => writeManifest(root), /Symlink/);
});

test("rejects a symlinked manifest without modifying its target", (t) => {
  const { root, manifest } = fixture(t);
  const target = join(root, "README.md");
  const before = readFileSync(target, "utf8");
  symlinkSync(target, manifest);
  assert.throws(() => verifyManifest(root), /Symlink/);
  assert.throws(() => writeManifest(root), /Symlink/);
  assert.equal(readFileSync(target, "utf8"), before);
});

test("generation refuses sensitive-looking filenames without replacing the manifest", (t) => {
  const { root, put, manifest } = fixture(t);
  writeManifest(root);
  const original = readFileSync(manifest, "utf8");
  for (const path of [".env", ".env.local", ".envrc", "example.env", "signing.key", "keypair.json", "certificate.pem", "bundle.p12", "trace.pcapng", "captures/session.json", "raw-data/rows.json", "private/record.json", "secrets.json", "privateKey.json", "keys.json", "id_rsa"]) {
    put(path, "fixture only");
    assert.throws(() => writeManifest(root), /sensitive-looking path/, path);
    assert.equal(readFileSync(manifest, "utf8"), original);
    rmSync(join(root, path));
    if (path.includes("/")) rmdirSync(dirname(join(root, path)));
  }
});

test("CLI handles spaces, defaults to read-only verification, and requires explicit --write", (t) => {
  const { root, put, manifest } = fixture(t);
  put("scripts/placeholder.txt");
  const copiedScript = join(root, "scripts", "verify-manifest.mjs");
  copyFileSync(script, copiedScript);
  const missing = spawnSync(process.execPath, [copiedScript], { cwd: tmpdir(), encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /ENOENT/);
  assert.match(execFileSync(process.execPath, [copiedScript, "--write"], { encoding: "utf8" }), /Manifest written/);
  const before = readFileSync(manifest, "utf8");
  assert.match(execFileSync(process.execPath, [copiedScript], { cwd: tmpdir(), encoding: "utf8" }), /Manifest verified/);
  assert.equal(readFileSync(manifest, "utf8"), before);
  const unknown = spawnSync(process.execPath, [copiedScript, "--unknown"], { encoding: "utf8" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Usage:/);
});
