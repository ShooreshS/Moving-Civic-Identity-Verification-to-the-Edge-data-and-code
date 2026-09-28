# Ballot storage, receipts, tallying, and public outputs

Prepared on 2026-09-28 from backend evidence revision
`392c779cc1122fa5f734520966a47e27b7495236`. The selected files were compared with
architecture revision `cc3658d05229c34cc74c48f186206c3bcc7395f8`. The request
boundary and admission service gained experiment instrumentation between those
revisions; the selected storage, audit, tally, and key-custody files are unchanged.
All selected files also match the inspected development checkout. These source
comparisons do not establish a deployed server's configuration or database state.

This is a language-neutral account of selected implementation paths. Component
and field names below are review aliases, not operational database identifiers,
addresses, or a replacement wire format. The pseudocode does not execute the
cryptographic verifier. No participant records, private keys, or deployment
settings are included.

## 1. Admission and duplicate enforcement

`REQUEST_BOUNDARY` authenticates the submission before `BALLOT_ADMISSION`
evaluates it. The proof-backed path rejects a plaintext choice in the request.
When scope, policy digest, use marker, or public proof values appear in more than
one request location, the route checks the corresponding supplied values for
consistency. The service then follows this order:

```text
ADMIT_BALLOT(authenticated_account, request):
    load the poll and its policy
    require a published, active poll within its voting window
    require the supported proof-backed mode and at most eight active options
    require the account's verified-identity association
    evaluate policy using the account and required profile attributes
    normalize the encrypted envelope using its permitted field set
    normalize the proof envelope and supported protocol metadata
    compare the opening-binding values supplied in both envelopes
    load the poll's public encryption-key contract
    compare the envelope's key fingerprint with that contract
    recompute the normalized encrypted envelope's digest
    compare that digest with the submitted proof-envelope digest
    call the vote verifier with the poll, proof, recomputed digest,
        expected ballot marker, and current active-option count
    require verifier success and the returned audit material
    check for an existing record with the same scope and use marker
    insert the allowlisted verified-ballot record
    append an accepted-ballot audit event in a separate operation
    construct and return the pending receipt
```

The verifier call is a distinct boundary. This summary does not replace its
public-input checks or the circuit constraints with a claim that every property
of the encrypted payload has been proved. Successful finalization remains a
separate outcome.

`BALLOT_LEDGER` performs the duplicate lookup before insertion. `BALLOT_SCHEMA`
also defines a database uniqueness constraint on `(SCOPE, USE_MARKER)`. That
constraint supplies the concurrent-insert barrier; the earlier lookup alone
would not. The service maps a reported uniqueness conflict to a duplicate
submission result. This is a source-level observation, not a concurrent-load
experiment or evidence that one person can never acquire multiple credentials.

There is no shared transaction around ballot insertion, audit append, and
receipt construction in this path. The recorded acceptance time is captured
before the validation work; it is not a database commit timestamp. Review models
must keep these operations separate rather than making them one atomic success.

## 2. Stored fields and identity boundaries

The combined `BALLOT_SCHEMA`, `OPENING_BINDING_SCHEMA`, and `BALLOT_LEDGER`
sources describe this conceptual record:

| Field group | Allowlisted content |
| --- | --- |
| Record placement | Record identifier, poll scope, acceptance time, creation time, optional audit-group tag |
| Duplicate and receipt material | Scope-specific use marker, ballot marker |
| Encrypted ballot | Encrypted envelope, envelope digest, separate opening binding |
| Verification evidence | Proof digest, proof-system and verification-method labels, verified status, public proof values, proof-envelope digest, verifier-key digest, circuit label |

The dedicated ballot record has no participant account identifier, canonical
identity identifier, plaintext choice field, document image, biometric template,
or location snapshot. A verified-status database constraint does not execute a
proof verifier; the application must perform verification before using this
insert path.

The encrypted envelope's permitted fields describe its format, encryption
algorithms, key reference and fingerprint, option-set digest, opening binding,
ephemeral public key, ciphertext, nonce, and authentication tag. The envelope
digest and opening binding are different values with different roles. The
former identifies the normalized encrypted envelope; the latter is the value
used for the opening-related audit tree.

Omitting direct participant identifiers from this record limits retained
linkage. It does not make the submission channel anonymous. Authentication and
eligibility evaluation use account context during the same request, and the
ballot retains timing and commitment metadata. This review does not establish
protection from an operator correlating requests, transport observations, or
other records.

`AUDIT_APPEND` builds a separate event payload from selected record references,
digests, verification labels, and time. It hashes the use marker before placing
it in that event and rejects listed sensitive field names. This is an
application-level payload check, not proof that all logs or infrastructure
telemetry are free of identifying information.

## 3. Receipts and inclusion

The initial receipt contains the poll scope, ballot marker, hashed receipt leaf,
proof digest, acceptance time, and pending publication state. It omits a
plaintext choice in the proof-backed path.

`PUBLIC_AUDIT` later reconstructs receipt membership from accepted records:

```text
LOOK_UP_RECEIPT(scope, ballot_marker):
    normalize the supplied marker and compute its receipt-leaf hash
    read accepted records ordered by acceptance time, then record identifier
    partition the ordered records into groups of at most 64
    construct the three audit trees for each group
    find matching receipt leaves
    if none match, return a not-found receipt result
    otherwise return the first match, the number of matches,
        its root and sibling path, acceptance time, proof digest,
        group position, and any stored publication reference
```

