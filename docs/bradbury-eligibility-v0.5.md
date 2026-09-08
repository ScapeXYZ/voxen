# V0.5 — Bradbury Eligibility Probe

Status: original probe deployment **reported finalized by the user**; revised
probe prepared locally, not deployed. **No live eligibility proof**.
Voxen voting is unchanged. Both production adapters remain unavailable and voting
requires `eligible is True`. The probe always returns `eligible: null`; its
candidate booleans are diagnostic evidence, never authorization.

## Runtime evidence (2026-09-08)

Installed client: genlayer-py 0.18.0. Direct harness: genlayer-test 0.29.2.
Linter: genvm-linter 0.11.1rc2. CLI: genlayer 0.39.2.
The client package is distinct from the IC Python runtime. The probe pins
`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, extracted
by the harness from GenVM v0.3.0-rc7. Live availability of this runtime must be
checked at deployment; a local installation does not identify Bradbury's runtime.

Inspected runtime source under:
`~/.cache/gltest-direct/extracted/v0.3.0-rc7/py-lib-genlayer-std/11rhn002yfajawsz7fai6mykznbxkxs6l91iskj5cm82c92qhy3v/genlayer/`.

| Source | Finding |
| --- | --- |
| `gl/_internal/eth.py` | EVM proxy `.balance` calls `u256(wasi.get_balance(address.as_bytes))`. Generated views use `EthCall` with address and calldata. |
| `py/evm/generate.py` | View proxy stores `_proxy_parent`, but the generated call reads `self.parent.address`: reproducible AttributeError before dispatch. Interface arguments must be positional-only, with annotations and no defaults. Both View and Write declarations are required. |
| `py/evm/calldata.py` | `MethodEncoder` encodes the literal method name; no snake_case to camelCase mapping. Use `balanceOf`, not `balance_of`, for these ERC ABIs. |
| `gl/_internal/gl_call.py` | `gl_call_generic(request, decoder).get()` dispatches through WASI and reads returned bytes. Descriptor `2**32-1` instead yields None without decoding. |
| `gl/genvm_contracts.py` | IC proxy balance access is a contract-balance facility, not evidence for arbitrary EOA access. |
| `py/types.py` | Address supports hex/base64/20-byte input and normalized `.as_hex`/`.as_bytes`; constructor does not validate checksum. There is no Address native-balance method. |
| `_internal/msg.py`, `gl/__init__.py` | Caller is `gl.message.sender_address`; origin, contract address, chain ID and value are separate fields. Value means attached funds, not wallet holdings. |
| Installed `gltest/direct/wasi_mock.py` | `get_balance` reads an in-memory dictionary populated by `deal`. It does not query chain state. |
| Installed `gltest/direct/vm.py` and loader | Chain ID comes from `_chain_id`; assigning an arbitrary `direct_vm.chain_id` attribute does not configure it. Tests set the real fixture field, and sender refresh updates message context. |

Existing Voxen ABI tests and installed decorator examples were checked alongside
implementation. The documentation's snake_case examples cannot override the
installed generator's literal-name behavior.

## Capability matrix

| Capability | Direct tests | Studio | Bradbury |
| --- | --- | --- | --- |
| Caller / chain context | Tested with injected context | Context supported; not run here | Reported caller matches; runtime chain ID is 1, EVM RPC chain ID is 4221 |
| Native GEN arbitrary EOA | Mock dictionary only | Simulated balance, no native EVM evidence | **Unproven**, not enabled for voting |
| ERC721 balanceOf(address) | ABI/transport mocked, selector `70a08231` | Native EVM contract calls unsupported | Designed EthCall path; raw workaround needs live proof |
| ERC1155 balanceOf(address,uint256) | ABI/transport mocked, selector `00fdd58e` | Native EVM contract calls unsupported | Same; explicit token ID required |
| Generated public EVM view proxy | AttributeError reproduced | Same pinned defect, plus Studio limitation | Pinned defect remains; not fixed upstream here |
| Cross-chain credential | No proof | No proof | No RPC/network selector in this EthCall request |

[Studio EVM limitations](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
and [balance documentation](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
distinguish the simulated and chain-layer environments. Studio cannot prove the
native EVM path. No Studio instance was deployed or tested in this milestone.

## Native GEN decision

**No verified safe arbitrary-EOA GEN read is established by the installed SDK.**
This is not a claim that the network makes such reads mathematically impossible.
The available WASI API is documented as querying a contract address, and the
installed local host is a mock. Neither proves EOA lookup, error semantics,
block selection or validator consistency on Bradbury.
[WASI get_balance specification](https://sdk.genlayer.com/v0.2.16/spec/02-execution-environment/03-wasi_genlayer_sdk/01-functions.html).

`native_candidate(threshold_wei)` tests the existing transport on the actual
message sender, using an empty EVM interface's `.balance`. It compares observed
wei to a positive uint256 threshold, but reports UNPROVEN_EOA_BALANCE_SEMANTICS
and null eligibility even when the comparison is true. 10 GEN = 10**19 wei.
No transfer, staking, deposit or locking method exists.

If the candidate fails, the safest next architecture to evaluate is an immutable
chain-layer helper exposing `nativeBalance(address)` returning Solidity
`account.balance`. Solidity defines this as the address's native balance in wei:
[Solidity address members](https://docs.soliditylang.org/en/latest/units-and-global-variables.html#members-of-address-types).
That verifies the EVM primitive, **not the complete IC enforcement path**.
Do not deploy or integrate such a helper until EthCall snapshot/finality behavior
is established. A production integration must pin helper address, chain and code,
derive the account from message.sender_address, recheck in the vote transaction,
and reject failed or malformed reads. Never let voters select the helper or
supply observations. No helper or attestation adapter is implemented here.
A signed attestation would additionally introduce issuer trust, freshness and
replay requirements; there is no verified attestation design in this milestone.

## Probe and controlled credentials

`contracts/eligibility_probe.py` has no storage or write methods. It offers context,
native_candidate, nft_candidate (strict strings), and nft_addresses (typed
Address arguments for CLI 0.39.2). Its `use_raw_transport=true` path directly uses
installed `MethodEncoder` and `gl_call_generic` with the same EthCall request the
broken generator intended. This bypasses the Python defect only; it does not
patch SDK files or establish that the live host accepts the request.

NFT responses must be exactly 32 bytes representing uint256. Empty/truncated/
oversized data, unavailable descriptors and transport errors reject. Zero/malformed addresses, bad thresholds, invalid token IDs and invalid
transport flags reject. Errors propagate; no false, zero, or true fallback.
The normal generated path remains selectable to reproduce the defect.

`probe-evm/src/VoxenEligibilityBadge.sol` defines two independent standard tokens:

- VoxenEligibilityBadge721: OpenZeppelin ERC721, name `Voxen Test Event Credential`,
  symbol VXTEST; constructor mints token 1 to one supplied holder.
- VoxenEligibilityBadge1155: OpenZeppelin ERC1155; constructor mints one unit of
  explicit event token 501 to one supplied holder; empty metadata URI.

Both have ordinary standard transfers and no subsequent mint/admin/upgrade entry
point. These are controlled test credentials, not the real AMA POAP. Dependencies
are OpenZeppelin v5.0.2, compiler 0.8.24, Paris EVM target; generated dependencies
and artifacts are ignored. Each local test checks standard interface support,
holder/non-holder counts and ownership changing after transfer. The ERC1155 test
also proves token 72 and token zero do not acquire membership from label text.

## Real AMA Participation #72 investigation

Attempted issuer URL:
https://portal.genlayer.foundation/community/poaps/genlayer-x-ama-participation-72

Web retrieval failed; a direct public GET returned HTTP 404 on 2026-09-08.
Search surfaced references to the slug but no verifiable issuer contract or
chain mapping. Chain/network, authoritative event ID, deployed contract and token
representation are **undetermined**. Neither ERC721 nor ERC1155 status nor
Bradbury deployment can be claimed. The slug's 72 is not a machine token ID.
No authenticated portal access or credential claim was attempted.

Even if an issuer later identifies an external EVM chain, this interface must
not be assumed to query it: the installed EthCall has no remote chain/RPC field.
No cross-chain web/API consensus adapter is implemented. Further, ERC721
balanceOf checks a collection, not one event in a shared POAP collection.
A label stays separate from credential_contract, credential_type, chain and
explicit ERC1155 token_id. Existing Voxen configuration already preserves this.

## Live proof acceptance criteria — review before revised deployment

Read-only eth_chainId requests to both requested endpoints returned `0x107d`
(4221). The user subsequently reported a finalized probe deployment (see investigation below).
No signed network transaction was executed by this debugging session.

1. Select the user's encrypted Bradbury CLI account. Record its public address,
   both RPC chain IDs, probe source hash and pinned runtime. Deploy only after
   approval. CLI deployment reports ACCEPTED; obtain FINALIZED receipt before
   treating deployment as complete.
2. GEN: call context and confirm caller equals the selected wallet. Record typed
   and raw runtime metadata; do not require runtime chain ID 4221 or treat 1 as
   Bradbury proof. Pin the trusted RPC, expected EVM chain 4221, deployment receipt
   and probe address/code in deployment/application configuration. This external
   pin is an operational prerequisite, not proof supplied by the IC. Read its
   actual chain-layer balance B at a recorded block. After deployment fees settle,
   call native_candidate with B and B+1 (requires 0 < B < 2**256-1). Compare raw
   candidate observation to B. Re-read block and balance around calls; if they
   change, repeat against a stable interval. Also compare an unfunded caller and
   repeat after a later real balance change. Matching once is insufficient to
   establish the IC host's snapshot/finality semantics. No GEN goes to Voxen.
3. If arbitrary EOA reads fail/mismatch or snapshot semantics cannot be verified,
   stop GEN integration and report the evidence. Candidate booleans do not become
   production eligibility automatically. A view call's sender can be simulated;
   it does not prove control or signed-vote consensus.
4. Deploy both controlled badges to the chosen holder wallet, leave a second
   public wallet unminted. Confirm bytecode, chain ID, constructor receipt and
   standard interface. Compare chain RPC balanceOf to the IC raw transport for
   each wallet. Holder > 0 and non-holder = 0 must match for both standards.
5. Test ERC1155 wrong token ID/zero, missing bytecode, reverts and malformed-return
   targets. Transfer the controlled tokens between checks, verify the old holder
   loses membership and new holder gains it. Record blocks and results.
6. Before changing Voxen: establish deterministic chain-state selection across
   validators and prove the read inside a signed write/consensus execution, with
   immutable proposal configuration and strict `eligible is True` authorization.
   A read-only probe cannot prove rollback, vote enforcement or consensus.

## Exact next commands

Run from repository root. Commands below with deploy or --broadcast are prepared
for review only and **were not executed**. Fill public address variables from
actual receipts/accounts; do not invent addresses. Passwords stay in interactive
keystore prompts, never arguments or environment variables.

```bash
.venv/bin/pytest tests/direct/test_voxen.py -q
.venv/bin/pytest tests/direct/test_patterns.py -q
.venv/bin/pytest tests/direct/test_eligibility_probe.py -q
.venv/bin/genvm-lint lint contracts/voxen.py
.venv/bin/genvm-lint lint contracts/eligibility_probe.py
forge install --root "$PWD/probe-evm" --no-git --shallow openzeppelin-v5.0.2=OpenZeppelin/openzeppelin-contracts@v5.0.2
forge test --root "$PWD/probe-evm"
git diff --check
```

Installation is for a clean checkout; skip it when pinned dependencies exist.

```bash
VOXEN_RPC=https://rpc-bradbury.genlayer.com
VOXEN_CHAIN_RPC=https://rpc.testnet-chain.genlayer.com
cast chain-id --rpc-url "$VOXEN_RPC"
cast chain-id --rpc-url "$VOXEN_CHAIN_RPC"
genlayer account list
genlayer account show --rpc "$VOXEN_RPC"
# If needed: genlayer account use EXISTING_ACCOUNT_NAME
# After review approval only:
genlayer deploy --rpc "$VOXEN_RPC" --contract contracts/eligibility_probe.py
# Set VOXEN_PROBE to the returned contract address; VOXEN_TX to deployment hash.
genlayer receipt "$VOXEN_TX" --rpc "$VOXEN_RPC"
genlayer code "$VOXEN_PROBE" --rpc "$VOXEN_RPC"
genlayer call "$VOXEN_PROBE" context --rpc "$VOXEN_RPC"
# Set VOXEN_WALLET to the selected caller address verified by context.
VOXEN_BLOCK=$(cast block-number --rpc-url "$VOXEN_CHAIN_RPC")
VOXEN_BALANCE=$(cast balance "$VOXEN_WALLET" --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC")
VOXEN_ABOVE=$(.venv/bin/python -c 'import sys; print(int(sys.argv[1]) + 1)' "$VOXEN_BALANCE")
genlayer call "$VOXEN_PROBE" native_candidate --rpc "$VOXEN_RPC" --args "$VOXEN_BALANCE"
genlayer call "$VOXEN_PROBE" native_candidate --rpc "$VOXEN_RPC" --args "$VOXEN_ABOVE"
cast balance "$VOXEN_WALLET" --rpc-url "$VOXEN_CHAIN_RPC"
```

For badges, use an existing Foundry-compatible encrypted keystore. If one is
needed, the installed CLI supports interactive encrypted export via
`genlayer account export --output /YOUR/SECURE/PATH/bradbury-keystore.json`.
Keep this outside the repository. Set VOXEN_KEYSTORE to that path and
VOXEN_NONHOLDER to a distinct test wallet's public address.

```bash
# After review approval only; these spend gas and create permanent contracts:
forge create --root "$PWD/probe-evm" src/VoxenEligibilityBadge.sol:VoxenEligibilityBadge721 --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast --constructor-args "$VOXEN_WALLET"
forge create --root "$PWD/probe-evm" src/VoxenEligibilityBadge.sol:VoxenEligibilityBadge1155 --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast --constructor-args "$VOXEN_WALLET"
# Set VOXEN_721 and VOXEN_1155 to the respective deployment receipt addresses.
cast code "$VOXEN_721" --rpc-url "$VOXEN_CHAIN_RPC"
cast code "$VOXEN_1155" --rpc-url "$VOXEN_CHAIN_RPC"
for VOXEN_SUBJECT in "$VOXEN_WALLET" "$VOXEN_NONHOLDER"; do
  cast call "$VOXEN_721" 'balanceOf(address)(uint256)' "$VOXEN_SUBJECT" --rpc-url "$VOXEN_CHAIN_RPC"
  cast call "$VOXEN_1155" 'balanceOf(address,uint256)(uint256)' "$VOXEN_SUBJECT" 501 --rpc-url "$VOXEN_CHAIN_RPC"
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_721" "$VOXEN_SUBJECT" ERC721 null true
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_1155" "$VOXEN_SUBJECT" ERC1155 501 true
done
```

CLI 0.39.2 automatically encodes 0x40-hex arguments as Address, hence the typed
nft_addresses entry point. `true` explicitly selects the experimental raw bypass;
`false` exercises the unchanged broken proxy. No command authorizes a vote.

## Final local validation

- `pytest tests/direct/test_voxen.py -q`: **271 passed**.
- `pytest tests/direct/test_patterns.py -q`: **28 passed**.
- `pytest tests/direct/test_eligibility_probe.py -q`: **53 passed**.
- `forge test --root "$PWD/probe-evm"`: **2 passed**, 0 failed; Solidity compilation passed.
- `genvm-lint lint contracts/voxen.py`: **0 diagnostics**, all 3 checks passed.
- `genvm-lint lint contracts/eligibility_probe.py`: **0 diagnostics**, all 3 checks passed.
- `git diff --check`: passed. Repository sources were already untracked at entry,
  so changed/new source files were also checked directly for trailing whitespace.

Historical V0.5 preparation scope (before this debugging revision):
Files edited: contracts/eligibility_probe.py, tests/direct/test_eligibility_probe.py.
Files added: this report, probe-evm/.gitignore, probe-evm/foundry.toml,
probe-evm/src/VoxenEligibilityBadge.sol, probe-evm/test/Badges.t.sol.
Downloaded dependencies and compiler/build caches are local tooling artifacts.
No Voxen main contract, frontend or LayerShield changes. No commit. No deployment.


## Live chain-context investigation (2026-09-08)

User-reported finalized original deployment:
- Probe: `0x325b8CB072959193e8b0Fd6D6adEDC42E8303Ce7`
- Transaction: `0xb694013e644b62b13b2024e18bc45b6b9dd47694412f43dee5ebc945c89dcc99`
- Read sender: `0x25c8a9c84461840500544c8b4d58C802C389dbD5`
- Read contract: the probe address above; typed `chain_id`: **1**.
- Both supplied EVM RPC checks: **4221**.

The original context method did not expose origin or message_raw. Their live
values remain unavailable; this session did not deploy or simulate replacement
code. The revised context exposes both for the next reviewed deployment.

### Findings and limits

**The probe bug is conflating host execution metadata with the EVM RPC chain ID.**
The precise server-side reason for the supplied value 1 remains **unresolved**.
There is no evidence sufficient to classify 1 as the expected Bradbury identifier,
or to diagnose a deployed SDK/runtime version mismatch. A server-side synthetic
read default/configuration is plausible, but is not established by the source
available here. Do not change the guard to accept 1 as network proof.

Evidence traced:

1. Installed pinned Python `_internal/msg.py:68` decodes calldata from stdin.
   `gl/__init__.py:142-148` takes all three addresses from that raw dictionary and
   converts its required `chain_id` to u256. There is no default, RPC lookup or
   translation from 4221 to 1. The Python runner resolves entry_data from the same
   message. `gl/genvm_contracts.py:417` also uses chain_id for create2 address
   derivation; this use does not prove an EVM network mapping.
2. Installed CLI 0.39.2 bundle `dist/index.js:55032-55053` calls readContract.
   Its bundled SDK `:50876-50916` builds `gen_call` with type=read, to, from,
   RLP-serialized calldata/leaderOnly and transaction_hash_variant (default
   latest-nonfinal). **It sends neither chain_id nor chainId.** The CLI constructs
   an unsigned read request, not the GenVM startup message. Its return decoder
   does not supply a chain ID. The default sender is account address or zero.
3. Official GenVM v0.3.0-rc7 source was downloaded read-only to
   `/tmp/voxen-genvm-rc7`, commit `b84d5b83b54a90ae40070636f285b8e0321abfbe`.
   [MessageData](https://github.com/genlayerlabs/genvm/blob/b84d5b83b54a90ae40070636f285b8e0321abfbe/executor/crates/sdk-rs/src/abi/entry.rs#L119)
   requires chain_id without a default (unlike stack/value/datetime).
   `executor/src/exe/run.rs:56-80` decodes supplied ExecutionData;
   `executor/src/lib.rs:192` forwards its message into ExtendedMessage;
   `executor/src/wasi/mod.rs:24-26` encodes the flattened message into VM stdin.
   `entry.rs:240-247` preserves chain_id during flattening, and
   `wasi/genlayer_sdk.rs:197-203` preserves it for consensus-stage contexts.
   The release contains newer Python APIs as well as compatibility runners;
   the extracted content-addressed Python dependency, not the tag's current
   Python source layout, is the probe's runtime source of truth. The downloaded
   executor is reference source, **not attestation of Bradbury's running binary**.
4. Official [transaction-context docs](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
   describe typed access and the bootloader's raw dictionary, calling chain_id
   “Current chain ID” without a Bradbury-specific mapping or read default.
   [Network docs](https://docs.genlayer.com/developers/networks) distinguish
   intelligent-contract RPC from the L2 and list Bradbury's chain as 4221.
   [gen_call docs](https://docs.genlayer.com/api-references/genlayer-node/gen/gen_call)
   show a supplied from address in simulation/read requests; this is not proof
   of control of that account.
5. No local Bradbury node checkout or execution configuration was found in the
   inspected workspace/runtime installation. GenVM's packaged executor/module
   configuration contains no Bradbury mapping. Official
   [validator GenVM configuration](https://docs.genlayer.com/validators/genvm-configuration)
   describes module/provider settings, not this chain ID assignment. The attempted
   public `genlayerlabs/genlayer-node` repository URL returned 404. The server's
   gen_call-to-ExecutionData construction and deployed configuration were thus
   not inspectable. Operator evidence comparing read and signed execution is
   needed to close the root-cause investigation.
6. Direct harness `vm.py:163` defaults to 1; loader.py injects _chain_id into
   raw stdin. Upstream GenVM `tests/templates/message.json` instead supplies 0;
   compilation and permit-test fixtures also use 0. These are test contexts,
   not evidence for Bradbury. The direct harness sender refresh updates typed
   chain_id but only sender/origin in raw context; changing _chain_id after
   deployment can create a test-only typed/raw discrepancy. Regression tests
   now inject the ID **before deployment** for consistent comparisons.

### Experimental-only revision

Removed `_chain()` and both calls to it; no replacement whitelist for 1.
A shared `_network_context()` now includes:

- runtime_chain_id: observed gl.message metadata;
- configured_target_evm_chain_id: 4221, a declared external target only;
- network_verification_status: UNPROVEN_RUNTIME_CHAIN_ID;
- probe_only: true and eligible: null.

Native and NFT observations both include this metadata. NFT output no longer
labels hardcoded 4221 as an observed chain_id. Existing transport and verification
statuses remain unchanged. context retains caller/contract/chain_id aliases,
adds sender_address/origin_address/contract_address, and returns a copy of the
full message_raw dictionary (native calldata Address/bytes values preserved).
The context chain_id alias is explicitly runtime metadata. There is no runtime
network authentication in this diagnostic contract. Deployment/application
context must pin the trusted endpoint, EVM chain, receipt, address and code until
a trustworthy runtime chain identifier is established. Even a future typed/raw
match cannot establish network identity by itself.

### Regression coverage and validation

Probe fixture now defaults to the observed runtime ID 1. Replaced the two wrong-
chain rejection tests with native and both NFT standard cases at 1, 4221 and
61127. They prove successful candidate observations still return null eligibility,
explicit unproven network metadata, and no ambiguous NFT/native chain_id field.
Expanded context test across those three IDs checks all typed/raw addresses,
chain ID agreement and full result calldata round-trip. Added
`test_context_preserves_distinct_origin` to ensure origin is not aliased to sender.
Existing malformed-response, unavailable transport, validation, generated-proxy
failure and readonly-schema tests remain.

- Probe: **53 passed** (previously 43; net +10 cases).
- Voxen: **271 passed**; patterns: **28 passed**; total **352 passed**.
- Both genvm-lint commands: **3 checks passed**, no diagnostics.
- git diff --check passed; because source files were already untracked, also
  checked changed files directly for whitespace and reviewed against saved copies.
- Only this document, contracts/eligibility_probe.py and its direct test changed.
  contracts/voxen.py SHA-256 remains
  `457fd7afb7c39f05636d58bd707b76399040cd3e2117b3f992a3eee670dc37d4`.

### Exact next Bradbury action after review

**Redeployment is required** to use the revised probe; the finalized original
address still runs the old guard. No deploy or commit was executed in this session.
After reviewing and authorizing the revised source, the next deployment command is:

```bash
genlayer deploy --rpc https://rpc-bradbury.genlayer.com --contract contracts/eligibility_probe.py
```

Record the NEW address and deployment transaction; obtain FINALIZED receipt,
verify deployed code, then use the expanded context before either candidate call:

```bash
genlayer receipt "$VOXEN_TX" --rpc https://rpc-bradbury.genlayer.com
genlayer code "$VOXEN_PROBE" --rpc https://rpc-bradbury.genlayer.com
genlayer call "$VOXEN_PROBE" context --rpc https://rpc-bradbury.genlayer.com
```

VOXEN_TX and VOXEN_PROBE above must refer to the new deployment, not the original.
Externally verify the selected endpoint's eth_chainId is still 4221 and pin its
identity before deployment. Nothing in these read results enables eligibility.
