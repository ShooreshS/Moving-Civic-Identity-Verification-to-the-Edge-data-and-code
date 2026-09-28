# Guide to the evidence

This package is intended for assessment of the paper's architecture and reported feasibility observations. It does not offer full experimental reproduction. The implementation descriptions were prepared from selected source revisions on 28 September 2026. They let a reviewer examine the stated logic and its limits without a deployed application, private database, or participant records.

The added descriptions are included in version 1.1.0, with Zenodo DOI [`10.5281/zenodo.23014830`](https://zenodo.org/records/23014830). DOI `10.5281/zenodo.23000023` identifies the earlier version 1.0.0; it does not identify these additions. See [archive status](methods/archive-status.md).

## A reading route

1. Locate the paper's claim in the [claim-to-evidence map](methods/claim-evidence-map.md). Each row distinguishes reported observations from checks available here.
2. For experimental numbers, read [the unchanged summary](evidence/evidence-summary.json) alongside [measurement methods](methods/measurement-methods.md). Keep the two Android cohorts, historical four-poll experiment, and single prospective run separate.
3. For implementation claims, read the applicable boundary document below. The pseudocode preserves selected source decisions and ordering. It omits deployment configuration, low-level parsing, and portions of the implementation; it must not be treated as a complete protocol or audited implementation.
4. Run `npm test` using Node.js 20 or later. No installation, accounts, credentials, or network access are needed. Passing tests concern the distributed package, its examples, and its recorded metadata.

| Review question | Evidence to read | Assessment boundary |
| --- | --- | --- |
| What must succeed before a protected session or registry credential is issued? | [Attestation and admission](implementation/attestation-and-admission.md) | Source-derived checks and configured trust dependencies; no live provider or deployed-configuration certification. |
| What does the vote proof actually prove? | [Proof and client boundaries](implementation/proof-and-client-boundaries.md) | Nine ordered public signals, witness relationships, commitment and membership constraints; document/biometric truth and ciphertext correctness are outside this circuit. |
| What is retained, disclosed, or checked after a vote is submitted? | [Ballot and audit boundaries](implementation/ballot-and-audit-boundaries.md) | Source-derived record shapes, acceptance order, receipt/publication logic, tally custody, and observer limits. |
| Which source versions were inspected? | [Admission inventory](evidence/admission-source-inventory.json), [proof inventory](evidence/proof-source-inventory.json), [ballot inventory](evidence/ballot-source-inventory.json) | File-byte hashes, sizes, revision identifiers, and component aliases. Private source files are absent; correspondence is reported by the author-side inspection. |
| Which executable checks are provided? | [Offline model notes](review-models/README.md), [measurement excerpts](source-snippets/README.md), and `scripts/` | Synthetic helper checks, package integrity, summary consistency, and a limited publication-boundary scan. No biometric tests, Groth16 proof verification, or experiment replay. |
| Was any private implementation test run during this review? | [Inspection checks](evidence/inspection-checks.json) | One pure identity-derivation suite, using synthetic inputs. Other private test descriptions concern inspected test source, without claiming new execution. |
| Are the setup and retained measurements independently checkable? | [Setup evidence](methods/setup-evidence.md) | Artifact identity and reported inspection outcomes are recorded. Full setup verification and recomputation from trial records cannot be done with this package. |

## How to interpret the evidence

The historical JSON files report observations already used in the manuscript. They were not regenerated from trials for this supplement. Hashes guard against accidental changes to those files; matching hashes do not establish that the original observations are correct.

The source descriptions are author-side inspection evidence, prepared with automated assistance. They are neither an independent audit nor a proof that the measured application binary was built from the described source. Original source-file hashes allow later identity checks if the corresponding files become available. They do not make an absent source file reviewable.

The executable examples use invented inputs. Their results must not be added to the paper's participant counts, trial counts, timing cohorts, or proof-verification totals. An illustrative signal-vector comparison cannot validate a proof. Likewise, an HMAC helper test cannot establish that a person was correctly identified.

Aliases replace deployment-specific names. They do not alter published measurements, source-revision identifiers, artifact hashes, or historical transaction signatures. The private name mapping is omitted. The proof description preserves signal positions and algebraic relationships; its aliases are unsuitable as application wire keys or domain-separation labels.

## Questions this package cannot settle

The available evidence does not establish biometric accuracy, complete eligibility-policy enforcement, resistance to a compromised client, request-metadata unlinkability, safe behavior under simultaneous replay/recovery operations, or production/election readiness. Recovery, credential revocation, and accepted-root policy need separate assessment.

The inspected operator can decrypt ballot openings through the tally service. Interim option totals also create inference risks in small groups. The source descriptions therefore cannot support a claim that ballots are hidden from every operator or that aggregate-only interfaces prevent all disclosure.

No finalized replacement setup, consented contributor attestations, or final public-randomness provenance is supplied. These cannot be generated from pseudocode. The measured setup remains the recorded single-contributor release candidate.

Reviewers can assess the design and compare the reported summaries, while noting the unavailable evidence. Whether this is sufficient for a journal's decision rests with its editors and reviewers. A request for independent confirmation of the omitted experiments or security properties would require additional evidence or narrower manuscript claims.