Receipt lookup uses the scope and marker without participant authentication.
Anyone possessing the marker can request this membership result. It does not
establish who submitted the ballot or recover a lost marker from a person's
identity. The inspected receipt route has no identity-based recovery step.

The three production audit trees commit separately to the use markers, ballot
markers, and opening bindings. They use the production Poseidon tree helpers.
Groups have capacity 64; a full group is eligible for publication, while a
partial tail remains pending until the poll is finalizable. The receipt returns
a locally reconstructed path and any publication reference stored by the
backend. A reported published state is not a fresh, independent chain check by
the receipt lookup itself.

Acceptance, receipt delivery, publication, and successful finalization are
separate outcomes. The inspected source and selected tests do not establish one
atomic end-to-end transaction or guaranteed finalizability of every accepted
payload. Audit material is assembled through separate repository reads; this
description does not imply that those reads share a database snapshot.

## 4. Decryption, tallying, and creator authority

`KEY_LIFECYCLE` generates an X25519 key pair and passes both public and private
key material to `KEY_STORE`. The public response is an explicit projection of
public key material, its fingerprint, algorithm labels, and custody information.
The operator's backend can retrieve the stored private key. Encryption uses
X25519 agreement, HKDF-SHA256, and AES-256-GCM; the opening logic binds its
additional authenticated data to the poll, option-set digest, and key reference.

`CUSTODY_POLICY` describes the implemented beta as operator-trusted. It allows
backend decryption and, by default, provisional per-option results during
voting. A separate trustee-policy branch refuses unsupported backend key
generation; its presence is not an implemented threshold key ceremony or
distributed decryption system. This inspection does not assess infrastructure
access controls, backups, or encryption at rest.

`TALLY_OPENING` has separate paths for provisional counts and final tally
witness material. The backend opens encrypted ballots and checks their scope,
option-set binding, opening binding, and option mapping. Finalization prepares
the required opening and randomness material for the tally prover. These
operations remain within the operator's trust boundary. The document therefore
makes no ballot-secrecy claim against that operator.

The finalization helper returns an explicit record containing the accepted-record
identifier, scope-specific use marker, ballot and opening commitments, both
randomness values, resolved option identifier/index, and acceptance time. This
selected return shape has no account or civil-identity field. Decryption first
parses a JSON object before constructing that projection; the projection is not
a claim that arbitrary encrypted input cannot contain additional data or that
all transient decrypted bytes are anonymous.

`PUBLIC_AUDIT` restricts explicit tally submission and audit publication to the
poll creator. For tally submission it requires accepted records, checks the
single-group capacity, and calls the tally verifier against the current audit
roots, accepted count, and ordered active options. The inspected version rejects
a tally submission above 64 accepted records even though receipt inclusion
supports several audit groups. Chained group tally proofs are not implemented
in this path.

Publication processes eligible groups in order and carries forward the previous
roots. Final result publication requires the verified tally path. Backend
publication records and subsequent audit updates are separate writes. These
source checks do not certify chain availability, signing-key custody, or the
completion of any particular publication.

## 5. What a reviewer or poll creator can see

The selected read services return these different levels of information:

| Output | Granularity and boundaries |
| --- | --- |
| Visible poll details | Poll and option metadata, exact accepted count, provisional and verified result summaries when available; per-option counts, percentages, and winner information. The proof-backed participant-choice slot is empty. Poll metadata may identify the creator. |
| Public audit summary | Policy and option-set digests, accepted counts, tree roots and leaf counts, group and publication state, tally proof metadata, aggregate results, and public chain references. It does not enumerate raw participant use markers or encrypted ballot rows. |
| Marker-based receipt | Membership result, matching count, group position, sibling path, timing and proof digest, plus any stored publication reference. It contains no plaintext choice or participant identity field. |
| Creator operations in this path | Authority to request tally submission and audit publication. These operations do not return a participant-to-choice table. |

The result reader prefers a verified summary when one is available and
otherwise uses the provisional summary; it also returns the two categories
separately. The accepted-record count and provisional opened-ballot count are
different quantities. A visible count is not, by itself, evidence of a verified
final tally.

These projections restrict individual-record disclosure, but aggregate counts
can still be sensitive in small polls or under repeated observation. No
minimum-group privacy threshold or noise mechanism is established by the
inspected result projection. This document covers the listed services, not an
exhaustive inventory of every administrative, database, or telemetry interface.

## 6. Evidence limits and test interpretation

The selected source tests were inspected, without execution for this supplement.
They cover duplicate rejection, production receipt fields,
aggregate reads, deterministic audit roots, marker-based inclusion, multiple
receipt groups, the tally capacity limit, synthetic encryption openings, and
key-custody behavior. `TALLY_OPENING_TESTS` and `KEY_LIFECYCLE_TESTS` use synthetic
key material and injected in-memory repositories. Source tests are evidence of
the cases they assert; they are not measurements of real participant behavior.

This source inspection did not connect to a live database or rerun an original
cohort. The public review package's synthetic checks cannot demonstrate a real
credential issuer, genuine proof generation, production database constraints,
successful chain publication, or independence from the operator. The source
aliases identify what was inspected; the pseudocode and conceptual tables above
remain an explanatory reduction of that source.

The [source inventory](../evidence/ballot-source-inventory.json) records file-byte
hashes, sizes, revisions, and alignment results for the component aliases used
here. It identifies retained source without distributing that source.
