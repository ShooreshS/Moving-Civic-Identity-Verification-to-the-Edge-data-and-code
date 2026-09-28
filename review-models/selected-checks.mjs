// Source-derived review examples. Synthetic tests only; no deployment interface.
import { createHmac } from "node:crypto";

export function deriveReviewIdentityKey(digest, reviewKey) {
  const normalized = typeof digest === "string" ? digest.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{128}$/.test(normalized)) throw new Error("Invalid review digest.");
  if (typeof reviewKey !== "string" || !reviewKey.trim()) throw new Error("Missing review key.");
  // Match the source: hash normalized hexadecimal text, not decoded digest bytes.
  // The nonempty key is used verbatim; its surrounding whitespace is not removed.
  return createHmac("sha256", reviewKey).update(normalized, "utf8").digest("hex");
}

export const SIGNAL_ORDER = Object.freeze([
  "poll_tag", "policy_digest", "schema_digest", "option_digest", "option_count",
  "registry_root", "poll_nullifier", "ballot_commitment", "opening_commitment",
]);

export const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function canonicalField(value) {
  if (typeof value !== "bigint" && !(typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value))) {
    throw new Error("Review examples require an already-encoded canonical decimal field value.");
  }
  const field = BigInt(value);
  if (field < 0n || field >= FIELD_MODULUS) throw new Error("Field value outside review example domain.");
  return field;
}

export function compareReturnedSignals(expectedFields, returnedSignals) {
  if (!Array.isArray(returnedSignals) || returnedSignals.length === 0) return "not-checked";
  const expected = SIGNAL_ORDER.map((alias) => canonicalField(expectedFields[alias]));
  const actual = returnedSignals.map(canonicalField);
  if (actual.length !== expected.length) return "mismatch";
  return expected.every((value, index) => value === actual[index]) ? "match" : "mismatch";
}
