# Archive and version scope

Version `1.1.0` of this evidence package is associated with Zenodo DOI [`10.5281/zenodo.23014830`](https://zenodo.org/records/23014830). This release adds source-derived implementation descriptions, source inventories, executable review examples, and reviewer checks to the earlier experimental evidence.

The earlier archive DOI [`10.5281/zenodo.23000023`](https://zenodo.org/records/23000023) identifies the published version `1.0.0` baseline. It contains the historical summaries, methods, artifact inventory, measurement excerpts, and package checks available at that release. Its downloaded files do not include the implementation descriptions, source inventories, or executable review models added in version `1.1.0`.

`CITATION.cff` describes version `1.1.0` with its DOI in the top-level `doi` field and lists the `1.0.0` baseline under `references`. Its `cff-version: 1.2.0` is the citation-file format version, independent of the package version.

The three historical evidence JSON files remain byte-identical to the local baseline commit `9448f5918a9385a2628c3fa8399dc1632b178cc9`. The package checker verifies their fixed hashes. This preserves the recorded experimental results; it does not independently establish their derivation from private records.

The manuscript's evidence-package reference should identify version `1.1.0` and DOI `10.5281/zenodo.23014830` when it cites these additions. For a later modified checkout, also identify the exact repository commit supplied to the reviewer. Zenodo's [versioning documentation](https://help.zenodo.org/docs/deposit/manage-versions/) describes the distinction between versions. Local package checks do not query Zenodo or establish that a remote upload matches this checkout; compare the files and manifest in the cited archive.
