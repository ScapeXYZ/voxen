# Voxen frontend implementation

Rebuilt the existing frontend as a governance network using warm paper backgrounds, graphite sections, a restrained cool accent, local editorial typography, and CSS/SVG node graphs. No images were generated. No commits were made.

## Routes

- `/`: governance graph, product principles, eligibility modes, Guard flow, and historical Bradbury proof.
- `/explore`: searchable Space/proposal network with a list toggle.
- `/spaces`: sample Space directory.
- `/spaces/[id]`: constitution, permissions, owners/admins, Guard policy, proposals, and recent decisions.
- `/proposals/[id]`: status, eligibility, review, policies, lifecycle, vote preview, and visibility-aware tallies. `proposal-3` is a historical proof view, not a live voting page.
- `/create`: six-step proposal form with validation and browser-local draft saving.
- `/create-space`: Space form, policy settings, and explicit pending-ownership explanation.
- `/live-proof`: supplied holder and non-holder testnet case study, pinned deployment details, and evidence limitations.
- Custom not-found handling for unknown Space/proposal IDs.

## Validation

- `npm install`: passed with elevated access required by the parent npm workspace. npm reported 53 vulnerabilities: 2 low, 33 moderate, 17 high, and 1 critical. Dependencies were not automatically force-upgraded. Four optional native package install scripts were blocked by the npm environment; the build succeeded without approving them.
- `npm run lint`: passed. This repository’s lint script runs TypeScript, not ESLint.
- `npm run build`: passed after allowing Turbopack’s local worker port outside the sandbox.
- `git diff --check`: passed.
- Temporary Playwright checks: 11 routes at 1440px, 768px, and 390px; no horizontal overflow or uncaught browser errors. Verified network/list switching, search and empty state, 2–6 option limits, invalid dates, required ERC1155 token ID, local proposal and Space draft saves, inactive Space drafts, hidden tally rendering, disabled live voting, and 404 handling.
- Desktop and mobile homepage screenshots were visually reviewed. Browser testing found and resolved a mobile step-navigation overflow.
- Non-blocking build warning: baseline-browser-mapping data is outdated.

## Data boundaries and pending integration

All directory Spaces, governance proposals, review results, eligibility context, participation, and tallies are clearly marked sample data. Bradbury proof is the historical record supplied in the project brief; it is separate from sample data and is not presented as a current RPC read. No transaction hashes or block references were supplied.

The existing shared MetaMask provider is retained. Its network settings use the configured EVM RPC and external chain ID. The application’s trusted contract address and Intelligent Contract RPC are explicitly pinned in `lib/voxen/config.ts`, independently of wallet network identity. GenLayer and Wagmi dependencies remain installed.

`lib/voxen/data.ts` exposes a typed replaceable data-source interface and fail-closed integration boundaries. Pending work includes deployed ABI mapping through genlayer-js, contract reads, credential/balance eligibility checks, validator review reads, transaction submission/receipts, vote-change and lifecycle enforcement, authorized result visibility, Space creation permissions, and intended-owner acceptance. Voting and on-chain creation remain disabled. No backend API or successful blockchain action is fabricated.

Drafts are saved only in this browser under `voxen:proposal-draft` and `voxen:space-draft`. Draft restoration/editing across visits is not implemented; stored JSON is inspectable in browser storage. A Space draft always remains inactive and confers no ownership.

## Files removed

- `components/AccountPanel.tsx`
- `components/AddressDisplay.tsx`
- `components/BetsTable.tsx`
- `components/CreateBetModal.tsx`
- `components/Leaderboard.tsx`
- `components/Logo.tsx`
- `components/Navbar.tsx`
- `lib/contracts/FootballBets.ts`
- `lib/contracts/types.ts`
- `lib/hooks/useFootballBets.ts`

## Files created

- `.gitignore`
- `app/create-space/page.tsx`
- `app/create/page.tsx`
- `app/explore/page.tsx`
- `app/live-proof/page.tsx`
- `app/not-found.tsx`
- `app/proposals/[id]/page.tsx`
- `app/spaces/[id]/page.tsx`
- `app/spaces/page.tsx`
- `components/governance/AddressDisplay.tsx`
- `components/governance/Badges.tsx`
- `components/governance/ExploreNetwork.tsx`
- `components/governance/GovernanceGraph.tsx`
- `components/governance/LiveProofPanel.tsx`
- `components/governance/SpatialCanvas.tsx`
- `components/layout/Footer.tsx`
- `components/layout/Navbar.tsx`
- `components/layout/VoxenLogo.tsx`
- `components/proposals/CreateProposalForm.tsx`
- `components/proposals/EligibilityPanel.tsx`
- `components/proposals/LifecycleTimeline.tsx`
- `components/proposals/ProposalCard.tsx`
- `components/proposals/VotingPanel.tsx`
- `components/spaces/CreateSpaceForm.tsx`
- `components/spaces/SpaceNode.tsx`
- `components/wallet/WalletButton.tsx`
- `lib/voxen/config.ts`
- `lib/voxen/data.ts`
- `lib/voxen/proof.ts`
- `lib/voxen/sample-data.ts`
- `types/voxen.ts`
- `IMPLEMENTATION.md`

## Files modified

- `.env.example`
- `README.md`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `app/providers.tsx`
- `lib/genlayer/client.ts`
- `package.json`
- `public/favicon.svg`
- `public/site.webmanifest`

The workspace installation also refreshed the parent npm lockfile, which is ignored by existing repository rules. Existing untracked `.github/` content was left untouched.

## Spatial interaction refinement

Studied the rendered GraphCon presentation and its overview/focus navigation at https://yoheinakajima.github.io/graphcon-deck/. The implementation uses an original Voxen composition, copy, visual system, and React/CSS/SVG code; no reference source code or assets were copied.

- Shared `SpatialCanvas` provides bounded pointer panning, explicit zoom controls, overview reset, keyboard arrows/+/-/0/Escape, focus navigation, and reduced-motion support. Ordinary page scrolling is not intercepted.
- Homepage has seven connected conceptual nodes, labeled directional relationships, contextual narrative, previous/next journey controls, and links to relevant sections or routes.
- Explore has major Space nodes, compact proposal nodes, a shared network context, branch-focus controls, searchable graph/list views, status/eligibility/Guard metadata, and direct node navigation.
- Mobile replaces all camera transforms with connected vertical DOM flow; all seven product explanations and Space/proposal branches remain accessible.
- Temporary browser checks cover camera controls, guided navigation, Space focusing, proposal routing, filtering, 1024/768/390/320px layouts, and reduced motion. Screenshot review covered both overview and focused states.
- Contract configuration, wallet provider, proof records, and sample/live boundaries were preserved. No dependencies or routes were added for this refinement.

Refinement files: added `components/governance/SpatialCanvas.tsx`; updated `components/governance/GovernanceGraph.tsx`, `components/governance/ExploreNetwork.tsx`, `components/proposals/ProposalCard.tsx`, `app/page.tsx`, `app/globals.css`, and this report. No files were removed in the refinement.
