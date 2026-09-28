#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyManifest } from "./verify-manifest.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const integrity = verifyManifest(root);
const evidence = readJson("evidence/evidence-summary.json");
const devnet = readJson("evidence/devnet-transactions.json");
const artifacts = readJson("evidence/measured-artifacts.json");

// Freeze the historical observations. Supplementary inspection evidence is separate.
const baselineEvidenceHashes = {
  "evidence/evidence-summary.json": "e8abd06e557b2bc801711c24ad1ad8a2abd85130c89c567bec7522c240f86c11",
  "evidence/devnet-transactions.json": "51ae20daf6e06fbebcc753e72b0d79cf290c2c3e8ffaf511689521857ff1fc5e",
  "evidence/measured-artifacts.json": "2a2917a283745266b81192e80da697b3f73bb9432ed6e54af230b58521a2e5c5",
};
for (const [path, expected] of Object.entries(baselineEvidenceHashes)) {
  const actual = createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
  assert(actual === expected, `Historical evidence changed: ${path}.`);
}

assert(evidence.schemaVersion === "civicos-public-article-evidence-v1", "Unexpected evidence schema.");
assert(evidence.primaryMobileCohort.completed === 50, "Primary mobile cohort must contain 50 completed trials.");
assert(evidence.primaryMobileCohort.attempted === 50, "Primary mobile attempt count mismatch.");
assert(evidence.primaryMobileCohort.sessionProofVerification.accepted === 61, "Offline proof verification count mismatch.");
assert(evidence.primaryMobileCohort.sessionProofVerification.examined === 61, "Offline proof examination count mismatch.");
assert(evidence.primaryMobileCohort.sessionProofVerification.proofHashMatches === 61, "Recorded proof-hash match count mismatch.");
assert(evidence.legacyAndroidCohorts.length === 2, "Expected two separate Android cohorts.");
assert(evidence.legacyAndroidCohorts[0].completed === 5, "First Android cohort count mismatch.");
assert(evidence.legacyAndroidCohorts[1].completed === 6, "Second Android cohort count mismatch.");
assert(evidence.legacyAndroidCohorts[0].proveMsMean === 1295.8, "Samsung S7 edge proving mean mismatch.");
assert(evidence.legacyAndroidFunctionalObservation.registrationCompleted === true, "Samsung registration observation missing.");
assert(evidence.legacyAndroidFunctionalObservation.proofGenerationCompleted === true, "Samsung proof observation missing.");
assert(evidence.legacyAndroidFunctionalObservation.encryptedVoteSubmissionCompleted === true, "Samsung vote observation missing.");
assert(evidence.legacyAndroidFunctionalObservation.receiptRetrievalCompleted === true, "Samsung receipt observation missing.");
assert(evidence.historicalFourPollCohort.qualifiedPolls === 4, "Four-poll qualification count mismatch.");
assert(evidence.historicalFourPollCohort.qualificationGatePassed === true, "Four-poll gate must pass.");
assert(evidence.historicalFourPollCohort.rootPublications === 4, "Root publication count mismatch.");
assert(evidence.historicalFourPollCohort.finalResultPublications === 4, "Final publication count mismatch.");
assert(evidence.prospectiveFunctionalRun.functionalGatePassed === true, "Prospective functional gate must pass.");
assert(evidence.prospectiveFunctionalRun.requestBodyUtf8Bytes === 4195, "Request byte count mismatch.");
assert(evidence.prospectiveFunctionalRun.responseBodyUtf8Bytes === 560, "Response byte count mismatch.");
assert(evidence.prospectiveFunctionalRun.latencyCohortPassed === false, "One workflow must not qualify as a latency cohort.");
assert(evidence.prospectiveFunctionalRun.payloadDistributionGatePassed === false, "One exchange must not qualify as a payload distribution.");

