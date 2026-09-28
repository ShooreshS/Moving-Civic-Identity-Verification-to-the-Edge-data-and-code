#!/usr/bin/env node
// Limited publication rules. No entropy claim, network access, or matched-value output.
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sensitiveName, verifyManifest } from "./verify-manifest.mjs";

const publicHosts = new Set([
  "github.com", "zenodo.org", "doi.org", "help.zenodo.org",
  "explorer.solana.com", "creativecommons.org", "www.postgresql.org",
]);

const rules = [
  ["private-key-block", /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/],
  ["credential-in-url", /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i],
  ["jwt-shaped-value", /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/],
  ["provider-token-shaped-value", /\b(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16})\b/],
  ["local-user-path", /(?:\/(?:Users|home)\/[^\s/]+\/|[A-Za-z]:\\Users\\[^\s\\]+\\)/],
  ["credential-literal", /\b(?:password|api[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];

export function inspectText(relative, contents) {
  const findings = [];
  if (sensitiveName(relative)) findings.push({ file: relative, line: 0, rule: "sensitive-filename" });
  if (contents.includes("\0")) findings.push({ file: relative, line: 0, rule: "unexpected-binary-content" });
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    for (const [rule, pattern] of rules) {
      if (pattern.test(line)) findings.push({ file: relative, line: index + 1, rule });
    }
    for (const match of line.matchAll(/https?:\/\/[^\s"'`<>\)\]]+/gi)) {
      let allowed = false;
      try {
        const url = new URL(match[0]);
        allowed = url.protocol === "https:" && !url.username && !url.password
          && !url.port && publicHosts.has(url.hostname);
      } catch { /* malformed URLs need manual review */ }
      if (!allowed) findings.push({ file: relative, line: index + 1, rule: "unapproved-url" });
    }
  }
  return findings;
}

export function checkPublicationBoundary(root) {
  const { fileCount } = verifyManifest(root);
  const entries = readFileSync(resolve(root, "MANIFEST.sha256"), "utf8").trim().split(/\r?\n/);
  const findings = entries.flatMap((line) => {
    const relative = line.slice(66).replace(/^\.\//, "");
    return inspectText(relative, readFileSync(resolve(root, relative), "utf8"));
  });
  return { fileCount, findings };
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const { fileCount, findings } = checkPublicationBoundary(root);
    if (findings.length) {
      for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.rule}`);
      process.exitCode = 1;
    } else {
      console.log(`Publication boundary rules passed for ${fileCount} files. This is a limited scan, not a security audit.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
