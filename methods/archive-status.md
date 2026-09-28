# Archive and version scope

The archive DOI [`10.5281/zenodo.23000023`](https://zenodo.org/records/23000023) identifies the published version 1.0.0 evidence package used by manuscript reference [32]. It contains the historical summaries, methods, artifact inventory, measurement excerpts, and package checks available at that release.

This working tree adds implementation descriptions and reviewer checks after that archive. Its package version is `1.1.0-dev`; no new archive DOI or release date is asserted. The existing DOI must not be used as if its downloaded files include the new `implementation/` documents, source inventories, or executable models.

`CITATION.cff` describes this working supplement and lists the archived baseline under `references`. Its `cff-version: 1.2.0` is the citation-file format version, independent of the package version. The baseline DOI is deliberately absent from the supplement's top-level DOI field.

The three historical evidence JSON files remain byte-identical to the local baseline commit `9448f5918a9385a2628c3fa8399dc1632b178cc9`. The package checker verifies their fixed hashes. This preserves the recorded experimental results; it does not independently establish their derivation from private records.

For review of the supplement before archival, identify the exact repository commit supplied to the reviewer. Once a new version is archived, the manuscript reference for these additions needs that version's DOI. Zenodo's [versioning documentation](https://help.zenodo.org/docs/deposit/manage-versions/) describes the distinction between versions. This file makes no claim that a new version has been deposited.