assert(devnet.schemaVersion === "civicos-public-devnet-transaction-evidence-v1", "Unexpected transaction schema.");
assert(devnet.cluster === "devnet", "Transaction evidence must target devnet.");
assert(devnet.programId === evidence.historicalFourPollCohort.solanaTransactions.programId, "Program id mismatch.");
assert(devnet.transactions.length === 8, "Expected eight historical publication transactions.");
const signatures = new Set();
const polls = new Map();
for (const transaction of devnet.transactions) {
  assert(!signatures.has(transaction.signature), "Duplicate public transaction signature.");
  signatures.add(transaction.signature);
  assert(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(transaction.signature), "Malformed public transaction signature.");
  assert(Number.isSafeInteger(transaction.slot) && transaction.slot > 0, "Invalid recorded transaction slot.");
  assert(["root_publication", "final_result_publication"].includes(transaction.role), "Unknown transaction role.");
  const roles = polls.get(transaction.pollCode) ?? new Set();
  assert(!roles.has(transaction.role), "Duplicate publication role for a poll.");
  roles.add(transaction.role);
  polls.set(transaction.pollCode, roles);
  assert(transaction.confirmationStatus === "finalized", "Every transaction must be finalized.");
  assert(transaction.succeeded === true, "Every transaction must succeed.");
  assert(transaction.programReferenced === true, "Every transaction must reference the program.");
  assert(transaction.programInvoked === true, "Every transaction must invoke the program.");
  assert(sha256(transaction.signature) === transaction.signatureSha256, "Transaction signature hash mismatch.");
}
assert(polls.size === 4 && [...polls.values()].every((roles) => roles.size === 2), "Expected a root and result for each of four polls.");
const historical = evidence.historicalFourPollCohort;
for (const field of ["expectedPolls", "examinedPolls", "qualifiedPolls", "acceptedVerifiedEncryptedVotes", "uniqueNullifiers", "verifiedTallies", "rootPublications", "finalResultPublications", "publicAuditVerifierPasses"]) {
  assert(historical[field] === polls.size, `Historical count mismatch: ${field}.`);
}
for (const field of ["examined", "found", "finalized", "succeeded", "programReferenced", "programInvoked"]) {
  assert(historical.solanaTransactions[field] === signatures.size, `Historical transaction count mismatch: ${field}.`);
}

assert(artifacts.schemaVersion === "civicos-measured-artifacts-v1", "Unexpected artifact inventory schema.");
assert(artifacts.setup.profile === "internal-rc" && artifacts.setup.contributionCount === 1, "Measured artifacts must retain their release-candidate provenance.");
assert(artifacts.setup.finalMultiContributorSetup === false && artifacts.setup.publicRandomnessRecorded === false, "Measured setup must not be relabeled as the finalized replacement.");
assert(evidence.circuitArtifacts.setupStatus === "internal_one_contributor_release_candidate", "Measured setup labels disagree.");
assert(artifacts.circuits.length === 2 && new Set(artifacts.circuits.map((circuit) => circuit.kind)).size === 2, "Expected distinct vote and tally inventories.");
const roles = ["verification_key", "proving_key", "witness_wasm", "r1cs", "phase2_metadata"];
for (const circuit of artifacts.circuits) {
  assert(["vote", "tally"].includes(circuit.kind), "Unknown artifact circuit.");
  assert(circuit.artifacts.length === roles.length && roles.every((role) => circuit.artifacts.filter((artifact) => artifact.role === role).length === 1), "Artifact roles are incomplete or duplicated.");
  for (const artifact of circuit.artifacts) {
    assert(/^[a-f0-9]{64}$/.test(artifact.sha256), "Malformed artifact SHA-256.");
    assert(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, "Invalid artifact byte length.");
    assert(/^[a-zA-Z0-9_.-]+$/.test(artifact.filename) && !artifact.filename.startsWith("."), "Artifact filename must be a neutral basename.");
    assert(artifact.bundled === false, "Inventory must not claim absent artifact binaries are bundled.");
  }
}
const vote = artifacts.circuits.find((circuit) => circuit.kind === "vote");
for (const [role, field] of [["proving_key", "voteProvingKeyBytes"], ["witness_wasm", "voteWitnessWasmBytes"], ["verification_key", "voteVerificationKeyBytes"]]) {
  assert(vote.artifacts.find((artifact) => artifact.role === role).bytes === evidence.circuitArtifacts[field], `Vote artifact size mismatch: ${role}.`);
}
const artifactCount = artifacts.circuits.reduce((count, circuit) => count + circuit.artifacts.length, 0);
assert(artifacts.checks.manifestArtifactFilesChecked === artifactCount && artifacts.checks.manifestArtifactHashesMatched === artifactCount, "Artifact inspection count mismatch.");
assert(artifacts.checks.mobileVoteProvingKeyMatches === true && artifacts.checks.mobileVoteWasmMatches === true, "Recorded mobile artifact inspection outcome mismatch.");
const later = artifacts.laterContributionVerification;
assert(later.tool === "snarkjs" && later.toolVersion === "0.7.6" && later.operation === "zkey verify", "Unexpected recorded replacement-key verification procedure.");
assert(later.verificationLogBundled === false, "Absent verification logs must not be described as bundled.");
assert(later.results.length === 2 && ["vote", "tally"].every((kind) => later.results.filter((result) => result.kind === kind).length === 1), "Expected separate vote and tally replacement-key inspection outcomes.");
assert(later.results.every((result) => result.result === "passed" && result.exitCode === 0), "Recorded replacement-key inspection outcomes disagree.");

