# Bradbury read integration

`client.ts` uses installed genlayer-js 1.1.8 and its Bradbury chain definition.
`reads.ts` validates and adapts the six signatures in contracts/voxen.py:

- get_proposal(proposal_id)
- get_proposal_eligibility(proposal_id)
- get_proposal_time_window(proposal_id)
- get_proposal_tallies(proposal_id)
- get_proposal_result(proposal_id)
- get_vote(proposal_id, wallet)

The server-only API route `/api/voxen/proposals/[id]` returns the aggregated
proposal; adding `?wallet=0x...` reads that wallet's vote. It accepts no arbitrary
RPC endpoint, contract address, or method from requests. Responses are uncached.
The React Query hooks separate proposal and wallet state, key reads by configured
RPC/contract and wallet, and offer explicit retry without sample fallback.

`/proposals/proposal-3` and `/live-proof` query this API. Other `proposal-*` IDs
also use live reads. Explore now uses get_proposal_ids with newest-first pagination and no sample fallback (requires the new deployment). Named sample routes, Spaces, and creation forms
continue using the explicitly labeled sample data source. Historical proof
remains a separate record pinned to its original deployment.

## Semantics and SDK limits

- All four NEXT_PUBLIC configuration variables already have public Bradbury
  defaults in config.ts and frontend/.env.example. No account/key is needed.
  GenVM reads use the GenLayer RPC; EVM RPC remains the external wallet network.
- Reads explicitly select `latest-nonfinal`. This is not a finality claim.
  No numeric transaction status (including status 5) is mapped to Finalized.
  Proposal lifecycle FINALIZED is a separate contract value.
- Each view call is independent; the SDK does not provide an atomic snapshot
  across these calls. The UI reports its read time and this limitation.
- genlayer-js has no read AbortSignal option. The server bounds waiting to 20
  seconds and the browser to 25 seconds; an underlying SDK request may continue.
- Bradbury currently embeds missing-proposal UserError calldata in a Go byte
  dump. The adapter decodes it with the SDK and recognizes only the exact
  Unknown proposal ID error as unavailable. Other failures remain errors.
- Null result means no finalized result; null vote means no ballot. A redacted
  option index means the vote exists but its choice is hidden. Hidden counts
  stay hidden, never presented as zero tallies.
- The time window is the contract's transaction-time preview, independent of
  lifecycle. Proposal-3 was OPEN with an ENDED window during verification.
- Eligibility reads describe requirements, not wallet eligibility. Wallet
  verification and cast_vote are now connected; see VOTING.md. Governance Guard
  review reads and other writes remain pending.

Scheduled publication and deployment limits: see [time-driven voting](../../../docs/time-driven-voting.md).
