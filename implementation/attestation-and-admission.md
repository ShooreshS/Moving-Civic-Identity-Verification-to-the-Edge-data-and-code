# Attestation and credential admission: source-derived summary

Prepared on 2026-09-28 from backend revision
`392c779cc1122fa5f734520966a47e27b7495236`, the recorded backend evidence
revision. The core authentication and admission files were also compared with
architecture revision `cc3658d05229c34cc74c48f186206c3bcc7395f8`.
Later registration changes in the development checkout are excluded from this
description. This comparison does not establish which configuration was running
on a deployed server.

The pseudocode is a language-neutral explanation of selected source paths. It is
not an executable copy, a complete protocol specification, or an independent
security audit. Names such as `AUTH_FLOW` and `IDENTITY_BINDING` are component
aliases, not service addresses or database identifiers. No real identity records,
keys, provider credentials, or deployment settings are included.

## 1. Authentication and protected sessions

`AUTH_FLOW`, `CHALLENGE_STORE`, `DEVICE_SIGNATURE`, `ATTESTATION`, and
`SESSION_GUARD` implement different checks. A device authentication key signs a
canonical payload containing the service issuer, operation purpose, platform,
challenge identifier, and challenge value. Platform evidence is separately bound
to the hash of the challenge. These checks do not prove the correctness of local
document or biometric processing.

```text
ISSUE_CHALLENGE(purpose, platform):
    generate an unpredictable challenge
    store its hash, purpose, platform metadata, expiry, and unused state
    return the challenge and the canonical payload to be signed

CHECK_CHALLENGE(id, supplied_value, requested_purpose):
    reject if absent, expired, already consumed, or purpose-mismatched
    reject if the supplied value does not match the stored hash

REGISTER(input):
    validate the request structure and required admission-result fields
    CHECK_CHALLENGE(input.challenge, registration)
    verify the device-key signature over the canonical registration payload
    resolve or create the account associated with the canonical identity key
    reject a disabled account or conflicting authentication-key association
    verify platform registration evidence using the configured verifier
    persist the authentication key and verified platform-credential state
    mark the challenge consumed and record the completion event
    apply the active-session limit, then create access and refresh state

LOGIN(input):
    CHECK_CHALLENGE(input.challenge, login)
    require an active enrolled authentication key and an active account
    require an enrolled platform credential in verified state
    verify the device-key signature over the canonical login payload
    verify a challenge-bound platform assertion against enrolled state
    mark the challenge consumed
    apply the active-session limit and create the session
    record the verified assertion state for subsequent checks

AUTHORIZE_PROTECTED_REQUEST(bearer):
    require a recognized active session for the hash of the bearer token
    reject expiry, a missing or disabled account, or a stale account generation
    update session activity and return the authenticated account context
```

This preserves the ordering in the measured registration source. Account
resolution or creation occurs before the platform verifier returns. Therefore,
failure means that this path does not issue a protected session; it does not mean
every earlier operation is rolled back. Session creation and its supporting
writes are not represented as a single atomic transaction here.

Protected requests use the session established at admission. They do not obtain
a new platform verdict on every request. Refresh handling separately checks
session/account state and token lineage, rotates tokens, and rejects detected
reuse. The summary does not establish resistance to stolen active bearer tokens.

### Platform-specific checks

The `ATTESTATION` alias covers the cryptographic verification paths below.
Whether the required identities, trust material, and provider access are
correctly configured is outside this source-inspection evidence.

