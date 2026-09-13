# Voxen frontend

The frontend reads and writes the deployed Voxen contract on GenLayer Bradbury
testnet. It never falls back to sample proposals, communities, results, or
transaction status.

## Product routes

- `/` introduces the governance flow and shows live proposal discovery.
- `/explore` uses `get_proposal_ids` and `get_proposal`.
- `/proposals/[id]` presents live lifecycle, eligibility, voting, tallies,
  result, and Governance Review information.
- `/create` is a five-step onchain proposal flow with two to six choices.
- `/communities` explains the deployed contract’s current limitation: it can
  read a known Community ID but has no public Community-directory API.
- `/live-proof` describes the verified Bradbury deployment and contract checks.

## Contract boundary

The client uses only the current public contract interface: proposal discovery,
proposal/eligibility/tally/result reads, eligibility check, vote, proposal
creation and transitions, and governance-review reads/request. Empty
supporting references are encoded as `null`; eligibility is checked again by
the contract when a vote is sent.

## Validation

Run `npm run lint`, `npm run build`, and `git diff --check`. Next 16’s default
Turbopack build can require a local worker port; use
`npm exec next build -- --webpack` when that sandbox-only restriction prevents it.
