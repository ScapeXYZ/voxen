# Phase 2 voter integration

The existing WalletProvider/WalletButton remains the wallet stack: MetaMask
connection, shortened address, copy, disconnect, and network switching. No local
account or private key is created. Space publishing is unchanged.

## Eligibility

`useVoxenEligibility` calls the uncached proposal eligibility API. The server
rereads the proposal requirements, checks the configured external EVM RPC's chain
ID, then reads native balance, ERC721 balanceOf(wallet), or ERC1155
balanceOf(wallet, configuredTokenId). All comparisons use bigint. GEN display
units are converted back to wei exactly. Credential labels are display-only.

The result is only a UX preview. `cast_vote` on Voxen rechecks the actual caller,
lifecycle, transaction time and balance/credential. No eligibility boolean or
credential label is passed as a write argument.

## Submission and monitoring

`writes.ts` uses installed genlayer-js 1.1.8's
`writeContract({address, functionName: "cast_vote", args: [id, index], value: 0n})`.
The client account is the connected address and signing goes through the existing
wallet provider. The SDK estimates gas; MetaMask displays the network fee. No
Space/proposal creation, approvals, transfers, or explicit finalization writes
are added.

Before submission, fresh proposal, time window, recorded vote, and eligibility
reads gate the attempt. The wallet/account, chain and clock are checked again
immediately before eth_sendTransaction. The contract remains the final authority
if any state changes while the wallet prompt or consensus is pending.

The hook exposes Preparing vote, Submitting, Submitted, Consensus processing,
Accepted by GenLayer, Finalized, and Failed. It tracks the EVM hash immediately
when the wallet returns it, then the GenLayer ID returned by the SDK. Session
storage holds only public transaction references for recovery. Monitoring can
recover the consensus ID from the receipt events used by this SDK. A transport
failure after broadcast remains pending and cannot silently enable a duplicate.
Monitoring resumes on returning to the proposal with the same account.

Consensus status **5 is ACCEPTED**, not finalized. Status 7 is finalized.
Both require FINISHED_WITH_RETURN to report successful execution. Accepted or
finalized transactions with FINISHED_WITH_ERROR are failed votes. A proposing
execution error is not treated as terminal before consensus decides. Unknown or
unresolved status remains processing. No finalization deadline is invented.

Accepted/finalized/failed decisions invalidate proposal/tally, ballot and
eligibility queries. A recorded FINAL_ON_CAST ballot disables further voting.
CHANGE_UNTIL_CLOSE permits a different choice inside the active window. Hidden
ballots remain redacted; the contract rejects a same-choice attempt if hidden.

## SDK limitations and remaining live verification

The SDK performs separate RPC reads and does not expose cancellation for its
write/receipt wait. The app tracks a known broadcast hash independently so status
read failures do not become a claim of transaction failure. The monitoring API
bounds waiting to 20 seconds, but an underlying SDK read may continue. A wallet
request that has not returned a hash cannot be recovered after a page reload;
check the wallet activity before retrying such an interrupted request.

GenLayer acceptance may precede finalization or an appeal. The UI reports the
observed state, polls for changes, and never promotes status 5 to Finalized.
An EVM receipt alone is not proof that the Voxen vote succeeded.

Proposal-3's window is expired. Live eligibility and read checks were performed;
no real vote was sent and no new proposal was created. A successful live wallet
vote still requires an eligible wallet and an actual active proposal.

## Validation

- `npm run lint`
- `npm run build`
- `git diff --check`
- `node frontend/tests/voter-unit.cjs`
- With the local frontend running: `PLAYWRIGHT_PATH=/path/to/playwright node frontend/tests/voter-browser.cjs`

Unit tests mock all RPC/wallet effects. Browser tests query actual proposal-3
and ERC1155 holdings for disconnected/holder/non-holder/expired states, then use
explicit route fixtures for active windows and transaction outcomes. The test
wallet rejects every send request. Fixtures do not change contract state or
introduce any production bypass.
