# Voxen V0.3 voting

`cast_vote(proposal_id, option_index)` casts for `gl.message.sender_address` only.
One wallet has one ballot per proposal, with equal weight. No payment, transfer,
staking or asset locking occurs. Only GEN and POAP_NFT eligibility exist.

The proposal must be OPEN and transaction time must satisfy `start <= now < end`.
Every cast and change calls the real eligibility boundary. Only literal `True`
passes; false, null, malformed truthy values and VERIFICATION_UNAVAILABLE fail.
The GEN and credential adapters remain unavailable in production, so production
votes currently fail closed. Direct tests monkeypatch the private verifier methods
on the loaded contract class, scoped to each test. There is no public eligibility
setter, verifier selector, voter argument, or submitted proof/balance override.

FINAL_ON_CAST rejects all subsequent casts. CHANGE_UNTIL_CLOSE decrements the old
option and increments the new one without increasing participation. Same-option
changes fail as no-ops. Eligibility is rechecked on changes; a later loss of
eligibility prevents changing but does not retroactively remove a stored ballot.
Ballots retain their first cast timestamp and update their last-update timestamp.

Reads:

- `get_vote`: ballot or null; option_index is redacted until disclosure for hidden proposals.
- `has_voted`: participation boolean.
- `get_proposal_vote_count`: unique voter count.
- `get_proposal_tallies`: hidden flag, counts (null when hidden), total_votes.
- `get_proposal_result`: null until FINALIZED, then the stored result.

HIDDEN_UNTIL_CLOSE conceals choices from every caller, even the voter and creator,
through public read methods until CLOSED or FINALIZED. Participation and timestamps
remain visible. Neither get_proposal nor another public read includes hidden counts.
LIVE exposes counts. This is API-level visibility, not cryptographic ballot secrecy:
transaction inputs and underlying chain storage are not encrypted by this design.

The creator retains sole lifecycle authority. OPEN -> CLOSED requires transaction
time >= end_time and changes no ballots. CLOSED -> FINALIZED calculates a winner
only when one option has a strictly higher tally than every other option. All
highest-count ties, including zero turnout, yield TIED and null winner fields.
Final result includes status, winning_option_index, winning_option and total_votes.
No AI tie-breaker exists. No ballot or configuration edits are possible after close,
and the existing stricter configuration freeze at REVIEW remains.

Time comes exclusively from the existing timezone-aware raw transaction context
helper, with integer seconds and an exclusive end. Direct VM warp() does not refresh
that raw field in genlayer-test 0.29.2; tests explicitly inject and restore the context.
No host wall clock is consulted by the contract. Existing regression fixtures use
transaction dates later than their historical 100..200-second proposal windows.

The V0.2 runtime limitations remain: arbitrary EOA GEN balance semantics are not
proven, and the pinned SDK EVM view proxy accesses missing parent instead of
_proxy_parent. No live ownership checks or Bradbury integration tests were performed.
See eligibility-v0.2.md for the integration prerequisites. V0.3 adds no public or
hidden legacy public-voting eligibility mode and does not enable either adapter.
