import assert from "node:assert/strict";
import test from "node:test";
import { inspectText } from "./check-publication-boundary.mjs";

const scan = (value, file = "example.txt") => inspectText(file, value);
const url = (host, path = "/") => ["https:", "", host, path.slice(1)].join("/");

test("publication scan accepts known public references and ordinary source hashes", () => {
  const text = [url("github.com", "/example/research"), url("doi.org", "/10.5281/zenodo.23014830"), url("zenodo.org", "/records/23014830"), url("doi.org", "/10.5281/zenodo.23000023"), "a".repeat(64), "SYNTHETIC-REVIEW-KEY-ONLY"].join("\n");
  assert.deepEqual(scan(text), []);
});

test("publication scan flags constructed private-key and token examples without revealing them", () => {
  const fixtures = [
    ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
    ["ghp", "_", "X".repeat(36)].join(""),
    ["eyJ", "A".repeat(16), ".", "B".repeat(20), ".", "C".repeat(20)].join(""),
    ["api", "Key", " = ", '"', "CONSTRUCTED_TEST_VALUE", '"'].join(""),
  ];
  for (const fixture of fixtures) {
    const findings = scan(fixture);
    assert.ok(findings.length > 0);
    assert.ok(findings.every((finding) => Object.keys(finding).join(",") === "file,line,rule"));
    assert.ok(!JSON.stringify(findings).includes(fixture));
  }
});

test("publication scan catches private paths, binary content and sensitive filenames", () => {
  for (const value of [["", "Users", "example", "project"].join("/"), ["", "home", "example", "project"].join("/"), "a\0b"]) {
    assert.ok(scan(value).length > 0);
  }
  for (const name of [".env", "nested/.env.example", "key.pem", "raw/rows.json"]) assert.ok(scan("", name).length > 0);
});

test("publication scan rejects unknown hosts, credentials, plaintext HTTP and deceptive domains", () => {
  const fixtures = [url("deployment.example.invalid"), url("github.com.attacker.invalid"), url("example:constructed@github.com"), url("github.com:8443"), url("github.com").replace("https:", "http:")];
  for (const value of fixtures) assert.ok(scan(value).some((finding) => finding.rule === "unapproved-url"));
});

test("publication scan explicitly has no general detector for personal data or arbitrary secrets", () => {
  assert.deepEqual(scan("A person's name and an unlabelled arbitrary string need manual review."), []);
});