| Path | Checks visible in the inspected source | Boundary |
| --- | --- | --- |
| iOS registration | Attestation structure; certificate validity, issuer linkage and signatures to the pinned Apple root; application-identifier hash; configured environment identifier; initial counter; supplied key-identifier match; certificate nonce bound to authenticator data and the challenge hash | These are app/key-context checks, not document-signature or biometric-accuracy checks. |
| iOS login | Enrolled provider and key identity; challenge hash; application-identifier hash; assertion signature under the enrolled key; a strictly advancing counter when a prior counter is stored | The implementation has encoding/signature compatibility handling. This summary is not a conformance certification or a claim of continuous device integrity. |
| Android registration/login | Provider-decoded integrity token; configured package identities; challenge nonce; recognized-app result; signing-certificate allowlist in strict verification; timestamp freshness; configured device-integrity policy; enrolled package/certificate consistency at login | Device-integrity enforcement is configuration-dependent. No universal device-rejection or permanent-integrity guarantee follows. |

Missing required evidence, malformed evidence, failed cryptographic checks,
provider failures, or mismatched configured identities cause rejection in these
verification paths. The production-verification claim must be tied to the
configured cryptographic path; development compatibility behavior is not
evidence of a production deployment's configuration.

Consumed challenges and stored iOS counters support sequential replay checks.
This review does not establish atomic challenge/counter enforcement under
simultaneous requests. No concurrent replay experiment was performed for this
document.

## 2. Canonical identity and account association

`IDENTITY_DERIVATION` receives a device-derived SHA-512 digest, not the original
national identifier. Its derivation is:

```text
d = lowercase(trim(device_digest))
require d to be a correctly sized hexadecimal SHA-512 representation
require a nonempty server secret
K = HMAC-SHA256(server_secret, UTF8(d))
```

The HMAC input is the normalized hexadecimal text. A normalization-version
number is metadata, not an additional HMAC input. Domain separation therefore
depends on the device's approved normalization before hashing. This backend
helper cannot recompute that normalization without the original identifier.

`ACCOUNT_RESOLUTION` reuses an account already associated with `K`; otherwise it
creates account and identity records. `IDENTITY_BINDING` is the separate
authenticated binding operation:

```text
BIND_IDENTITY(authenticated_account, digest, version, method):
    validate the binding operation's supported version, method, and digest
    derive K
    if K already has an account association:
        return that association, identifying same-account reuse or recovery
    if the requesting account is already associated with a different K:
        reject the conflict
    insert the association and update the account's verification state
    if insertion encounters a uniqueness conflict:
        reread the existing associations and resolve consistently or fail
```

The reviewed schema declares unique account and canonical-key associations.
This limits duplicate stored associations when those constraints are installed.
It does not prove that a submitted digest represents a valid document or its
rightful holder. Registration and authenticated binding are distinct source
paths; this pseudocode does not assume that every validation or error-recovery
branch of one path is shared by the other.

The selected identity repository persists `K` and association metadata, without
the original identifier or `d`. The service nevertheless receives `d` and can
enumerate candidates from structured identifier domains. The absence of a field
in this repository is not a guarantee about logs, memory, tracing, backups, or
crash reports. Reliable erasure of immutable strings was not established.
Changing the server secret changes `K`; no secret-rotation migration is assessed
here. Cross-domain person deduplication is outside this mechanism.

## 3. Registry credential issuance

`CREDENTIAL_ISSUANCE` derives claims from the server's identity/profile state.
The claims gate requires recorded document verification, recorded liveness, and
recorded face-to-document binding. These are admission records. Their existence
is not independent evidence that the local checks were accurate.

```text
ISSUE_OR_GET_CREDENTIAL(authenticated_account, schema, optional_commitment):
    require a linked identity, profile, and issuable recorded claims
    derive a Poseidon identity anchor from K
    compute a domain-separated hash of the canonicalized claims
    if no commitment was supplied:
        return the anchor, schema, claims hash, and commitment parameters
    validate the supplied commitment's representation
    pass the identity, schema, claims hash, commitment, and parameters to registry

REGISTRY_ADMISSION(material):
    look up an entry by identity anchor and schema, then identity record and schema
    if an entry exists:
        reject a revoked entry or different commitment/claims/issuer/parameters
        otherwise reuse it
    otherwise insert an entry after the highest active leaf index
    resolve a matching identity/schema uniqueness conflict by rereading
    build the sparse Poseidon tree from active entries at the selected depth
    retain or create its root and return the entry's membership path
```