const forbiddenKeys = new Set([
  "user_id", "userid", "vieweruserid", "verifiedidentityid", "authorization",
  "token", "cookie", "ipaddress", "documentnumber", "mrz", "dateofbirth",
  "biometric", "credentialsecret", "identitysecret", "privatekey", "seedphrase",
  "databaseurl", "servicerolekey", "nullifier", "ciphertext", "receiptcommitment",
]);
const scan = (value, path = "$") => {
  if (Array.isArray(value)) return value.forEach((entry, index) => scan(entry, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    assert(!forbiddenKeys.has(normalized), `Forbidden public-data key at ${path}.${key}.`);
    if (normalized.endsWith("sha256")) {
      // fieldDefinitions contains prose explaining the hash rather than a hash value.
      if (!path.startsWith("$.fieldDefinitions")) assert(typeof child === "string" && /^[a-f0-9]{64}$/.test(child), `Malformed SHA-256 at ${path}.${key}.`);
    }
    scan(child, `${path}.${key}`);
  }
};
scan(evidence);
scan(devnet);
scan(artifacts);

let sourceEntryCount = 0;
const inventories = {};
for (const section of ["admission", "proof", "ballot"]) {
  const inventory = readJson(`evidence/${section}-source-inventory.json`);
  inventories[section] = inventory;
  assert(inventory.schemaVersion === "civicos-source-inspection-v1", "Unexpected source inventory schema.");
  assert(inventory.inspectionDate === "2026-09-28", "Unexpected source inspection date.");
  assert(inventory.sourceFilesBundled === false, "Absent source files must not be described as bundled.");
  assert(typeof inventory.scope === "string" && inventory.scope.length > 0, "Source inventory scope missing.");
  assert(inventory.revisions.backend.startsWith(evidence.software.evidenceBackendRevision), "Backend source revision disagrees with measurement provenance.");
  const aliases = new Set();
  assert(Array.isArray(inventory.files) && inventory.files.length > 0, "Source inventory is empty.");
  for (const entry of inventory.files) {
    assert(/^[A-Za-z0-9_-]+$/.test(entry.alias) && !aliases.has(entry.alias), "Invalid or repeated component alias.");
    aliases.add(entry.alias);
    assert(["backend", "mobile"].includes(entry.repository), "Unexpected source repository alias.");
    assert(/^[a-f0-9]{40}$/.test(entry.revision) && entry.revision === inventory.revisions[entry.repository], "Source revision mismatch.");
    if (entry.repository === "mobile") assert(entry.revision === evidence.software.experimentMobileCommit, "Mobile source revision mismatch.");
    assert(/^[a-f0-9]{64}$/.test(entry.sha256), "Invalid source SHA-256.");
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, "Invalid source byte length.");
    assert(typeof entry.workingTreeMatch === "boolean", "Source alignment result missing.");
    assert(["implementation", "test"].includes(entry.kind), "Unexpected source kind.");
    assert(!("path" in entry) && !("sourcePath" in entry), "Source inventories must use public component aliases.");
    sourceEntryCount++;
  }
  scan(inventory);
}

const inspection = readJson("evidence/inspection-checks.json");
assert(inspection.schemaVersion === "civicos-inspection-checks-v1" && inspection.inspectionDate === "2026-09-28", "Unexpected supplement inspection record.");
assert(inspection.independentAudit === false && inspection.historicalExperimentalResultsChanged === false, "Supplement evidence scope mismatch.");
const privateTests = inspection.privateImplementationTests;
assert(privateTests.passed === 3 && privateTests.failed === 0 && privateTests.expectCalls === 5 && privateTests.exitCode === 0, "Recorded synthetic helper-suite result mismatch.");
assert(privateTests.sourceAndSuiteBundled === false && privateTests.fullOutputBundled === false, "Absent private test material must remain labeled absent.");
assert(inventories.admission.files.some((entry) => entry.alias === privateTests.suiteAlias && entry.kind === "test" && entry.workingTreeMatch), "Executed private helper suite is missing from source provenance.");
scan(inspection);

const metadata = readJson("package.json");
const citation = readFileSync(resolve(root, "CITATION.cff"), "utf8");
assert(metadata.version === "1.1.0-dev", "Working supplement must remain distinguished from archived v1.0.0.");
assert(/^cff-version: 1\.2\.0$/m.test(citation) && /^version: 1\.1\.0-dev$/m.test(citation), "Citation format or package version mismatch.");
assert(!/^doi:/m.test(citation), "Unarchived supplement must not claim the baseline's DOI as its own.");
assert(/^    doi: "10\.5281\/zenodo\.23000023"$/m.test(citation), "Archived baseline reference missing from citation metadata.");

console.log(`Package integrity passed: ${integrity.fileCount} files match MANIFEST.sha256.`);
console.log("Evidence-summary consistency passed: recorded cohort, proof, poll, transaction, payload, and artifact metadata agree.");
console.log(`Historical evidence is byte-identical; ${sourceEntryCount} source inventory entries have consistent metadata. Private source hashes were not recomputed by this command.`);
console.log("No experiments, proof replay, ceremony verification, or live network checks were run.");
