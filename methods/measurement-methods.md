# Measurement methods

## Data available for review

The experimental results are in [evidence-summary.json](../evidence/evidence-summary.json). Its fields contain aggregate measurements, functional outcomes, software identifiers, and hashes of retained source files. [devnet-transactions.json](../evidence/devnet-transactions.json) contains the eight public transaction signatures associated with the historical four-poll cohort. The [claim-to-evidence map](claim-evidence-map.md) identifies the fields relevant to each article claim.

This package does not include individual mobile trials, proof files, witness inputs, backend span logs, database exports, or the application needed to repeat the experiments. Reviewers can check the published summaries and inspect the measurement excerpts. They cannot recompute the statistics or replay proof verification from these files alone. A source hash allows comparison with a source file if that file is available separately; the hash does not make its contents available or establish their correctness.

Run `npm test` from the repository root for local package checks. These checks concern the packaged files and reported values; they do not rerun the experiments or contact the blockchain. The [repository README](../README.md) describes the review workflow and optional public-chain checks.

## Mobile proof measurements

The build-89212 benchmark used a fixed synthetic witness for the depth-32 vote circuit packaged in the mobile app. The reported collection recorded artifact loading, witness construction, proof generation, total time, proof shape and hash, and in-process sampled memory. The `primaryMobileCohort` summary covers 50 measured-warm observations on an iPhone 15 Pro. One first-process diagnostic and ten warmups contribute to the reported offline verification count of 61 proofs, but are excluded from the measured-warm statistics.

Nearest-rank P95 and sample standard deviation are used. A first-process run is not a reboot-separated cold trial. Memory values come from an in-process sampler, so they should not be read as measurements from an external memory profiler. The summary also records that the battery range differed from the registered range.

Review `primaryMobileCohort` for the iPhone results and `legacyAndroidCohorts` for the two earlier Samsung S7 edge cohorts. Keep the Android timing cohorts separate from `legacyAndroidFunctionalObservation`: the latter is an author-confirmed workflow observation without a retained session export or stage-level timings. Neither cohort supplies evidence about a wider device population. Individual observations and offline-verification inputs are absent from this package.

## Application payload bytes

The [mobile measurement excerpt](../source-snippets/mobile-payload-measurement.js) shows how the instrumented vote path counts UTF-8 bytes in the serialized application request. It separately serializes the proof envelope, proof object, public inputs, encrypted-vote envelope, and receipt commitment to count their bytes. After the response has been parsed, it counts the compact JSON obtained by serializing that parsed value again and records the HTTP status. These are application-level counts, not a capture of the bytes transmitted over the network. The excerpt records counts without logging request or response bodies.

The retained prospective run reports one complete observation:

| Component | UTF-8 bytes | Location in this package |
|---|---:|---|
| Complete request | 4,195 | `prospectiveFunctionalRun.requestBodyUtf8Bytes` |
| Complete response | 560 | `prospectiveFunctionalRun.responseBodyUtf8Bytes` |
| Proof envelope | 2,319 | `prospectiveFunctionalRun.proofEnvelopeUtf8Bytes` |
| Proof object | 708 | This method note only |
| Public-input envelope | 1,133 | This method note only |
| Encrypted-vote envelope | 1,272 | `prospectiveFunctionalRun.encryptedVoteEnvelopeUtf8Bytes` |
| Receipt commitment | 66 | This method note only |

The component counts overlap: the proof object and public inputs are nested within the proof envelope. They should not be summed to reconstruct the complete request. The three counts retained only in this note have no corresponding field in the public JSON, and the underlying session is not included.

One observation describes that accepted exchange. It does not estimate payload variability or a latency distribution. Accordingly, `functionalGatePassed` is true while `latencyCohortPassed` and `payloadDistributionGatePassed` are false.

## Workflow timing and record linkage

The [backend timing excerpt](../source-snippets/backend-timing-span.ts) uses `performance.now()` to measure named operations and the enclosing span. It shows the permitted stage names and the fields recorded on success or failure. The excerpt does not include the operations themselves or a complete backend.

