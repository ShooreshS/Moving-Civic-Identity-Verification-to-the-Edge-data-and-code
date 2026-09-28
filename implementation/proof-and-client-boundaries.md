# Vote proof and client boundaries

This source-derived description covers the vote circuit, its client witness path, and the surrounding acceptance checks. It uses the recorded mobile revision `19e813a834e00458c967098c8230f95a1468e21f` and backend revision `392c779cc1122fa5f734520966a47e27b7495236`. Inspection took place on 2026-09-28. The core circuit, verifier, and mobile proving files inspected were unchanged from those revisions; the identity evidence and confirmation flows were read from the recorded mobile revision because later versions differ.

The tables and pseudocode use reviewer aliases. Positions, input counts, and algebraic relationships follow the inspected source, but these aliases are not the application's wire-format names. This document is explanatory pseudocode, not a circuit implementation, a proof of security, or evidence of a new experiment. Source correspondence does not establish which binary ran on a device. Artifact hashes and the measurement limitations remain in the existing evidence and methods files.

The [source inventory](../evidence/proof-source-inventory.json) records component aliases, source hashes, byte counts, and revision alignment. The identified source files are not bundled.

## Public signals and private witness

The Groth16 verifier receives nine field elements in the following order. The larger JSON proof envelope also contains metadata; membership in that JSON object does not make a value a circuit public signal.

| Position (one-based) | Reviewer alias | Meaning and circuit use |
| --- | --- | --- |
| 1 | `poll_tag` | Encoded poll identifier; included in nullifier derivation. |
| 2 | `policy_digest` | Encoded policy hash; included in nullifier derivation. The circuit does not interpret policy rules. |
| 3 | `schema_digest` | Encoded credential-schema hash; included in the credential leaf. |
| 4 | `option_digest` | Encoded option-set hash; included in both ballot commitments. |
| 5 | `option_count` | Number of selectable options. The inspected path supports one through eight. |
| 6 | `registry_root` | Root against which the private credential membership path is checked. |
| 7 | `poll_nullifier` | Poseidon output derived from the secret, poll, and policy. |
| 8 | `ballot_commitment` | Poseidon commitment combining the nullifier, opening commitment, option-set hash, and private randomness. |
| 9 | `opening_commitment` | Poseidon commitment to the selected option index, private opening randomness, and option-set hash. Its source name refers to an encrypted vote; the circuit hashes the opening fields. |

The 73 private input elements comprise a secret, an identity-key hash, an opaque claims hash, the selected option index, three option-index bits, two randomness values, 32 Merkle siblings, and 32 path-direction bits. “Private” refers to the proof interface. It does not mean that every witness field is unknown to issuance services: the identity-key and claims hashes are obtained from backend credential material.

Field encoders interpret supported hexadecimal and decimal representations as integers and reduce them modulo the BN254 scalar field. Other public strings are domain-separated, hashed with SHA-256 using their source field name, and reduced to that field. The backend also compares the original poll and digest metadata with its registered values before proof verification. Reviewer aliases must not be substituted into the application's actual domain-separated encoding.

## Constraint ledger

Let `H` denote the circuit's Poseidon hash with the displayed input arity. All hash inputs below are field elements. The opening tag is the circuit constant `1001`.

```text
private:
    secret, identity_key_hash, claims_hash
    choice, choice_bits[3], opening_randomness, ballot_randomness
    siblings[32], directions[32]

require each choice bit is Boolean
require choice = choice_bits[0] + 2*choice_bits[1] + 4*choice_bits[2]
require 1 <= option_count <= 8
require choice < option_count

leaf = H(secret, identity_key_hash, schema_digest, claims_hash)
require poll_nullifier = H(secret, poll_tag, policy_digest)
require opening_commitment = H(1001, choice, opening_randomness, option_digest)
require ballot_commitment = H(poll_nullifier, opening_commitment,
                              option_digest, ballot_randomness)

node = leaf
for level in 0..31:
    require directions[level] is Boolean
    if directions[level] == 0:
        node = H(node, siblings[level])
    else:
        node = H(siblings[level], node)
require node = registry_root
```

