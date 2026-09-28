# Small executable review examples

These dependency-free examples make two source-described operations inspectable with synthetic inputs. They do not implement the CivicOS protocol, emulate a deployment, or reproduce an experiment. Run their checks from the repository root:

```sh
node --test scripts/review-models.test.mjs
```

`deriveReviewIdentityKey` adapts the inspected backend helper: trim and lowercase a 128-character hexadecimal digest, validate it, then apply HMAC-SHA256 to that hexadecimal text with the supplied key. Input and error names are aliases. The reviewer supplies an invented key to this standalone example; production uses a server-controlled secret. Keys in the tests are explicit synthetic labels and have no deployment use. No identifier is collected or inferred. The test demonstrates normalization and derivation behavior; it says nothing about document authenticity, biometric accuracy, or account recovery.

`compareReturnedSignals` illustrates the mobile adapter's ordered comparison of nine already-encoded field elements. It uses the aliases and positions in [the circuit description](../implementation/proof-and-client-boundaries.md). For simplicity, the example accepts only canonical nonnegative decimal strings or BigInts below the field modulus. It omits production string/hex encoders and domain-separated hashing. That narrower input parser is a teaching choice, not a claim about production validation.

The adapter's absent/empty-vector case is represented as `not-checked`. A matching vector means only that the values agree in order. Neither outcome means that a proof was accepted: proof construction and backend Groth16 verification are absent. The example includes no witness, proof fixture, credential, document, ciphertext, or real ballot.

The inspected source identifiers and hashes appear in the [admission](../evidence/admission-source-inventory.json) and [proof](../evidence/proof-source-inventory.json) inventories. The models' own bytes are covered by `MANIFEST.sha256`. There is no claim of byte-for-byte equivalence between these adapted examples and the private source.
