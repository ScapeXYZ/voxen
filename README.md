# Voxen

Voxen is a governance platform for communities that need decisions to be understandable and verifiable. Communities can create proposals, define participation rules, collect contract-enforced votes, and follow decisions through GenLayer consensus and finalization.

## Live links

- Application: [voxen-tau.vercel.app](https://voxen-tau.vercel.app)
- Live Proof: [voxen-tau.vercel.app/live-proof](https://voxen-tau.vercel.app/live-proof)
- Source: [ScapeXYZ/voxen](https://github.com/ScapeXYZ/voxen)
- Contract explorer: [0x3da4C8759A6D0a948C918969b63bd59d44bC588F](https://explorer-studio-dev.genlayer.com/address/0x3da4C8759A6D0a948C918969b63bd59d44bC588F)

## The problem

Community governance is commonly fragmented across discussion tools, wallets, and voting applications. Participants can struggle to confirm who is eligible, which rules apply, whether a transaction finalized, and which result is authoritative.

## What Voxen does

Voxen brings proposal state and voting enforcement to a GenLayer intelligent contract. The application presents that contract state so communities can discover proposals, review participation rules, vote during an active window, and follow the resulting decision.

## Why GenLayer

GenLayer provides Voxen's intelligent-contract execution and validator-consensus layer. The contract is the authoritative source for proposal state, eligibility, voting enforcement, and tallies. The frontend tracks transaction and consensus state, and does not treat `ACCEPTED` as a successful vote: it waits for `FINALIZED`.

## Core features

- Public proposal discovery and public proposal creation
- `PUBLIC` eligibility
- Contract-enforced voting windows and one final vote per wallet
- Live results or results hidden until voting closes
- Transaction and consensus-state tracking
- Proposal lifecycle display
- Communities and governance settings
- Governance Review
- Live Proof
- Experimental, fail-closed POAP eligibility
- Responsive light and dark interface

## How the governance flow works

1. A community configures its governance settings and creates a proposal.
2. The proposal defines options, a voting window, result visibility, and participation rules.
3. Validators execute the contract transaction; the application waits for it to become `FINALIZED`.
4. Eligible wallets cast votes while the voting window is active.
5. The contract enforces the voting rules and records tallies; the application reads the resulting contract state.
6. A proposal can move through its displayed lifecycle, including Governance Review where configured, to its recorded outcome.

## Architecture

- Python GenLayer Intelligent Contract in `contracts/voxen.py`
- Generated compact deployment artifact in `artifacts/voxen.compact.py`
- Next.js frontend in `frontend/`
- `genlayer-js` for contract reads, writes, and transaction tracking
- GenLayer Transaction Kit for wallet transaction flows
- Studio Next RPC for the active network connection
- Vercel deployment for the public application

## Studio Next deployment

| Setting | Value |
| --- | --- |
| Network | GenLayer Studio Next |
| Chain ID | `61997` |
| RPC | `https://studio-next.genlayer.com/api` |
| Active contract | `0x3da4C8759A6D0a948C918969b63bd59d44bC588F` |
| Deployment transaction | `0x0c060f3b89c53bc91ad1580c24a9abeca3482de10c955089b705f19ce25236b8` |

The latest confirmed public-voting smoke test created a proposal in transaction `0x4b7e9c4f6e194798534716e90bd5fcb9759a0b01da2ae0db640fbefe7e7fb186`, cast a vote in transaction `0x19788af3245f33fe69c225e4498eda059beb6a900d59d5da77f4dbb4cb80292b`, confirmed `PUBLIC_ELIGIBLE`, and read a final tally of `[1, 0]` with one total vote.

## Run locally

```bash
git clone https://github.com/ScapeXYZ/voxen.git
cd voxen
nvm use 22
npm install
cp frontend/.env.example frontend/.env.local
npm run dev --workspace frontend
```

Open [http://localhost:3000](http://localhost:3000).

## Environment configuration

Copy `frontend/.env.example` to `frontend/.env.local`. It contains public frontend configuration only:

```dotenv
NEXT_PUBLIC_VOXEN_CONTRACT=0x3da4C8759A6D0a948C918969b63bd59d44bC588F
NEXT_PUBLIC_GENLAYER_RPC=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EVM_RPC=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_NETWORK_NAME=Studio Next
```

Do not commit local environment files or credentials.

## Verify the project

1. Open the [live application](https://voxen-tau.vercel.app).
2. Open Live Proof and confirm Studio Next, chain ID `61997`, and the deployed contract.
3. Connect a funded GenLayer wallet.
4. Create a proposal with `PUBLIC` eligibility, two options, and an active voting period.
5. Wait until the creation transaction is `FINALIZED`.
6. Open the new proposal.
7. Confirm `PUBLIC_ELIGIBLE`.
8. Select an option and cast a vote.
9. Wait until the vote transaction is `FINALIZED`.
10. Refresh the proposal and confirm the tally increased.
11. Attempting another final vote from the same wallet must be rejected by the contract.

Use a new active proposal; do not rely on an expired hardcoded proposal.

## Automated smoke test

```bash
node scripts/smoke-public-vote.mjs
```

The script verifies the chain and signer, creates a `PUBLIC` proposal, waits for finalization, derives the proposal ID through contract reads, checks `PUBLIC_ELIGIBLE`, casts one vote, and reads the final tally. Writes require a funded Studio Next account and the project's configured keystore flow. It does not print or document a keystore path, password, or private key.

## Testing and validation

```bash
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
python3 tools/build_voxen_compact.py --check
python3 -m py_compile contracts/voxen.py artifacts/voxen.compact.py
git diff --check
```

## Known limitations

- POAP eligibility is experimental and fails closed when external verification is unavailable.
- Studio Next is a test network.
- The current contract does not expose a public per-wallet ballot-status view after a page reload; duplicate voting remains contract-enforced.
- Direct local GenVM tests may require the exact runner version pinned by the project.

## Roadmap

- Public voter-status read
- Improved proposal receipt decoding
- Community-to-proposal indexing
- Additional credential adapters
- Governance summaries and evidence review
- Notifications and analytics
- Production-network deployment when available

## Repository structure

```text
contracts/  Python GenLayer intelligent contract source
artifacts/  Generated compact deployment artifact
frontend/   Next.js application
scripts/    Deployment and public-vote smoke-test scripts
tests/      Contract test suites
tools/      Artifact build and consistency tooling
docs/       Project notes and technical documentation
```
