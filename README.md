# CivicOS: evidence for manuscript review

This repository accompanies *Moving Civic Identity Verification to the Edge: A Privacy-Preserving Architecture for One-Person-One-Participation Digital Polling*, by S. Sufiye. It contains aggregate experiment results, public transaction identifiers, measurement methods, source-derived implementation descriptions, selected code examples, and artifact hashes.

The package supports inspection of the paper's reported evidence. It does not contain the full application, individual trial records, retained proof inputs, or a complete experiment-reproduction environment. The measured setup is a one-contributor release candidate. A finalized multi-contributor transcript, consented contributor attestations, and final public-randomness provenance are not included; see [setup evidence](methods/setup-evidence.md).

This is an unarchived working supplement (`1.1.0-dev`). DOI `10.5281/zenodo.23000023` identifies the published `1.0.0` baseline, which does not contain these added implementation descriptions. See [archive status](methods/archive-status.md) before matching this package to manuscript reference [32].

The SQL example and selected diagnostic labels in the source excerpts use public aliases. Experimental results and their verification identifiers are unchanged. The [naming notes](methods/measurement-methods.md#public-names-and-evidence-identifiers) explain what was adapted and what remains exact.

## Start here

1. Read the [reviewer guide](REVIEWER_GUIDE.md), then use the [claim-to-evidence map](methods/claim-evidence-map.md) to locate a result or implementation claim from the paper.
2. Read the corresponding fields in [the experiment summary](evidence/evidence-summary.json) and the [measurement notes](methods/measurement-methods.md).
3. Run the offline checks below to check package integrity and consistency of the published summaries.
4. For cryptographic-artifact questions, consult [the measured artifact inventory](evidence/measured-artifacts.json) and its [scope and limitations](methods/setup-evidence.md).

## Inspect the implementation logic

The added pseudocode is grounded in the source revisions recorded with the measurements. It describes selected implementation paths, including their trust dependencies and limits. It does not establish that a deployed binary matches the inspected source.

- [Attestation and admission](implementation/attestation-and-admission.md): challenge and device checks, session authorization, canonical identity derivation, credential issuance, recovery and revocation boundaries.
- [Proof and client boundaries](implementation/proof-and-client-boundaries.md): exact public-signal order, private witness relationships, circuit constraints, local proving, and checks delegated to services.
- [Ballot and audit boundaries](implementation/ballot-and-audit-boundaries.md): conceptual record fields, acceptance order, repeat-use checks, receipt/publication stages, tally opening, key custody, and observable outputs.

The corresponding source inventories record component aliases, revisions, file sizes, and SHA-256 values. Original source files remain private; these inventories identify the inspected material without making source correspondence independently verifiable. The [review examples](review-models/README.md) provide small synthetic checks of selected operations, separate from the reported experiments.

## Where the experimental evidence is

| Experiment or claim | File and JSON field | What a reviewer can inspect |
| --- | --- | --- |
| iPhone 15 Pro proof generation | [evidence-summary.json](evidence/evidence-summary.json), `primaryMobileCohort` | Statistics for 50 measured-warm trials; the recorded 61-proof offline-verification count includes a first-process run and ten warmups. Individual proofs and trial records are absent. |
| Samsung S7 edge proof generation | Same file, `legacyAndroidCohorts` | Separate five-run and six-run summaries, with limited memory observations. |
| Samsung complete workflow | Same file, `legacyAndroidFunctionalObservation` | An author-confirmed observation; no session export or stage timings were retained. |
| Four-poll database-to-devnet experiment | Same file, `historicalFourPollCohort`; [devnet-transactions.json](evidence/devnet-transactions.json) | Aggregate database/publication counts and eight public transaction signatures with their recorded status. |
| Prospective instrumented run | Same file, `prospectiveFunctionalRun` | One joined workflow summary, timings, payload sizes, and qualification limits. Raw span/session records and the two prospective transaction signatures are absent. |
| Software and measured cryptographic artifacts | Same file, `software` and `circuitArtifacts`; [measured-artifacts.json](evidence/measured-artifacts.json) | Version identifiers and hashes/sizes of the inspected release-candidate files. Artifact binaries are not bundled. |

These observations support feasibility under the reported conditions. They do not establish population-wide performance, biometric accuracy, production reliability, resistance to request-metadata correlation, coercion resistance, or election suitability.

## Run the offline checks

Use Node.js 20 or later. No dependency installation, network connection, account, wallet, database, or secret is required. From this repository's root:

```sh
npm test
```

The command tests the manifest verifier, publication scanner, and public examples; checks every distributed file against `MANIFEST.sha256`; and checks summary relationships, source-inventory metadata, and historical evidence hashes. Example tests use synthetic inputs and inspect SQL text without connecting to a database. The publication scan checks selected credential patterns, local paths, and unexpected URL hosts. These checks are limited safeguards, not a comprehensive privacy or security audit.

To check only file integrity:

```sh
node scripts/verify-manifest.mjs
```

On macOS, an additional checksum check is available:

```sh
shasum -a 256 -c MANIFEST.sha256
```

The Node verifier also rejects unlisted files; `shasum` checks only listed entries. Neither command authenticates a manifest obtained from an untrusted source. Compare against the exact archive or commit cited by the paper.

Passing these checks does not replay the 61 proofs, recompute statistics from private trial records, verify ceremony contributions, check a deployed service, or query Solana. Hashes of private source records identify those records; without the files, a reviewer cannot verify their contents. [Inspection checks](evidence/inspection-checks.json) separately records the limited private helper-test execution performed while preparing this supplement.

## Inspect public transaction records

[devnet-transactions.json](evidence/devnet-transactions.json) contains eight signatures for the historical four-poll experiment. Search a signature in [Solana Explorer with devnet selected](https://explorer.solana.com/?cluster=devnet). Compare the program identifier and recorded slot/status with the JSON. The `collectedAt` field dates the retained observations; current network responses can differ in availability from that collection.

The package does not include ciphertexts, private database rows, or the prospective run's signatures. Checking a public transaction alone cannot reproduce the private database-to-publication linkage.

## Methods and source excerpts

- [Measurement methods](methods/measurement-methods.md) explain timing, memory, payload, and cohort definitions, plus the optional read-only PostgreSQL sizing query.
- [Source excerpts](source-snippets/README.md) show measurement behavior. They are not standalone applications or the full attestation, issuance, ballot, or tally implementation.
- [Security and data boundaries](SECURITY.md) describe omitted private material and safe ways to report concerns.

## Citation and reuse

[CITATION.cff](CITATION.cff) describes this working supplement and credits the [archived v1.0.0 baseline](https://zenodo.org/records/23000023). A reviewer using the supplement should identify its exact Git commit with the [repository URL](https://github.com/ShooreshS/Moving-Civic-Identity-Verification-to-the-Edge-data-and-code), or its own version-specific DOI once archived. The baseline DOI does not cover the additions. Neither version should be described as a finalized ceremony archive.

Code is released under MIT; data and documentation are released under CC BY 4.0. See [license scope](LICENSE.md) for the file-level distinction, attribution, and third-party exclusions. These licenses do not cover the full CivicOS application or private records.
