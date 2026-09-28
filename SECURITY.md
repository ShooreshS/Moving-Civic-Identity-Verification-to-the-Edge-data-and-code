# Security and privacy policy

This repository contains aggregate research evidence, public devnet identifiers, source-derived pseudocode, and limited executable examples. It does not include an operational deployment or access credentials. Reviewing the supplied files requires no connection to a CivicOS service or production database.

Public Solana devnet transaction signatures identify on-chain records; they are not signing credentials. Optional transaction lookups are read-only. The storage helper is intended only for a compatible, reviewer-owned test database with read-only credentials. Neither check requires submitting a vote, signing a transaction, or changing production data.

The public SQL helper uses a neutral schema/table name and suppresses object names and index definitions in its CSV output. Selected diagnostic labels in the excerpts are also aliases; see the [naming notes](methods/measurement-methods.md#public-names-and-evidence-identifiers). No private-name mapping is included. Public transaction identifiers and evidence provenance remain exact, so this cleanup does not make the package anonymous or erase earlier Git history.

Raw mobile exports, backend logs, identity records, private ballot records, authentication material, and key-custody material are excluded. Source hashes identify retained files but do not provide access to them. These omissions limit independent reproduction; the [measurement methods](methods/measurement-methods.md) explain which checks are possible with the public files.

Do not include credentials, private endpoints, raw experiment exports, ballot material, identity records, packet captures, or exploitable vulnerability details in a public issue. Use GitHub's private vulnerability-reporting option if it is available. Otherwise, ask the maintainer for a private reporting channel without disclosing sensitive details publicly. This repository does not promise access to private participant data or retained experiment logs.

The new implementation documents use component and record-field aliases. Source inventories publish hashes of code files, not source paths, configuration values, or the private alias mapping. Pseudocode describes the relevant trust boundaries without reproducing deployment addresses, database names, provider configuration, or instructions for exploiting an implementation weakness.

`npm run check:publication` checks manifest coverage, sensitive-looking filenames, selected credential patterns, local filesystem paths, and URL hosts outside a short public-reference allowlist. Findings identify a file, line, and rule without printing the matched content. A separate private-data key scan checks selected JSON field names. Synthetic tests exercise the scanner's rules and limitations.

These are limited checks. They do not detect every possible secret or personal record, inspect Git history or excluded files, establish that pseudocode reveals no useful architectural information, or prove that omitted implementation code is secure. Review the exact distributed files and archive separately from a development checkout. Public hashes and transaction identifiers remain linkable by design. No independent security audit of CivicOS is implied.