`REGISTRY_RULES` declares uniqueness by identity-and-schema and by leaf position.
A different schema can have a separate entry. The evaluated credential tree has
depth 32. Merkle construction checks consistency of the stored leaves and paths;
it does not establish the truth of the civil-identity or biometric claims.

The admission endpoint records the submitted commitment and associated server
metadata. Correct construction of the commitment belongs to the local-client
and subsequent circuit trust boundary; this endpoint is not an independent
proof of the document/biometric computation. Concurrent insert handling and
complete credential lifecycle behavior need separate evaluation.

## 4. Recovery and revocation scope

Returning the existing canonical account avoids creating a second identity
association for the same `K`. That result alone does not restore the local
identity secret, transfer a session, or establish the right to recover an account.
Those steps rely on the surrounding admission and recovery workflow.

`AUTH_FLOW` also contains a recovery-revocation helper that advances an account's
authentication generation and revokes selected authentication/session lineages.
Its existence is evidence of a callable component, not evidence that every
recovery path invokes it. Authentication-lineage revocation is separate from
registry-credential revocation and from decisions about previously accepted
credential roots. The inspected issuance path rejects an already revoked entry;
this review does not establish immediate invalidation of every earlier proof.

## 5. Test evidence and limits

The following describes inspected private test source. These suites are not
bundled in this public package. On 2026-09-28, the identity-derivation suite alone
was executed with Bun 1.3.14 (`0d9b296a`), with environment-file loading and
dependency installation disabled and a minimal process environment: 3 tests
passed, 0 failed, and 5 expectations were checked (exit status 0). Its test and
implementation files match the measured revision and the inspected working
tree. The other seven suites were inspected, not newly executed. No provider
request, database operation, or deployed admission trial was performed for this
review. File identities are recorded in the
[admission source inventory](../evidence/admission-source-inventory.json).

| Test alias | What the inspected tests exercise | What they do not establish |
| --- | --- | --- |
| `DEVICE_SIGNATURE_TESTS` | Locally generated P-256 signatures, supported encodings, and wrong-challenge rejection | Hardware key custody or a genuine attested device |
| `ATTESTATION_TESTS` | Synthetic iOS assertion parsing/signatures and selected rejection cases; Android verdict handling with provider calls replaced by test responses | Live provider acceptance, complete certificate-chain negative coverage, or all configured device-verdict policies |
| `SESSION_GUARD_TESTS` | Injected repositories for missing, expired, revoked, disabled-account, stale-generation, and valid sessions | Deployed session storage, concurrency, or bearer-token theft resistance |
| `AUTH_LIFECYCLE_TESTS` | Mocked authentication/repository components for session replacement, token-reuse response, and the recovery helper | Real attestation or an end-to-end recovery trial |
| `IDENTITY_DERIVATION_TESTS` | Stable derivation, different-secret separation, and supported binding-version checks | Identifier authenticity or cross-domain uniqueness |
| `IDENTITY_BINDING_TESTS` | In-memory first bind, idempotence, existing-account recovery, conflicting associations, and a simulated uniqueness error | Simultaneous requests against the deployed database |
| `CREDENTIAL_ISSUANCE_TESTS` | Injected identity/profile/registry components for claims hashing, material issuance, commitment submission, and missing-identity rejection | Biometric accuracy or comprehensive negative admission coverage |
| `REGISTRY_TESTS` | In-memory uniqueness behavior, schema separation, conflict rejection, root-depth selection, and sparse-tree path reconstruction | Database isolation, complete revocation behavior, or circuit correctness |

The public description makes the source-reported gates inspectable at the
design level. It does not reproduce the private implementation or establish
deployment security. In particular, app-supplied admission outcomes, configured
platform policy, concurrent replay handling, secret recovery, and post-attestation
compromise remain separate assurance questions.
