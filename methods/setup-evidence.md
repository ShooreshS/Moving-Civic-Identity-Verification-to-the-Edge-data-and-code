# Setup and artifact evidence

The reported measurements used an internal, single-contributor release-candidate setup. The retained vote and tally manifests identify that setup explicitly. A replacement ceremony has later contribution outputs, but no finalized replacement setup or its deployment is established by this package.

The artifact inspection on 27 September 2026 recomputed the file hashes and sizes recorded in [measured-artifacts.json](../evidence/measured-artifacts.json). All ten files matched their retained backend manifest entries. The mobile vote proving key and witness WASM also matched the corresponding backend artifacts. These checks concern artifact identity; they add no proof trials, participants, or polls to the reported experiments.

## What the hashes establish

Each circuit has five recorded artifacts: its verification key, proving key, witness WASM, R1CS constraints, and release-candidate Phase-2 metadata. A reviewer who obtains a corresponding file can compare its SHA-256 and byte length with the record. Matching values identify the same file bytes. They do not establish that the circuit implements the intended protocol or that setup randomness was generated and erased correctly.

The SHA-256 fields are ordinary hashes of file bytes. CivicOS also uses domain-separated hashes of canonical JSON for application manifest and transcript pins; those are different values and are not reproduced as file hashes here. The word `final` in a retained proving-key filename is a build filename, not evidence that the later multiparty ceremony was finalized.

The phase-two JSON files listed in the record are metadata for the measured release candidate. They are not a published cryptographic transcript of the replacement ceremony.

## Status of the replacement setup

The inspected local records contain three sequential contribution rounds for both circuits. Their output hashes match the associated receipts, and the recorded inputs for rounds two and three match the preceding outputs. This establishes file continuity across the retained records.

On 27 September 2026, separate read-only checks using `snarkjs 0.7.6 zkey verify` accepted the retained round-three vote and tally outputs against their corresponding R1CS and public powers-of-tau files. Both commands exited successfully. The dated outcomes and checked output hashes appear separately in `laterContributionVerification` in the artifact record. The complete verification output and checked files are not bundled, so these are reported inspection outcomes rather than independently replayable results within this package. They add no measured proof trials and establish neither finalization nor contributor independence.

Those receipts record contribution hashes and a chosen display name. They do not include declarations of independent contribution groups or secure destruction of secret randomness. The contributor interface described the display name as public, but the inspected records contained no explicit consent to publish the complete receipts. No participant names or receipt contents are included in this package. Three recorded contributions therefore cannot be reported here as three independently established contribution groups.

The following evidence was not found in the inspected local setup material and is absent from this package:

- a finalized replacement transcript and its final verification log;
- finalized replacement proving and verification keys with corresponding deployed pins;
- explicit publication consent for complete contributor attestations, along with independence and secret-erasure declarations;
- a timestamped announcement fixing the future public-randomness source, the resulting value, and evidence for checking its provenance;
- a completed replacement-setup evidence manifest connecting these records to an archived release and post-replacement verification results.

The measured release-candidate metadata records one contributor and no public-randomness finalization. The later contribution rounds must remain separate from that measured artifact set.

## Reproduction limits

This package distributes the artifact hash record, not the circuit sources, dependency lock, compiled constraints, initial parameters, proving keys, verification keys, witness WASM, proof fixtures, or setup transcripts. It also omits private experiment exports. Consequently, the package's consistency checks cannot independently rerun the ceremony verification, recompute these artifact hashes, reproduce the mobile timings, or replay the retained session proofs.

If the corresponding public artifacts and synthetic proof fixtures become available, the relevant read-only checks are SHA-256 comparison, `snarkjs powersoftau verify` for the initial parameters, `snarkjs zkey verify` against the matching R1CS and parameters, and `snarkjs groth16 verify` for a proof and its public inputs. Each check needs the matching artifact set; a replacement key cannot be used as evidence that an earlier measured proof verified under the release-candidate key.
