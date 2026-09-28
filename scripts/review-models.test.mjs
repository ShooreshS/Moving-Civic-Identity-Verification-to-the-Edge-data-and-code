import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { deriveReviewIdentityKey, compareReturnedSignals, SIGNAL_ORDER, FIELD_MODULUS } from "../review-models/selected-checks.mjs";

const digest = "ab".repeat(64);
const reviewKey = "SYNTHETIC-REVIEW-KEY-ONLY";

test("review identity helper normalizes hexadecimal text before HMAC", () => {
  const expected = createHmac("sha256", reviewKey).update(digest, "utf8").digest("hex");
  assert.equal(deriveReviewIdentityKey(`  ${digest.toUpperCase()}  `, reviewKey), expected);
  assert.equal(deriveReviewIdentityKey(digest, reviewKey), expected);
  assert.notEqual(expected, createHmac("sha256", reviewKey).update(Buffer.from(digest, "hex")).digest("hex"));
});

test("review identity helper distinguishes supplied keys without trimming them", () => {
  const first = deriveReviewIdentityKey(digest, reviewKey);
  assert.notEqual(first, deriveReviewIdentityKey(digest, `${reviewKey}-SECOND`));
  assert.notEqual(first, deriveReviewIdentityKey(digest, ` ${reviewKey} `));
});

test("review identity helper rejects malformed digests and missing keys", () => {
  for (const value of [null, 42, "", "a".repeat(127), "a".repeat(129), "z".repeat(128)]) {
    assert.throws(() => deriveReviewIdentityKey(value, reviewKey));
  }
  for (const value of [null, 42, "", "   "]) assert.throws(() => deriveReviewIdentityKey(digest, value));
});

const expectedFields = Object.fromEntries(SIGNAL_ORDER.map((alias, index) => [alias, String(index + 1)]));
const ordered = SIGNAL_ORDER.map((alias) => expectedFields[alias]);

test("review vector follows the documented nine-signal order", () => {
  assert.deepEqual(SIGNAL_ORDER, ["poll_tag", "policy_digest", "schema_digest", "option_digest", "option_count", "registry_root", "poll_nullifier", "ballot_commitment", "opening_commitment"]);
  assert.equal(compareReturnedSignals(expectedFields, ordered), "match");
  assert.equal(compareReturnedSignals(expectedFields, ordered.map(BigInt)), "match");
});

test("review vector detects swapped, changed, missing, and extra signals", () => {
  const swapped = [...ordered];
  [swapped[5], swapped[6]] = [swapped[6], swapped[5]];
  assert.equal(compareReturnedSignals(expectedFields, swapped), "mismatch");
  for (let index = 0; index < ordered.length; index++) {
    const changed = [...ordered];
    changed[index] = "99";
    assert.equal(compareReturnedSignals(expectedFields, changed), "mismatch");
  }
  assert.equal(compareReturnedSignals(expectedFields, ordered.slice(0, -1)), "mismatch");
  assert.equal(compareReturnedSignals(expectedFields, [...ordered, "10"]), "mismatch");
});

test("an absent or empty returned vector is explicitly not checked", () => {
  for (const value of [undefined, null, [], {}]) assert.equal(compareReturnedSignals(expectedFields, value), "not-checked");
});

test("review field parser rejects inputs outside its documented teaching domain", () => {
  for (const value of [-1n, FIELD_MODULUS, "01", "0x01", "1.1", 1, "arbitrary-text", undefined]) {
    assert.throws(() => compareReturnedSignals({ ...expectedFields, poll_tag: value }, ordered));
  }
});
