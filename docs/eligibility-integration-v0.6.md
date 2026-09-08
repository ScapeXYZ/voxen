# V0.6 Production Eligibility Integration

Voxen now enforces current caller holdings in `cast_vote()`. Every proposal uses
exactly one of GEN or POAP_NFT; there is no public voting mode. Holdings establish
eligibility only: one wallet has one vote, regardless of balance. Voxen never
transfers or locks GEN or credentials.

## Architecture and authorization

`contracts/voxen.py` contains internal `_native_balance` and `_credential_balance`
helpers extracted from the diagnostic probe's proven transport paths. The same
helpers are embedded in `contracts/eligibility_probe.py`; an AST regression test
keeps them identical. Both files remain standalone deployable sources with the
existing pinned GenLayer dependency. Voxen neither imports the probe contract nor
calls its deployed address. The probe remains diagnostic and its candidate fields
and `eligible=null` are never production authorization.

GEN reads `wasi.get_balance(caller.as_bytes)`, the exact host primitive behind the
probe's SDK `.balance` property. Validation precedes SDK integer coercion, rejecting
booleans, strings, negative values, overflow and unavailable values. The current
balance must be at least the proposal's positive uint256 threshold, expressed in
wei. The config explicitly stores `configured_evm_chain_id="4221"`.

NFT verification uses raw `gl_call_generic` EthCall and MethodEncoder, avoiding the
pinned SDK generated view proxy defect. ERC721 encodes `balanceOf(caller)` and
requires a balance greater than zero. ERC1155 encodes
`balanceOf(caller, credential_token_id)` and requires a balance greater than zero.
The latter ID is an explicitly configured uint256, including zero when intended.

Credential configuration separately stores `credential_label`, `credential_type`
(ERC721/ ERC1155), `credential_contract_address`, `credential_chain_id` and
`credential_token_id`. ERC721 rejects any token ID and checks collection ownership.
A friendly label such as “GenLayer X AMA Participation #72” is display text: it
never supplies token ID 72 or certifies real AMA participation. Issuer, collection
and event mapping must be correct in the proposal configuration; ERC721 collection
ownership does not distinguish events within a shared collection.

`check_eligibility` is a fresh read-only preview returning a real boolean or
raising an error. `cast_vote` independently invokes it for the transaction sender,
never a supplied wallet, origin, candidate flag or client proof. Every vote change
rechecks holdings. Losing eligibility prevents new casts and changes; an existing
ballot remains counted. All checks finish before any ballot or tally mutation.

FINAL_ON_CAST, CHANGE_UNTIL_CLOSE, hidden results, creator lifecycle controls,
proposal revision/review history, deterministic winners and ties are preserved.
Governance Guard reviews compliance only; it neither establishes eligibility nor
chooses winners or resolves ties. No override, balance setter, manual eligibility
list, user signature or balance-proof method is introduced.

## Chain trust boundary and live evidence

`TRUSTED_EVM_CHAIN_ID = 4221` explicitly pins this build to Bradbury. NFT config
for any other chain is rejected. This constant/configuration does not select a
cross-chain RPC or cryptographically establish the host's network. Deployment
operators must ensure the GenLayer endpoint and host EVM transport actually target
Bradbury and verify the intended credential address on that chain.

**Runtime chain identity remains unproven.** Bradbury currently reports
`gl.message.chain_id == 1`, while the external RPC chain ID is 4221. Production
never uses that runtime field as authorization. Successful eligibility previews
retain `network_verification_status="UNPROVEN_RUNTIME_CHAIN_ID"`; `VERIFIED`
means a valid holdings observation under the configured deployment trust boundary,
not proof of runtime network identity. No block selector or independent EVM
snapshot/finality proof is added.

The following live evidence was supplied as completed at the start of this
integration session; it was not rerun or independently reverified here:

- Signed positive and negative state-changing GEN checks reached five-validator
  consensus. The native balance candidate matched the external Bradbury EVM balance.
- Controlled ERC721 `0x346DfD1c48b054eaA2B4016fc69470A3A2b8441C`, token 1,
  moved from `0x25c8a9c84461840500544c8b4d58C802C389dbD5` to
  `0xD47619407000ce73BdbDB39F0F367D3061c285F1`. Direct EVM holdings changed
  1 to 0 and 0 to 1; GenLayer raw EthCall observed the same change.
- Controlled ERC1155 `0x3e908eFAb8f9C6DAb975f4BdcFC4e4267c6D7b97`, ID 501,
  has also moved to that recipient. Wrong ID 72 returned zero. A matching
  post-transfer raw observation is not newly claimed by this integration.
- MalformedCredential `0x829463bBd0DC31251E1c21A621Efcc9f04c99065` failed with
  “Malformed uint256 response”; RevertingCredential
  `0xbbF75475cbB35DCd75fE9b4025e75C206421945F` failed without fake eligibility.

These facts supersede historical “unproven” fixture notes in earlier runbooks
only to the extent explicitly listed above. No exploratory GEN probes were run.

## Fail-closed behavior

NFT returns must be exactly 32 bytes and decode to an exact integer in the uint256
range. Empty/no-code results, malformed lengths/types, unavailable descriptors,
reverts, transport failures, booleans, invalid integers and invalid addresses
reject the operation. Transport errors propagate, with no fallback to fabricated
zero balances or cached authorization. Valid zero holdings produce `eligible=false`
and reject casting. Addresses must be nonzero 20-byte hexadecimal strings; mixed
case requires a valid checksum. Production string configuration rejects numeric
and Address objects. The probe's separate CLI adapter still accepts exact SDK
Address or exact positive integer below 2**160; it rejects bool and uses big-endian
numeric decoding.

Direct tests mock only eligibility transport boundaries and exercise the actual
production decoder, comparisons and casting path. They cover thresholds, both
ABIs, wrong IDs, label independence, caller versus origin, loss and transfer,
first-cast and change failures, unchanged ballots/tallies, runtime metadata and
configured-chain restrictions. These local results are not additional live proof.

## Deployment and remaining proof

No deployment was performed. From the repository root, using the configured
signing account, the exact Voxen deployment command is:

```bash
genlayer deploy --rpc https://rpc-bradbury.genlayer.com --contract contracts/voxen.py
```

The constructor takes no arguments. This is a new deployment; existing deployed
contracts do not acquire these source changes. Verify finalized deployment and
source identity before testing votes.

**Remaining requirement: signed state-changing live NFT vote proof after Voxen
deployment.** Exercise ERC721 and ERC1155 current holder/non-holder casts and
credential-loss changes, confirming consensus outcomes and unchanged voting state
for rejected casts. Include wrong-ID and failure fixtures. Probe views and direct
mocks do not substitute for this proof. Runtime chain identity and host snapshot
semantics remain limitations even after such a proof.

## Local validation

With the project's `.venv/bin` prepended to PATH:

- `python -m pytest tests/direct/test_voxen.py -q`: 352 passed.
- `python -m pytest tests/direct/test_patterns.py -q`: 28 passed.
- `python -m pytest tests/direct/test_eligibility_probe.py -q`: 143 passed.
- `genvm-lint lint contracts/voxen.py`: passed, 3 checks.
- `genvm-lint lint contracts/eligibility_probe.py`: passed, 3 checks.
- `git diff --check`: passed. This checkout has untracked source files, so
  additional `git diff --no-index --check` comparisons against saved pre-edit
  copies (and `/dev/null` for this new document) also passed.

No commit, push, deployment, frontend change or LayerShield change was performed.
