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
- `lib/voxen/reads.ts`: live proposal discovery and contract-state reads.
- `lib/voxen/writes.ts`: wallet-backed proposal, review, transition, and vote submissions.
- `lib/voxen/config.ts`: the pinned Bradbury deployment and RPC configuration.

The UI uses live contract data only. It does not create local proposal drafts,
sample proposals, fake transaction hashes, or fake validator activity. Times
entered in the creation flow are converted to contract timestamps on submission.

## Routes

`/`, `/explore`, `/communities`, `/proposals/[id]`, `/create`, `/live-proof`.

## Validation

```sh
npm run lint
npm run build
git diff --check
```

The inherited `lint` script runs TypeScript (`tsc --noEmit`), not ESLint. No images are generated or required.
