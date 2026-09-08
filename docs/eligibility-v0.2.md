# Voxen V0.2 eligibility contract

Voxen has no public voting mode. Every proposal requires either GEN holding or
POAP/NFT ownership. Eligibility is membership/access control, not payment.

V0.2 adds configuration and eligibility previews, not voting. Assets remain in
wallets. No deposits, staking, transfers, locks, weight, or attestations exist.
Future voting remains one eligible wallet = one vote. No AI review is performed.

## Public API and units

`create_proposal` requires an explicit `eligibility_mode` argument, immediately
after `end_time`: exactly `GEN` or `POAP_NFT`. There is no default or legacy mode.
Omitting the argument or supplying an unsupported mode fails. Mode-specific
configuration must be valid at creation; no unconfigured proposal is stored.
The same configuration arguments are accepted by `set_proposal_eligibility`:

| Mode | Required configuration | Meaning |
| --- | --- | --- |
| GEN | `minimum_gen_balance` | Positive integer uint256 amount in wei; 10 GEN is `10 * 10**18` |
| POAP_NFT / ERC721 | `credential_contract_address`, `credential_label`, `credential_type="ERC721"`, `credential_chain_id` | Any NFT in the specified collection; token ID must be absent |
| POAP_NFT / ERC1155 | Same fields with `credential_type="ERC1155"`, plus `credential_token_id` | At least one unit of that explicit uint256 token ID; zero is a valid ID |

Chain IDs must be positive uint256 integers. Chain identity is stored explicitly;
it does not enable remote-chain access. GEN refers to native GEN on the deployment
chain, never an ERC-20 chosen by the creator. Amounts, chain IDs, and token IDs are
stored/returned as decimal strings to avoid frontend number precision loss.
Booleans, fractional amounts, strings supplied instead of integer arguments, mixed
mode fields (including empty or zero extraneous fields), and unsupported modes fail.
Floats are rejected by the runtime's calldata encoder before contract execution.

`set_proposal_eligibility` replaces the whole configuration. Only the creator can
use it, and only in DRAFT. REVIEW, OPEN, CLOSED and FINALIZED freeze it. Ordinary
`edit_proposal` preserves eligibility. Invalid configuration does not consume IDs.

`get_proposal_eligibility` returns the stored configuration. `check_eligibility`
returns that configuration plus normalized `wallet`, `eligible`, `reason`, and
`verification_status`:

- GEN: `eligible=null`, `verification_status="VERIFICATION_UNAVAILABLE"`, plus
  `required` in wei. No observed wallet balance is claimed.
- POAP_NFT: `eligible=null`, `verification_status="VERIFICATION_UNAVAILABLE"`.

The private `_verify_gen_eligibility` and `_verify_credential_eligibility` methods
are the explicit future adapter boundaries. They are disabled in **all**
environments, including Bradbury, not only in direct tests. They make no calls,
accept no balance/ownership evidence from users, and expose no admin override.
Unavailable is neither eligible nor a proven negative ownership result.

A supplied wallet preview does not prove wallet control. V0.3 casting must derive
identity from `gl.message.sender_address`, require `eligible is True`, and enforce
status and time independently. An eligibility preview never authorizes voting
on a DRAFT proposal. The preview also cannot prove that an address is an EOA rather than a
contract wallet; both can be legitimate callers.

## Address and credential semantics

Eligibility wallet/contract inputs require exactly `0x` plus 40 hexadecimal digits.
`Address` normalizes them to EIP-55. Lowercase and uppercase inputs are accepted;
mixed-case inputs must match the checksum. Zero addresses are rejected. This adds
strict EVM validation because installed `Address` also accepts base64 and does not
itself validate checksums. Existing V0.1 administration address APIs are unchanged.

The label `GenLayer X AMA Participation #72` is display text only. It does not set
an ERC token ID, event ID, contract type, or chain. ERC721 `balanceOf` counts the
whole collection: it cannot establish attendance at one event in a shared POAP
collection. An event-specific POAP adapter needs an independently verified event
mapping/API in a later milestone. V0.2 does not claim to verify such event membership.

## Runtime inspection and local evidence

