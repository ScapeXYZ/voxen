# Credential discovery

The default source is the curated `credentialCatalog` in `catalog.ts`, seeded only
with the supplied Voxen Bradbury ERC1155 holder credential (token 501). There is
no live POAP index, scraping, or invented event metadata.

Configure the catalog by adding real issuer-supplied `Credential` records. There
is no name allowlist or result-count limit. `createCatalogProvider(records)` can
serve any configured collection; `CredentialProvider.search(query, signal)` and
the hook's provider argument support replacing it with an authenticated/index
adapter. Keep API secrets server-side. The picker handles loading, empty results,
errors/retry and cancellation of stale requests. Production remote providers
should add pagination if their catalogs are large.

Canonical verification metadata lives in each record's `verification`, including
provider, providerCredentialId, mode, chain, contract and token where applicable.
Selection preserves the full record in `ProposalForm.credentialMetadata` (also in
local saved drafts) and maps the canonical fields into the existing form. The
write layer revalidates the record and mapping before building create_proposal's
unchanged positional arguments. Display names are never parsed for token IDs.
Provider identity is provenance, not authentication; catalog entries must be
reviewed against the issuer's canonical deployment records.

The current contract verifies only chain 4221: ERC721 balanceOf(wallet) > 0 or
ERC1155 balanceOf(wallet, tokenId) > 0. ERC721 token-specific entries, other chains,
POAP_EVENT representations and malformed metadata are unavailable. Never map a
POAP event to its shared ERC721 collection: that would admit holders of unrelated
events. A provider may supply a supported real onchain representation only when
its ownership scope matches the credential exactly, retaining its original
providerCredentialId. Unresolved events remain unsupported.

The contract signature has no provider/event-ID fields. Provider provenance is
preserved in catalog/selection/drafts, but only contract, display label, standard,
chain and token ID persist onchain. Proposal details use those onchain fields;
provider-specific verification would require a future contract change.

“Use custom credential” exposes the original technical fields and friendly label.
Editing switches to custom settings, clearing catalog provenance. Validation
still requires a nonzero contract, chain 4221, and ERC1155 uint256 token ID (or no
token ID for ERC721). A custom label is never proof of issuer identity. Existing
manual drafts remain usable. The client balance check is a preview; cast_vote
remains authoritative.

Validation: `npm run lint`, `npm run build`, `node tests/voter-unit.cjs`, and the
three `tests/*-browser.cjs` scripts against port 3100. Browser scripts use an
installed Playwright via PLAYWRIGHT_PATH. Existing voter/create suites also need
RPC access; their wallet mocks reject writes. No live proposal/vote is submitted.
