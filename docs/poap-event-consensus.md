# POAP_EVENT eligibility

`POAP_EVENT` is the only backend eligibility mode.  It verifies ownership of a
POAP event on Gnosis Chain (chain ID 100), at a single canonical block.  GEN,
collection-wide ERC-721, and ERC-1155 eligibility are not authorization paths.

## Consensus protocol

The leader uses only the officially documented public endpoint,
`https://rpc.gnosischain.com`. It verifies `eth_chainId` is 100, obtains its
`finalized` block, and fetches that exact number again to confirm its number and
hash before checking the wallet's POAP enumeration and `tokenEvent` values.

The validator treats the leader's height and hash as untrusted. It independently
checks chain ID 100, selects `finalized`, confirms the exact number/hash again,
repeats the ownership scan at that exact height, and accepts only identical
evidence. Timeouts, malformed replies, and validator disagreement fail closed.
Validator consensus therefore uses one public Gnosis RPC data source for
submission availability; it is not independent multi-provider RPC consensus.

The read-only `check_eligibility` method is only an advisory preview and states
explicitly that `cast_vote` rechecks authoritatively.  `cast_vote` derives the
wallet from `gl.message.sender_address`, completes this consensus before reading
or mutating a ballot/tally, and fails closed otherwise.

Safe public failure codes are `POAP_NO_MATCHING_EVENT`,
`POAP_RPC_UNAVAILABLE`, `POAP_ENDPOINT_DISAGREEMENT`,
`POAP_MALFORMED_RESPONSE`, and `POAP_SCAN_LIMIT_EXCEEDED`.  Raw endpoint
responses are never returned or included in an error.

## 128-item cost assessment

The scan starts with `balanceOf`; a balance over 128 fails closed. It enumerates
exactly indexes `0..balance-1`, never a speculative fixed set of 128 ownership
calls. At the cap, each node makes 1 `balanceOf`, 128
`tokenOfOwnerByIndex`, and 128 `tokenEvent` JSON-RPC operations.

JSON-RPC batches keep this to five leader HTTP POSTs and five per validator:
chain ID, finalized block, exact block, balance/enumeration, and event batch.
The official POAP event-holder endpoint requires `x-api-key`, so it is not a
keyless authoritative substitute.  The public RPCs have no per-request charge,
but no published GenLayer per-web-request fee is available; the local policy
baseline is approximately 0.000078628 GEN per transaction, excluding the
unpriced nondeterministic I/O component.  Batching makes the initial cap
operationally bounded; it must be re-priced against the deployed network before
raising it.
