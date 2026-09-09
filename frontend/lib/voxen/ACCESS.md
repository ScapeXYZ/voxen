# Voxen access model

Public/light routes: `/`, `/explore`, `/proposals/[id]`, `/live-proof`.
Anyone may browse public information, proposal details, status, results and history.
Connecting a wallet enables proposal eligibility checks and voting subject to the
proposal's GEN/ERC721/ERC1155 rule, voting window and voting policy. No Community
membership is required for public voting. Membership never grants voting eligibility.

Community/full routes: `/communities`, `/communities/[id]`, `/create-community`.
The directory and explicitly public Community overview remain visible to everyone.
Full dashboard and management require authoritative whitelist membership. Owner and
admin roles additionally govern management; member proposal creation also needs the
Community's policy. Legacy `/spaces` and `/create-space` URLs redirect.

## Implemented/live

Existing Bradbury proposal reads, eligibility, create_proposal and cast_vote integrations
are preserved. Public creation accepts no Community selector or URL association;
legacy drafts clear sample associations and Guard on restore. The serializer still
passes null for contract space_id and rejects nonempty associations. Token-501 credential
configuration is unchanged. Explore still displays a labeled sample network and links
to live proof; it is not a live proposal registry.

Proposal.creator is the onchain sender. communityId maps existing space_id reads;
representedEntity is optional future attribution, currently null for live reads. An
operator may use public creation for a requester without a workspace. There is no
hardcoded operator identity, new operator privilege, or onchain attribution field.

## UI prepared, not authorization

CommunityAccess describes wallet, communityId, role and whitelisted. Community models
include owner/admins, optional whitelist/rules/Guard configuration and active state.
Sample owner/admin addresses are display data only. The access endpoint always returns
503 unavailable until an authoritative registry adapter exists; it never grants access.
The UI handles disconnected, checking, denied, unavailable and verified states. Wallet
or Community changes immediately invalidate displayed grants; requests are aborted.
Inactive Communities remain locked. Prepared member and management controls are disabled.
Browser tests intercept access responses to exercise roles, without production fixture
flags, local-storage membership or URL-controlled grants. Create Community saves only
a local planning draft and does not activate or manage a Community.

## Required Community contract/backend work

The repository contract already defines Space ownership/admin and governance methods;
these have not been connected to the new Community UI. Its existing OPEN proposal
permission is not Community whitelist enforcement. Extend/integrate this compatibly
rather than assuming the frontend renaming changes contract behavior.

Implement authoritative Community registry, owner/admin grants and revocations, wallet
whitelist, active state and role/policy checks. Authenticate private backend requests
with a verified wallet session (address query parameters are not authentication), and
authorize every protected read and write, including proposal management, rules, Guard,
configuration, membership, admin and ownership updates. Do not return private workspace
data through the public sample data source. Revalidate revoked/expired membership.
Frontend hiding and response parsing provide no security boundary.

Add represented/requesting entity attribution separately from the creator when supported;
do not change deployed signatures just for terminology. Community access must remain
separate from contract-enforced proposal eligibility. No Community functionality is
claimed live by this frontend preparation.

Validation: npm run lint; npm run build; git diff --check; node tests/voter-unit.cjs;
PLAYWRIGHT_PATH=<installed playwright> node tests/{community,create,credential,voter}-browser.cjs
(run each script individually against VOXEN_TEST_URL). Browser wallets reject all actual
write requests; consensus/access fixtures are intercepted locally.

## Validation result for this correction

Passed: lint, production build, diff whitespace check, voter-unit, community-unit,
community-browser, create-browser, credential-browser and voter-browser. Browser
coverage includes public disconnected/connected wallets; proposal-3 live reads,
holder/non-holder eligibility; all prepared Community access/role states; wallet
changes, wrong Community responses; desktop/mobile. Wallet write requests were
rejected by test providers, with transaction lifecycle responses mocked. No live
transaction was sent. Build required execution outside the sandbox for Turbopack's
local port. Existing baseline-browser-mapping freshness warning remains.

Changed for access correction: app home/explore/create/not-found; new communities
and create-community pages; old spaces/create-space redirects; Navbar/Footer;
GovernanceGraph/ExploreNetwork; SpaceNode/CreateSpaceForm; ProposalCard,
ProposalDetails/CreateProposalForm; new CommunityWorkspace and Community access API;
voxen types/data/sample-data/reads/create-proposal; community-access and this document;
new community unit/browser tests and the create browser selector assertion. Existing
uncommitted live integration work was retained. No CSS/identity redesign was made.
