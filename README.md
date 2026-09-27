# CivicOS: evidence for manuscript review

This repository accompanies *Moving Civic Identity Verification to the Edge: A Privacy-Preserving Architecture for One-Person-One-Participation Digital Polling*, by S. Sufiye. It contains aggregate experiment results, public transaction identifiers, measurement methods, selected source excerpts, and artifact hashes.

The package supports inspection of the paper's reported evidence. It does not contain the full application, individual trial records, proof inputs, or a complete experiment-reproduction environment. The measured setup is a one-contributor release candidate. A finalized multi-contributor transcript, consented contributor attestations, and final public-randomness provenance are not included; see [setup evidence](methods/setup-evidence.md).

The SQL example and selected diagnostic labels in the source excerpts use public aliases. Experimental results and their verification identifiers are unchanged. The [naming notes](methods/measurement-methods.md#public-names-and-evidence-identifiers) explain what was adapted and what remains exact.

## Start here

1. Use the [claim-to-evidence map](methods/claim-evidence-map.md) to locate a result from the paper.
2. Read the corresponding fields in [the experiment summary](evidence/evidence-summary.json) and the [measurement notes](methods/measurement-methods.md).
3. Run the offline checks below to check package integrity and consistency of the published summaries.
4. For cryptographic-artifact questions, consult [the measured artifact inventory](evidence/measured-artifacts.json) and its [scope and limitations](methods/setup-evidence.md).

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

The command tests the manifest verifier and public examples, checks every distributed file against `MANIFEST.sha256`, and checks summary counts, field relationships, public transaction-signature hashes, and selected forbidden-data keys. Example tests use synthetic inputs and inspect SQL text without connecting to a database. The scan is a limited safeguard, not a comprehensive privacy or security audit.

To check only file integrity:

```sh
node scripts/verify-manifest.mjs
```

On macOS, an additional checksum check is available:

```sh
shasum -a 256 -c MANIFEST.sha256
```

The Node verifier also rejects unlisted files; `shasum` checks only listed entries. Neither command authenticates a manifest obtained from an untrusted source. Compare against the exact archive or commit cited by the paper.

Passing these checks does not replay the 61 proofs, recompute statistics from private trial records, verify ceremony contributions, or query Solana. Hashes of private source records identify those records; without the files, a reviewer cannot verify their contents.

## Inspect public transaction records

[devnet-transactions.json](evidence/devnet-transactions.json) contains eight signatures for the historical four-poll experiment. Search a signature in [Solana Explorer with devnet selected](https://explorer.solana.com/?cluster=devnet). Compare the program identifier and recorded slot/status with the JSON. The `collectedAt` field dates the retained observations; current network responses can differ in availability from that collection.

The package does not include ciphertexts, private database rows, or the prospective run's signatures. Checking a public transaction alone cannot reproduce the private database-to-publication linkage.

## Methods and source excerpts

- [Measurement methods](methods/measurement-methods.md) explain timing, memory, payload, and cohort definitions, plus the optional read-only PostgreSQL sizing query.
- [Source excerpts](source-snippets/README.md) show measurement behavior. They are not standalone applications or the full attestation, issuance, ballot, or tally implementation.
- [Security and data boundaries](SECURITY.md) describe omitted private material and safe ways to report concerns.

## Citation and reuse

[CITATION.cff](CITATION.cff) identifies this evidence package. Use the release-specific archive DOI when supplied with the paper; otherwise include the exact Git commit with the [repository URL](https://github.com/ShooreshS/Moving-Civic-Identity-Verification-to-the-Edge-data-and-code). This snapshot has no recorded archive DOI or published release date and must not be described as the finalized ceremony archive.

Code is released under MIT; data and documentation are released under CC BY 4.0. See [license scope](LICENSE.md) for the file-level distinction, attribution, and third-party exclusions. These licenses do not cover the full CivicOS application or private records.
