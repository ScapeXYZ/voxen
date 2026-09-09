# Voxen

Decisions, governed by consensus.

A Next.js frontend for eligibility-gated governance on GenLayer. Uses local fonts, CSS/SVG governance graphs, and the existing shared MetaMask provider. GenLayer, Wagmi, and Viem dependencies are preserved.

## Run

```sh
npm install
cp .env.example .env.local
npm run dev
```

Configure the four public variables documented in `.env.example`. `lib/voxen/config.ts` pins the Intelligent Contract address, Bradbury RPC, EVM RPC, and external chain ID. A wallet chain ID match alone does not establish Bradbury identity. Never add secrets to public variables.

## Data and integration

- `types/voxen.ts`: governance types, including discriminated eligibility requirements.
- `lib/voxen/sample-data.ts`: explicitly illustrative Spaces, proposals, reviews, and participation.
- `lib/voxen/data.ts`: replaceable data-source interface and fail-closed integration boundaries. No backend APIs are fabricated.
- `lib/voxen/proof.ts`: project-supplied historical Bradbury proof, separated from demo data and configurable deployment settings. It is not an independently verified RPC feed.
- Creation forms save drafts to this browser’s local storage; no contract write is made. Drafts can be inspected under `voxen:proposal-draft` and `voxen:space-draft` in browser storage. Times entered in local time are shown as UTC at proposal review.

Pending integration: implement deployed contract reads and writes using genlayer-js; verify GEN/ERC721/ERC1155 eligibility; load validator reviews, lifecycle, and authorized results; submit votes with policy enforcement; create Spaces/proposals; accept prepared Space ownership from the intended wallet. Contract submission and voting remain disabled. Do not enable writes until the deployed interface and transaction receipt handling are verified. Space proposal permissions and Guard BLOCK/WARN policies must be enforced by the contract, not just the UI.

## Routes

`/`, `/explore`, `/spaces`, `/spaces/[id]`, `/proposals/[id]`, `/create`, `/create-space`, `/live-proof`.

## Validation

```sh
npm run lint
npm run build
git diff --check
```

The inherited `lint` script runs TypeScript (`tsc --noEmit`), not ESLint. No images are generated or required.