Inspected the same runtime dependency as PatternTest:
`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, extracted from
GenVM `v0.3.0-rc7`; direct harness `genlayer-test 0.29.2`.

- `genlayer/gl/genvm_contracts.py`: `gl.get_contract_at(Address).balance` calls
  WASI `get_balance`. Its documented target is a contract. `self.balance` reads
  the current contract, not an arbitrary voter EOA.
- `genlayer/gl/_internal/eth.py`: `gl.evm.contract_interface` exists, with EVM
  balance properties also backed by WASI `get_balance`. This does not establish
  arbitrary EOA native-balance semantics, finality, or snapshot behavior.
- `gltest/direct/wasi_mock.py`: `get_balance` returns entries from a local
  `_balances` dictionary, defaulting to zero. `direct_vm.deal` only manipulates
  that simulation; passing such a test cannot prove real-chain EOA reads.
- `genlayer/py/evm/generate.py` and `gl/_internal/eth.py`: the pinned generated
  view proxy stores `_proxy_parent` but EthCall generation accesses `self.parent`.
  An actual interface invocation raises `AttributeError` before dispatch. We do
  not patch the SDK or rely on that broken path. Direct tests reproduce the defect.
- Both ERC ABI declarations load with the real decorator. Local `MethodEncoder`
  tests verify `balanceOf(address)` selector `70a08231` and
  `balanceOf(address,uint256)` selector `00fdd58e`, including argument bytes.
  Encoding tests do not return mock ownership or execute live EVM calls.

Reference documentation inspected on 2026-09-08:

- [GEN units, balances and Studio simulation](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [WASI get_balance contract-address semantics](https://sdk.genlayer.com/v0.2.16/spec/02-execution-environment/03-wasi_genlayer_sdk/01-functions.html)
- [EVM calls and Studio limitations](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [ERC-721 collection balance semantics](https://eips.ethereum.org/EIPS/eip-721)
- [ERC-1155 token-ID balance semantics](https://eips.ethereum.org/EIPS/eip-1155)
- [Transaction context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)

## Time preparation

`_transaction_time` parses timezone-aware `gl.message_raw["datetime"]` and computes
integer Unix seconds using integer timedelta arithmetic. It never calls `now`,
uses no host clock, and rejects absent, malformed, timezone-free, or pre-epoch
context. Subseconds are floored. `get_proposal_time_window` reports BEFORE, WITHIN,
or ENDED using inclusive start and exclusive end; it does not change lifecycle.

In the installed direct harness, `warp()` refreshes sender/origin but not the raw
message datetime. Tests therefore explicitly inject and restore only that context
field using pytest monkeypatch. These are context-fixture tests, not evidence that
warp refreshes per-transaction context. V0.1's omitted creation timestamps stay omitted.

## Bradbury integration milestone (not executed in V0.2)

Before enabling either adapter:

1. Verify deployment/runtime compatibility, the EVM proxy defect resolution, and
   read-only IC access to the native balance of actual EOAs. Compare funded and
   unfunded EOAs against trusted chain state in wei, including exact threshold,
   below/above threshold, and changing balances. Confirm which block/finality is
   read and deterministic validator agreement. Contract balances alone are not proof.
2. Deploy known ERC721/ERC1155 fixtures on the accessible chain. Confirm address,
   chain ID, bytecode and standard; exercise real EthCall encoding/decoding from
   an IC, zero/positive holdings, token ID zero, different IDs, transfers between
   checks, reverts, malformed returns, and missing contracts. Fail closed on errors.
3. Establish access to any requested external chain; native EVM interfaces alone
   provide no evidence of cross-chain routing. Do not query a same-address contract
   on the wrong chain. Prove actual POAP representation and event mapping before
   calling collection ownership proof of attendance at a specific event.
4. Verify timezone-aware transaction datetime and fresh context across transactions,
   inclusive/exclusive boundaries, and relevant view-call timestamp semantics.
5. Define eligibility recheck/snapshot policy for V0.3 voting and ensure users cannot
   submit balances, choose a verifier, or bypass unavailable verification. No asset
   movement is needed for these checks.

No Bradbury deployment, live credential check, or arbitrary EOA balance read was
performed for V0.2. Direct tests cover validation, permissions, state freezing,
structured unavailable results, ABI encoding, and injected transaction context.
