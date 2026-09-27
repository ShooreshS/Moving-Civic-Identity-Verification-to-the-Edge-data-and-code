# Security and privacy policy

This repository contains aggregate research evidence, public devnet identifiers, and limited measurement excerpts. It does not include an operational deployment or access credentials. Reviewing the supplied files requires no connection to a CivicOS service or production database.

Public Solana devnet transaction signatures identify on-chain records; they are not signing credentials. Optional transaction lookups are read-only. The storage helper is intended only for a compatible, reviewer-owned test database with read-only credentials. Neither check requires submitting a vote, signing a transaction, or changing production data.

The public SQL helper uses a neutral schema/table name and suppresses object names and index definitions in its CSV output. Selected diagnostic labels in the excerpts are also aliases; see the [naming notes](methods/measurement-methods.md#public-names-and-evidence-identifiers). No private-name mapping is included. Public transaction identifiers and evidence provenance remain exact, so this cleanup does not make the package anonymous or erase earlier Git history.

Raw mobile exports, backend logs, identity records, private ballot records, authentication material, and key-custody material are excluded. Source hashes identify retained files but do not provide access to them. These omissions limit independent reproduction; the [measurement methods](methods/measurement-methods.md) explain which checks are possible with the public files.

Do not include credentials, private endpoints, raw experiment exports, ballot material, identity records, packet captures, or exploitable vulnerability details in a public issue. Use GitHub's private vulnerability-reporting option if it is available. Otherwise, ask the maintainer for a private reporting channel without disclosing sensitive details publicly. This repository does not promise access to private participant data or retained experiment logs.

The package's private-data key scan checks selected JSON field names. It is not a complete secret scan or proof that omitted implementation code is secure. Descriptions of reviewed excerpts do not imply an independent security audit of CivicOS.