The option comparisons use four-bit comparator gadgets; the service separately validates the integer option count against the poll's active option list. No document signature, document image, face image, biometric score, attestation token, account identifier, or plaintext attribute predicate appears in these constraints. In particular, hashing `claims_hash` into a leaf does not prove an age or nationality predicate. The circuit proves knowledge of an opening and membership path consistent with the supplied root, subject to the proof system and setup assumptions.

Issuance records a client-supplied credential commitment alongside server-derived identity and claims metadata. Correct construction of that commitment is a client/admission boundary. Registry membership alone does not establish how a leaf was admitted or independently verify the civil-identity and biometric facts associated with it.

| Boundary | Checks in the inspected implementation | What remains outside the vote circuit |
| --- | --- | --- |
| Credential admission | The service associates registry entries with verified-identity material and a schema; repeated issuance checks existing entry consistency. | Correct identity derivation, truthful claims, issuance authorization, and recovery policy. |
| Poll authorization | The vote service checks the authenticated account, verified-identity linkage, configured country/area restrictions, poll state, and voting window. | General attribute-predicate enforcement and eligibility-policy completeness. |
| Public-input binding | The verifier checks poll, policy, schema, option-set metadata, option count, an accepted registry root, and configured artifact metadata; the engine verifies the proof using the ordered nine signals. | Correct administration of poll data, accepted roots, and cryptographic artifacts. |
| Repeat submission | The service checks the poll/nullifier pair before insertion; persistent uniqueness enforcement is described in the ballot acceptance boundary. | Person-level uniqueness across issued credentials, supported identity domains, or changing policies. |
| Ciphertext envelope | The service checks envelope metadata, the registered encryption-key hash, the ciphertext-envelope hash, and agreement of the declared opening commitment with proof metadata. | Proof that the ciphertext decrypts to the circuit's opening; decryption and opening checks belong to the separate tally path. |

The ciphertext-envelope hash is not one of the nine circuit signals. Recomputing and comparing that hash provides application-level consistency checking; it does not turn the vote circuit into a proof of correct encryption. The circuit constrains commitments to a choice and openings. Ciphertext construction is performed separately by the mobile encryption implementation.

For a fixed secret and fixed encoded poll/policy pair, nullifier derivation is deterministic. This supports repeat-use detection in that scope. The circuit does not establish that two credentials belong to different people, enforce database uniqueness, or prove that a registry root is currently authorized. Those properties depend on the surrounding services and their state.

## Mobile witness and identity boundary

The packaged mobile path obtains credential material from the backend, constructs the credential commitment locally using the secret, and requests issuance or retrieval of the credential membership path. The inspected issuance call sends the schema hash and commitment; the secret is used locally. The client derives that secret from wallet recovery material and stores its record through the application's secure-storage abstraction. The secret is available to application code for proving. These calls do not establish hardware-confined computation or protection against a compromised application process.

For a vote, the client selects an index from the ordered active options, samples opening and ballot randomness, constructs the opening commitment, and encrypts an opening object. It then constructs the private witness, invokes the native witness calculator and Groth16 prover, and assembles a proof envelope. The native iOS and Android paths read packaged witness data and a proving key and return a proof with public signals. Client adapters compare returned signals when present; the backend independently encodes the nine public signals for verification. The inspected proof-generation calls do not send the private witness to a remote prover.

The measured mobile identity flow processes document-derived identity material and invokes the local face-comparison path before confirmation. Its evidence builder requires successful liveness and likeness results and prepares derived decisions, scores, challenge results, and optional gaze results. The confirmation call sends a deterministic identity digest, normalization and method metadata, and that evidence object. Raw document and face images are not selected as top-level fields by these builders. This scoped source observation is not a packet-capture result or an audit of every storage, logging, backup, or transfer path.

The deterministic identity digest remains identifying information at issuance. Local processing therefore does not imply that the backend is unaware of civil identity or unable to correlate authenticated requests. The vote circuit does not authenticate the reported document or biometric results. Platform attestation is a separate admission control and does not make those facts circuit-proven or guarantee continuing runtime integrity. Later mobile changes, including additional transfer diagnostics and human-review handling, are outside the recorded mobile snapshot described here.

This package does not substantiate general attribute-predicate enforcement, biometric accuracy, or eligibility-policy completeness. It also does not provide an independent end-to-end privacy audit, proof-system audit, or reproduction of the measured smartphone runs.
