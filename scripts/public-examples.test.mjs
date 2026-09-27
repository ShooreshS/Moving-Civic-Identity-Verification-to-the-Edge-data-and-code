// Synthetic examples and static policy checks, not experimental reproduction.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const mobileSource = readFileSync(new URL("../source-snippets/mobile-payload-measurement.js", import.meta.url), "utf8");
const storageSource = readFileSync(new URL("./measure-postgres-storage.sql", import.meta.url), "utf8");
const jsonBytes = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");
const componentBytes = (value) => value == null ? 0 : jsonBytes(value);

function runMobile({ body, responseBody, runId = "synthetic-review-run", instrumentation = "full" } = {}) {
  const stages = [];
  const consoleCalls = [];
  const addStage = (name, data) => stages.push({ name, data: JSON.parse(JSON.stringify(data)) });
  const instruments = {
    full: { runId, addStage },
    absent: undefined,
    null: null,
    empty: {},
    headerOnly: { runId },
  };
  const context = {
    body,
    responseBody,
    response: { status: 201 },
    headers: {},
    experimentRun: instruments[instrumentation],
    console: Object.fromEntries(["log", "info", "warn", "error", "debug"].map((name) => [name, (...args) => consoleCalls.push(args)])),
  };
  vm.runInNewContext(mobileSource, context, { timeout: 1000, filename: "synthetic-mobile-example.js" });
  assert.deepEqual(consoleCalls, [], "The excerpt must not log fixture contents to the console.");
  return { stages, headers: context.headers };
}

test("synthetic mobile fixture: Unicode JSON byte counts and nested components", () => {
  const body = {
    privacy: { proof: { proof: { label: "synthetic-🧪", value: "داده" }, publicInputs: ["Å", "東京"] } },
    encryptedVote: { example: "SYNTHETIC_BODY_ONLY_δ" },
    voteCommitment: "synthetic-receipt-å",
    omitted: undefined,
  };
  const responseBody = { example: "SYNTHETIC_RESPONSE_ONLY_🌍", accepted: true };
  const originalBody = JSON.stringify(body);
  const result = runMobile({ body, responseBody });
  assert.equal(JSON.stringify(body), originalBody, "Measurement must leave the fixture body unchanged.");
  assert.deepEqual(result.stages, [
    {
      name: "request_serialization",
      data: {
        compactJsonUtf8Bytes: jsonBytes(body),
        zkpEnvelopeUtf8Bytes: jsonBytes(body.privacy.proof),
        zkpOutputUtf8Bytes: jsonBytes(body.privacy.proof.proof),
        publicInputEnvelopeUtf8Bytes: jsonBytes(body.privacy.proof.publicInputs),
        encryptedEnvelopeUtf8Bytes: jsonBytes(body.encryptedVote),
        receiptCommitmentUtf8Bytes: jsonBytes(body.voteCommitment),
      },
    },
    {
      name: "application_payload_observation",
      data: { requestBodyUtf8Bytes: jsonBytes(body), responseBodyUtf8Bytes: jsonBytes(responseBody), httpStatus: 201 },
    },
  ]);
  assert.ok(jsonBytes(body) > originalBody.length, "This fixture distinguishes UTF-8 bytes from UTF-16 string length.");
  const counts = result.stages[0].data;
  assert.ok(counts.zkpEnvelopeUtf8Bytes > counts.zkpOutputUtf8Bytes + counts.publicInputEnvelopeUtf8Bytes);
  assert.equal(counts.zkpEnvelopeUtf8Bytes, jsonBytes(body.privacy.proof), "The envelope includes its nested component bytes.");
  for (const stage of result.stages) assert.ok(Object.values(stage.data).every((value) => typeof value === "number"));
  assert.doesNotMatch(JSON.stringify(result.stages), /SYNTHETIC_BODY_ONLY|SYNTHETIC_RESPONSE_ONLY/);
});

test("synthetic mobile fixture: undefined and null request/response behavior", () => {
  for (const body of [undefined, null, {}]) {
    for (const responseBody of [undefined, null, {}]) {
      const { stages } = runMobile({ body, responseBody });
      const expectedRequestBytes = body === undefined ? 0 : jsonBytes(body);
      assert.equal(stages.length, body === undefined ? 1 : 2);
      if (body !== undefined) {
        assert.equal(stages[0].name, "request_serialization");
        assert.deepEqual(stages[0].data, {
          compactJsonUtf8Bytes: expectedRequestBytes,
          zkpEnvelopeUtf8Bytes: 0,
          zkpOutputUtf8Bytes: 0,
          publicInputEnvelopeUtf8Bytes: 0,
          encryptedEnvelopeUtf8Bytes: 0,
          receiptCommitmentUtf8Bytes: 0,
        });
      }
      assert.deepEqual(stages.at(-1).data, {
        requestBodyUtf8Bytes: expectedRequestBytes,
        responseBodyUtf8Bytes: responseBody == null ? 0 : jsonBytes(responseBody),
        httpStatus: 201,
      });
    }
  }
});

