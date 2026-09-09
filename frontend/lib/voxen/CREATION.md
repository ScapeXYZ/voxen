# Phase 3: standalone proposal creation

The existing five-step `/create` form submits through `createProposal` in
`writes.ts` and `useCreateProposal`. The shared wallet write helper uses the
installed genlayer-js 1.1.8 `writeContract` API, with no keys or automatic writes.

## Exact contract mapping

`create-proposal.ts` validates and encodes these 17 positional arguments in the
order declared by `contracts/voxen.py`:

| Position | Contract parameter | Form value |
|---|---|---|
| 1 | title | Title |
| 2 | description | Description |
| 3 | options | 2–6 distinct, non-empty option strings |
| 4 | start_time | Local date/time converted to Unix seconds at submission |
| 5 | end_time | Local date/time converted to Unix seconds at submission |
| 6 | eligibility_mode | UI GEN_HOLDING → contract GEN; POAP_NFT → POAP_NFT |
| 7 | space_id | null (standalone only in this phase) |
| 8 | evidence_url | Trimmed optional supporting reference URL, or null |
| 9 | governance_guard_required | Always false for public creation |
| 10 | result_visibility | LIVE or HIDDEN_UNTIL_CLOSE |
| 11 | vote_change_policy | FINAL_ON_CAST or CHANGE_UNTIL_CLOSE |
| 12 | minimum_gen_balance | GEN minimum converted exactly to bigint wei, otherwise null |
| 13 | credential_contract_address | NFT address, otherwise null |
| 14 | credential_label | NFT display metadata, otherwise null |
| 15 | credential_type | ERC721 / ERC1155, otherwise null |
| 16 | credential_chain_id | 4221 for NFT, otherwise null |
| 17 | credential_token_id | Explicit bigint ERC1155 token ID; null for ERC721 and GEN |

The requested GEN_HOLDING contract enum differs from this repository's contract:
`_eligibility_config` accepts **GEN**, not GEN_HOLDING. Sending GEN_HOLDING would
be rejected. The UI name remains GEN holding and the write adapter uses GEN.

All currently listed Spaces are samples. Their options are disabled for new
selection; restored sample drafts can be edited/saved, but cannot be submitted.
No real Space ID is fabricated. The contract forbids Guard on standalone
proposals, so this live path keeps Guard off. Space association and Guard review
remain separate future work, not silently ignored write parameters.

## Transaction and draft behavior

The wallet and external chain are checked before submission and again before
opening the wallet transaction prompt. Preparing proposal, Submitting, Submitted,
Consensus processing, Accepted by GenLayer, Finalized and Failed use the Phase 2
transaction monitoring API. Status 5 is accepted; status 7 is finalized only
with successful execution. An EVM receipt alone never means proposal creation
succeeded. Known broadcast hashes are kept for resuming monitoring; a monitoring
failure cannot silently enable duplicate submission.

Drafts can be saved before connecting, including incomplete drafts. They store
readable date/time input strings; the review displays the browser's timezone.
Submission does not delete or overwrite the saved draft, including on failure
or success. A successful creation can be followed by an explicit Start another
proposal action; nothing is automatically submitted.

## Returned proposal ID limitation

In genlayer-js 1.1.8, `writeContract` returns the **GenLayer transaction ID** after
the EVM receipt, not the Python method return value. `getTransaction` exposes
status/execution metadata and a `txReceipt` hash, not a decoded creation result.
The debug trace API has a `return_data` string, but no verified receipt/round
binding and decoding path has been established for the accepted creation result.
It is not used to guess an ID from a trace, latest proposal count, or creator list.

After accepted successful execution, the form shows **Proposal created**, the
transaction reference and an honest unavailable-link message. It does not show
View proposal or navigate to an invented ID. A verified return-value retrieval
path remains necessary to enable that CTA.

## Manual live smoke test

1. Open `/create`, choose **Load live test settings**.
2. Review the five steps. The preset uses the requested title/description,
   Approve/Reject, a start one minute ago and end four hours later, ERC1155 token
   501 at 0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b on chain 4221, the Voxen
   ERC1155 Holder Credential label, Guard off, LIVE and FINAL_ON_CAST.
3. Connect the intended wallet, confirm the local timezone and submit manually.

The contract creates a **DRAFT** proposal. Opening it for voting requires the
creator's separate transition_proposal action. This phase does not automatically
open proposals or add lifecycle writes. No real proposal was created during
implementation or tests.

## Validation

- npm run lint
- npm run build
- git diff --check
- node frontend/tests/voter-unit.cjs (includes create argument mapping/guards)
- PLAYWRIGHT_PATH=/path/to/playwright node frontend/tests/create-browser.cjs

Browser tests cover disconnected and connected review, draft retention, GEN/NFT
forms, validation, mobile layout and transaction lifecycle fixtures. The wallet
rejects every send request, and acceptance/finalization are explicitly mocked.


## Public context and future Community workflow

Public creation starts with two blank choices. Proposal details includes one optional
Proposal Context reference; preview parses HTTP(S) hostnames locally without fetching.
The five steps are Proposal details, Voting choices, Voting period, Who can vote?,
and Review & publish. The live fixture helper is development-only.

SupportingSource is a future Community model, not deployed calldata. Multiple sources
require backend/contract storage and read support; never concatenate URLs into evidence_url.

Community Governance Review controls must wait for authoritative Community integration,
rules, and creator permissions. Future choices are “Standard” (Publish without an
automated governance review.) and “Review against Community rules” (GenLayer validators
evaluate whether the proposal follows this Community's governance framework.).
Description: “Review this proposal against the Community's governance rules before voting begins.”

contracts/voxen.py currently permits creator-only edit_proposal in DRAFT or guarded REVIEW;
OPEN freezes configuration. Edits after a completed current review increment revision.
request_governance_review requires the creator, a real Space, Guard enabled and REVIEW.
Review records preserve proposal_revision, rules_revision, input_snapshot and created_at;
get_governance_review_ids/get_governance_review expose history. Frontend edit/re-review
writes and authoritative review/history reads remain to be integrated. Do not infer
revision numbers from edit counts. Rules/sources/concerns lists are not contract result
fields; do not fabricate them. Existing live reads do not populate review results.
