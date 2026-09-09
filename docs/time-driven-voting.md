# Scheduled publication and discovery

Local implementation on frontend-v1. No deployment, transaction, image generation, or commit.

## Confirmed blocker and evidence

Before this change, `create_proposal` unconditionally stored DRAFT. `cast_vote`
required stored OPEN before checking `[start_time, end_time)`. Creator-only
`transition_proposal` required DRAFT → OPEN (or DRAFT → REVIEW → OPEN for Guard),
then OPEN → CLOSED → FINALIZED. CLOSED required transaction time >= end_time.
Hidden tallies and ballot choices required CLOSED/FINALIZED; time alone did not
reveal them. `get_proposal` returned stored state, `get_proposal_time_window`
returned an independent BEFORE/WITHIN/ENDED preview, and `get_proposal_result`
returned a result only for stored FINALIZED. Thus a frontend time-derived label
could never authorize voting.

The read-only capture in `evidence/proposal-4-lifecycle-read.json` was obtained
through the existing SDK read adapter against Bradbury contract
0xA7c7B3F81dbbC511029a9A07FDfBf97dC1A822f7. At fetchedAt
2026-09-09T18:11:16.623Z, proposal-4 was DRAFT, Guard off, with window WITHIN,
start 2026-09-09T14:18:00Z, end 2026-09-09T18:19:00Z, 10 GEN requirement,
zero participants and no recorded final result. This independently reproduces
the reported mismatch for the successful frontend publication. It is historical
evidence, not a claim that the proposal remains within its window now.

## Model and contract changes

Ordinary create_proposal now stores PUBLISHED. Its parameters and eligibility
are frozen immediately; local browser drafts remain editable before submission.
Persistent PUBLISHED/FINALIZED are separate from effective UPCOMING/LIVE/ENDED.
The effective status is returned by get_proposal_time_window; get_proposal keeps
its stored-state meaning. Reads never save a status.

cast_vote accepts PUBLISHED (and legacy OPEN), then independently enforces
start <= transaction time < end, option validity, current sender eligibility,
and the existing vote-change policy. No activation transaction is required.
Hidden tallies/choices become visible at end_time without a closing transaction.
Creator-only transition_proposal(id, "FINALIZED") records the tally result after
end_time directly from PUBLISHED. ENDED does not imply a recorded final result.
Ties remain ties. No CANCELLED state was added.

Guard-required creation remains genuinely unpublished DRAFT: it must pass the
existing REVIEW and policy checks before publication. This is an intentional
exception for the existing governance review workflow, not the public standalone
Review & publish flow (which sends Guard off). REVIEW → PUBLISHED schedules voting;
OPEN is retained as a compatibility spelling for that publication operation and
stores PUBLISHED. No frontend OPEN transaction/button exists. Once published,
Guard proposals also need no start-time transaction. Existing legacy OPEN/CLOSED
paths remain understood but new publication never stores those statuses.

Timestamp authority is unchanged: timezone-aware gl.message_raw datetime,
integer Unix seconds, no host clock or client timestamp argument. Fractional
seconds are floored. Missing, malformed, naive, or pre-epoch context fails closed.
The direct VM warp limitation remains covered through explicit context injection.

## Deployment and migration

This is B + C: contract work and a new deployment are required, not frontend-only.
Voxen does not register root upgraders or expose a code upgrade method. GenLayer's
native upgrades require those facilities in deployed code:
https://docs.genlayer.com/developers/intelligent-contracts/features/upgradability
No supported in-place upgrade path is established for this deployment.

Source edits cannot modify existing proposal-4 or its votes. The frontend retains
legacy DRAFT/REVIEW restrictions and explains the publication limitation. An
operator must separately approve deployment, verify its schema/runtime, and
switch public contract configuration. New proposal IDs restart in the new contract;
old IDs must remain associated with the old contract address. Historical proof
must stay pinned there. No state import, creator impersonation, eligibility
migration, or vote replay is implemented or authorized. Recreating old proposals
would require explicit creator authorization and new appropriate schedules.

## Discovery and frontend

Existing storage increments proposal_count only on successful creation and assigns
consecutive proposal-N IDs; there is no deletion. Only creator and Space indexes
were publicly readable. Neither a known creator list nor guessing until an RPC
error is a reliable global index. The SDK's readContract reads methods exposed by
the contract; it does not supply an application-wide proposal index:
https://docs.genlayer.com/api-references/genlayer-js/contracts

Smallest addition: get_proposal_ids(offset=0, limit=20), maximum 50, returning newest-first IDs,
total, and next_offset. It uses existing storage and includes unpublished Guard
records, clearly labeled as awaiting publication. The public API validates cursors
and decoded data, loads real details/tallies/eligibility/results, and fails visibly
on read failure. Explore loads 20 per page, offers Load more, and refreshes every
15 seconds. Filters apply to loaded pages, explicitly stated in empty states.
Newly appended proposals appear on the first page at the next refresh; duplicate IDs across independently read pages are collapsed. No hardcoded
proposal IDs, creator lists, sample fallback, or wallet requirement is used.

The currently configured deployment lacks this new method, so live discovery
will show unavailable until deployment/configuration is approved. It cannot be
advertised as operational on that older contract. Sample detail routes remain
explicitly labeled; Explore never mixes them into live results. Community IDs
are displayed from contract associations without resolving them against sample
Community names.

Cards show schedule, status, eligibility, participation and available result/tally.
Details derive time labels every second, disable voting at end, and refetch at
start/end plus every 15 seconds. Wallet submission refreshes contract state and
eligibility again. Client time is a presentation/preflight estimate; the executing
contract remains authoritative. Failed detail reads suppress actionable stale data.
GEN/ERC721/ERC1155 verification, credential picker/custom fallback, and Community
membership authorization are unchanged. Membership is never a voting prerequisite.

## Validation

Full backend `pytest -q`: 577 passed. The integration test file currently contains
no tests; this run does not claim distributed consensus or deployed execution.
Boundary casts now use creation directly with no activation helper. Coverage includes
before/start/inside/end/after, GEN and both NFT standards, vote changes, hidden/live
reads, finalization, Guard approval, timestamp validation, immutable published
configuration, nonmutating effective reads, and paginated discovery.

Frontend `npm run lint` and `npm run build`: passed. `git diff --check`: passed.
The initial sandboxed build failed because Turbopack's CSS worker could not bind
a port; the authorized retry passed. The build emits an existing stale
baseline-browser-mapping data warning.

Unit suites: voter-unit.cjs and community-unit.cjs passed. Browser suites:
lifecycle-browser.cjs, voter-browser.cjs, create-browser.cjs,
credential-browser.cjs, community-browser.cjs and context-browser.cjs passed.
Lifecycle tests use a controlled browser clock and read fixtures, covering public
disconnected discovery, automatic new-publication discovery, filters, mobile overflow, start/end boundary refetch,
and eligible/ineligible non-member behavior independently of lifecycle. Existing
voting tests retain real read-only historical checks plus mocked wallet writes.
Creation submissions and consensus monitoring are mocked. Screenshots were disabled.
No live transaction was sent. No distributed deployment validation was performed.