test("synthetic mobile fixture: null and undefined nested components count as zero", () => {
  for (const value of [null, undefined]) {
    const body = { privacy: { proof: { proof: value, publicInputs: value } }, encryptedVote: value, voteCommitment: value };
    const { stages } = runMobile({ body, responseBody: null });
    assert.deepEqual(stages[0].data, {
      compactJsonUtf8Bytes: jsonBytes(body),
      zkpEnvelopeUtf8Bytes: componentBytes(body.privacy.proof),
      zkpOutputUtf8Bytes: 0,
      publicInputEnvelopeUtf8Bytes: 0,
      encryptedEnvelopeUtf8Bytes: 0,
      receiptCommitmentUtf8Bytes: 0,
    });
  }
});

test("synthetic mobile fixture: neutral run header does not change body counts", () => {
  const fixture = { body: { example: "synthetic-☕" }, responseBody: { accepted: true } };
  const withHeader = runMobile({ ...fixture, runId: "synthetic-run-123" });
  const withoutHeader = runMobile({ ...fixture, runId: "" });
  assert.deepEqual(withHeader.headers, { "X-Review-Run": "synthetic-run-123" });
  assert.deepEqual(withoutHeader.headers, {});
  assert.deepEqual(withHeader.stages, withoutHeader.stages);
});

test("synthetic mobile fixture: optional instrumentation can be absent", () => {
  for (const instrumentation of ["absent", "null", "empty", "headerOnly"]) {
    const { stages, headers } = runMobile({ body: { example: "synthetic" }, responseBody: null, instrumentation });
    assert.deepEqual(stages, []);
    assert.deepEqual(headers, instrumentation === "headerOnly" ? { "X-Review-Run": "synthetic-review-run" } : {});
  }
});

const sql = storageSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
const sqlLines = sql.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const copies = sqlLines.filter((line) => /^\\copy\b/i.test(line));

test("static SQL policy: read-only transaction, bounded timeout, and rollback", () => {
  assert.match(sql, /\\set\s+ON_ERROR_STOP\s+on\b/i);
  assert.match(sql, /BEGIN\s+(?:TRANSACTION\s+)?ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY\s*;/i);
  assert.match(sql, /SET\s+LOCAL\s+search_path\s*=\s*pg_catalog\s*;/i);
  assert.match(sql, /SET\s+LOCAL\s+row_security\s*=\s*off\s*;/i);
  const timeout = sql.match(/SET\s+LOCAL\s+statement_timeout\s*=\s*'(\d+)(ms|s|min)'\s*;/i);
  assert.ok(timeout, "A local statement timeout must be set.");
  const timeoutMs = Number(timeout[1]) * { ms: 1, s: 1000, min: 60000 }[timeout[2].toLowerCase()];
  assert.ok(timeoutMs > 0 && timeoutMs <= 60000);
  assert.match(sql.trimEnd(), /\bROLLBACK\s*;$/i);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|MERGE|VACUUM|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMIT)\b/i);
});

test("static SQL policy: exactly four one-line CSV SELECT exports", () => {
  assert.equal(copies.length, 4);
  for (const command of copies) {
    assert.match(command, /^\\copy\s+\(SELECT\s+.+\)\s+TO\s+STDOUT\s+WITH\s+CSV\s+HEADER$/i);
    assert.doesNotMatch(command, /\bSELECT\s+\*/i);
    const projection = command.match(/^\\copy\s+\(SELECT\s+(.+?)\s+FROM\s/i)?.[1] ?? command;
    assert.doesNotMatch(projection, /\b(?:relname|reloptions|pg_get_indexdef)\b/i);
  }
  assert.ok(copies.some((command) => /row_number\s*\(\s*\)\s+OVER\s*\(.+?\)\s+AS\s+index_(?:ordinal|number)/i.test(command)));
});

test("static SQL policy: only the reviewer table and sizing catalogs are read", () => {
  assert.match(sql, /\bFROM\s+(?:ONLY\s+)?review_data\.review_ballots\b/i);
  for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+(?:ONLY\s+)?([a-z_][\w.]*)/gi)) {
    assert.match(match[1], /^(?:review_data\.review_ballots|(?:pg_catalog\.)?pg_(?:class|inherits|index|namespace))$/i);
  }
  for (const match of sql.matchAll(/'([^']+)'\s*::\s*regclass/gi)) assert.equal(match[1], "review_data.review_ballots");
  for (const match of sql.matchAll(/\bto_regclass\s*\(\s*'([^']+)'/gi)) assert.equal(match[1], "review_data.review_ballots");
  assert.ok(copies.some((command) => /count\(\*\)/i.test(command) && /pg_column_size\(/i.test(command)));
  assert.ok(copies.some((command) => /pg_total_relation_size\([^)]*\)\s*-\s*pg_relation_size\([^)]*\)\s*-\s*pg_indexes_size\([^)]*\)/i.test(command)));
});

test("static SQL policy: guard rejects nonordinary and inherited tables before export", () => {
  const guard = sql.match(/\bDO\s+(\$[a-z_]*\$)([\s\S]*?)\1\s*;/i);
  assert.ok(guard, "A DO guard must check the reviewer-owned target relation.");
  assert.match(guard[2], /\bc\.relkind\s*=\s*'r'/i);
  assert.match(guard[2], /\bpg_inherits\b/i);
  assert.match(guard[2], /\binhrelid\b/i);
  assert.match(guard[2], /\binhparent\b/i);
  assert.match(guard[2], /\bRAISE\s+EXCEPTION\b/i);
  assert.ok(guard.index < sql.indexOf(copies[0]), "The guard must run before any CSV export.");
});