`prospectiveFunctionalRun` reports an exact mobile-to-backend run-ID match. The database linkage is narrower: it uses a unique acceptance timestamp within the backend span, rather than a public database row identifier. The mobile session retained its `proof_offline` profile label. Review these qualifications alongside the timing values and functional outcomes. The logs and join inputs needed to repeat that linkage are not public in this package.

The eight signatures in `devnet-transactions.json` cover the historical four-poll cohort. The prospective run's two successful finalized transactions are reported as a count in `evidence-summary.json`; their signatures are not included in that transaction file.

## HTTP and TLS wire bytes

No HTTP-header, TLS-record, retransmission, or connection-setup measurements are included. The application counts above cannot establish those costs. Neither a packet capture nor sanitized network-flow statistics are supplied, so wire-level costs cannot be recomputed from this package.

## Optional PostgreSQL size inspection

The package includes [a read-only SQL helper](../scripts/measure-postgres-storage.sql) for a physical table named `review_data.review_ballots` in a reviewer-owned test database. This schema and table name are public examples; no deployment-name mapping is supplied. No database, table schema, fixture dataset, or measured storage output is bundled.

The helper retains the row-size and relation-size calculations. It reports the PostgreSQL version and page size, `pg_column_size` row statistics, heap main-fork bytes, total index bytes, auxiliary bytes, and total relation bytes. PostgreSQL's [size-function definitions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE) describe these quantities; auxiliary bytes here are total bytes minus heap main-fork bytes and index bytes. Per-index output contains a local sequence number, main-fork size, and uniqueness/primary/validity flags. It omits stored rows, actual object names, relation options, and index definitions. The sequence numbers have meaning only within that output.

If you have an isolated test database with a physical table at that exact schema-qualified name, run the helper using a private connection setting and read-only credentials authorized to read all of its rows:

```sh
psql -X -q "$REVIEW_DATABASE_URL" -f scripts/measure-postgres-storage.sql
```

The output has four CSV sections with different headers, rather than one CSV table. The fixed schema-qualified name keeps table resolution independent of the connection's search path. The helper rejects views, materialized views, foreign tables, and partition/inheritance hierarchies. It also fails if row-level security would filter the queried rows. It uses a read-only, repeatable-read transaction, gives each statement a 60-second timeout, and ends with a rollback. It does not create or rename database objects.

Run this optional check only on your own isolated test data, with concurrent writes and maintenance stopped while measuring physical sizes. A view alias cannot stand in for the underlying table's storage; copies and materialized views have their own allocation history. Measurements from a reviewer-created fixture describe that fixture and must not be presented as the paper's experimental results. This helper requires no access to the CivicOS deployment. `npm test` checks its text only and does not execute SQL. The four-poll cohort is too small to establish stable heap or index overhead per row or production storage capacity.

## Public names and evidence identifiers

The SQL target and selected diagnostic labels in the [source excerpts](../source-snippets/README.md) were adapted for publication. These substitutions do not rename deployment objects or alter retained experimental records. The SQL output excludes names and definitions that could reveal a private database schema.

All files in `evidence/` retain their original contents during this naming cleanup. That includes the measured values, source and artifact hashes, software revisions, public transaction signatures, program identifier, and collection dates. Artifact basenames remain exact so a reviewer can match separately obtained files to the inventory. The transaction file's `pollCode` values are already pseudonymous grouping labels; they preserve each poll's root/result pair without publishing the private database identifier.

Serialized payload keys and paths are also unchanged: changing them could change JSON byte counts. Public chain identifiers remain linkable to public records. Aliases do not make those records anonymous or replace access controls on any private system.

## Scope of the evidence

The published evidence describes the reported mobile proof cohorts and bounded functional observations. The 4,195-byte request and 560-byte response describe one application exchange. Wire-level costs, large-dataset storage behavior, and production reliability remain unmeasured in this package. A successful package check confirms consistency of the supplied files; independent experimental reproduction requires material beyond this repository.
