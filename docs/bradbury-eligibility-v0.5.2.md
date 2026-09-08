# V0.5.2 — Controlled ERC721 / ERC1155 Bradbury proof runbook

Status: V0.5.2.1 CLI address-decoding hardening validated locally; **live NFT proof remains unproven**.
The preparation notes below are historical except where updated by the live finding.
No deployment, network transaction, GEN experiment, frontend edit, Voxen integration
or commit was performed. GEN signed-write proof is accepted as complete per user.
The explicit instruction not to deploy automatically limits this session to
preparation. Execute the following commands manually when ready.

The existing badges are controlled fixtures, **not the real GenLayer AMA POAP**.
ERC721 constructor mints token 1; ERC1155 constructor mints one unit of token
501. Wrong token 502 is chosen explicitly for this fixture. Human label “#72”
is not a token ID. Keep the badges unmoved throughout the comparison interval.

## Setup and deployment commands (not executed)

Run from repository root in bash. Replace each placeholder with a verified public
address or your existing encrypted keystore path. Do not paste private keys.
The holder and non-holder must be distinct, nonzero wallets. No funding or key
for the non-holder is necessary for these reads.

```bash
VOXEN_RPC=https://rpc-bradbury.genlayer.com
VOXEN_CHAIN_RPC=https://rpc.testnet-chain.genlayer.com
VOXEN_HOLDER='<holder public address>'
VOXEN_NONHOLDER='<distinct non-holder public address>'
VOXEN_KEYSTORE='<absolute encrypted Foundry-compatible keystore path>'
VOXEN_PROBE='<finalized existing EligibilityProbe address>'
cast chain-id --rpc-url "$VOXEN_RPC"
cast chain-id --rpc-url "$VOXEN_CHAIN_RPC"
genlayer code "$VOXEN_PROBE" --rpc "$VOXEN_RPC"
sha256sum contracts/eligibility_probe.py
```

Stop unless both external chain IDs are 4221. Verify the existing probe source
includes `nft_addresses` and its raw transport validation, matching the local
source, including the V0.5.2.1 `_cli_address` normalization. The live V0.5.2
probe requires replacement deployment to receive this fix. The command is:

```bash
genlayer deploy --rpc "$VOXEN_RPC" --contract contracts/eligibility_probe.py
# Set VOXEN_PROBE and VOXEN_PROBE_TX from the actual deployment output.
genlayer receipt "$VOXEN_PROBE_TX" --rpc "$VOXEN_RPC"
genlayer code "$VOXEN_PROBE" --rpc "$VOXEN_RPC"
```

Wait for FINALIZED before using a replacement probe. Deploy controlled badges
and two failure fixtures with the existing encrypted EVM account:

```bash
forge create --root "$PWD/probe-evm" src/VoxenEligibilityBadge.sol:VoxenEligibilityBadge721 --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast --constructor-args "$VOXEN_HOLDER"
forge create --root "$PWD/probe-evm" src/VoxenEligibilityBadge.sol:VoxenEligibilityBadge1155 --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast --constructor-args "$VOXEN_HOLDER"
forge create --root "$PWD/probe-evm" src/UnavailableCredential.sol:MalformedCredential --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast
forge create --root "$PWD/probe-evm" src/UnavailableCredential.sol:RevertingCredential --rpc-url "$VOXEN_CHAIN_RPC" --keystore "$VOXEN_KEYSTORE" --broadcast
```

Record each transaction hash and address from output. Set VOXEN_721, VOXEN_1155,
VOXEN_MALFORMED, VOXEN_REVERTING and corresponding *_TX variables from those
outputs, then verify successful receipts and nonempty bytecode:

```bash
for VOXEN_TX in "$VOXEN_721_TX" "$VOXEN_1155_TX" "$VOXEN_MALFORMED_TX" "$VOXEN_REVERTING_TX"; do
  cast receipt "$VOXEN_TX" --rpc-url "$VOXEN_CHAIN_RPC"
done
VOXEN_BLOCK=$(cast block-number --rpc-url "$VOXEN_CHAIN_RPC")
for VOXEN_TARGET in "$VOXEN_721" "$VOXEN_1155" "$VOXEN_MALFORMED" "$VOXEN_REVERTING"; do
  cast code "$VOXEN_TARGET" --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
done
cast code "$VOXEN_NONHOLDER" --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
```

Require receipt status 1 and code other than `0x` for all four deployments.
For the no-code test below require non-holder code exactly `0x`; if it has code,
select another distinct EOA and repeat the non-holder checks.

## Direct EVM and GenLayer holder / non-holder commands

```bash
for VOXEN_SUBJECT in "$VOXEN_HOLDER" "$VOXEN_NONHOLDER"; do
  cast call "$VOXEN_721" 'balanceOf(address)(uint256)' "$VOXEN_SUBJECT" --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
  cast call "$VOXEN_1155" 'balanceOf(address,uint256)(uint256)' "$VOXEN_SUBJECT" 501 --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_721" "$VOXEN_SUBJECT" ERC721 null true
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_1155" "$VOXEN_SUBJECT" ERC1155 501 true
done
cast call "$VOXEN_1155" 'balanceOf(address,uint256)(uint256)' "$VOXEN_HOLDER" 502 --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_1155" "$VOXEN_HOLDER" ERC1155 502 true
```

| Case | Direct balance | Probe observed_balance | candidate_holds_credential |
| --- | --- | --- | --- |
| ERC721 holder | 1 | "1" | true |
| ERC721 non-holder | 0 | "0" | false |
| ERC1155 holder, 501 | 1 | "1" | true |
| ERC1155 non-holder, 501 | 0 | "0" | false |
| ERC1155 holder, wrong ID 502 | 0 | "0" | false |

These are expected results, not observations. Every successful probe response
must also have `eligible=null`, `probe_only=true`, and
`verification_status=PROBE_ONLY_NOT_AUTHORIZATION`. Check returned wallet,
contract, credential_type and token_id against each request. `true` explicitly
selects the raw transport bypass; the pinned generated SDK proxy has a known
local failure. CLI address arguments use the typed `nft_addresses` entry point.

## Malformed / unavailable credentials

Use raw cast output to inspect malformed bytes; no output ABI decoder is supplied.
Run each command independently and retain stdout, stderr and exit status even
when an expected failure occurs.

```bash
for VOXEN_TARGET in "$VOXEN_MALFORMED" "$VOXEN_REVERTING" "$VOXEN_NONHOLDER"; do
  cast call "$VOXEN_TARGET" 'balanceOf(address)' "$VOXEN_HOLDER" --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
  cast call "$VOXEN_TARGET" 'balanceOf(address,uint256)' "$VOXEN_HOLDER" 501 --block "$VOXEN_BLOCK" --rpc-url "$VOXEN_CHAIN_RPC"
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_TARGET" "$VOXEN_HOLDER" ERC721 null true
  genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_TARGET" "$VOXEN_HOLDER" ERC1155 501 true
done
# Invalid credential configuration, before a holdings read:
genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_1155" "$VOXEN_HOLDER" ERC1155 null true
genlayer call "$VOXEN_PROBE" nft_addresses --rpc "$VOXEN_RPC" --args "$VOXEN_721" "$VOXEN_HOLDER" UNKNOWN null true
```

Expected direct results: malformed fixture returns 31 bytes; reverting fixture
reverts; no-code EOA returns empty bytes. All corresponding probe calls must
fail, never return a successful zero balance or eligibility result. Exact live
host error wording is unproven. Invalid configuration must also fail. A failure
has no candidate result, rather than a synthetic eligible=false response.

After probes, record another block and repeat the direct successful balance
commands at that block. Preserve both block numbers/hashes and all raw outputs.
The probe offers no EVM block selector; equal before/after balances support this
controlled comparison but do not prove an identical snapshot or absence of
intermediate state changes.

## Original V0.5.2 local validation and changed files (historical)

- `.venv/bin/pytest tests/direct/test_eligibility_probe.py -q -k 'not native and not threshold and not write and not record'`: 57 passed, 34 deselected. No GEN tests run.
- `forge test --root probe-evm`: 3 passed, 0 failed; Solidity 0.8.24 compilation passed.
- `forge fmt --check probe-evm/src/UnavailableCredential.sol probe-evm/test/UnavailableCredential.t.sol`: passed.
- `.venv/bin/genvm-lint lint contracts/eligibility_probe.py`: passed, 3 checks.

Files changed in this session:
1. `probe-evm/src/UnavailableCredential.sol` — new malformed/reverting fixtures.
2. `probe-evm/test/UnavailableCredential.t.sol` — new tests for both ABI selectors.
3. `tests/direct/test_eligibility_probe.py` — both standards' failure coverage, wrong-ID ABI coverage and probe-only markers.
4. `docs/bradbury-eligibility-v0.5.2.md` — this runbook.

The existing badge source and EligibilityProbe source are unchanged. An initial
Foundry test name starting with testFail was rejected by the runner; renamed it
and reran successfully. No production or frontend files changed.

## What remains unproven

The user reports deployed badges and both failure fixtures, including the live
address-decoding failures below. Receipts/code and successful live cast/probe
comparisons are not independently verified in this hardening session. Local tests use mocks for GenLayer transport and cannot prove the
Bradbury host supports these calls. No live evidence is claimed by this report.
Also unproven: live error semantics; deterministic EVM snapshot/finality and
validator agreement; holdings reads during signed consensus execution; production
voting enforcement; real AMA issuer/contract/network/token mapping; cross-chain
reads and event-specific ERC721 eligibility in a shared collection. Runtime chain
metadata is still diagnostic, with UNPROVEN_RUNTIME_CHAIN_ID. Nothing here
changes GEN proof status or enables authorization in Voxen.


## V0.5.2.1 — live CLI address-decoding finding

CLI 0.39.2 delivered these fixture arguments as Python integers:

| Fixture | Live address |
| --- | --- |
| MalformedCredential | `0x829463bBd0DC31251E1c21A621Efcc9f04c99065` |
| RevertingCredential | `0xbbF75475cbB35DCd75fE9b4025e75C206421945F` |

The deployed `nft_addresses` immediately accessed `contract.as_hex` and
`wallet.as_hex`, raising `AttributeError: 'int' object has no attribute 'as_hex'`
before EthCall reached either fixture. Earlier ERC721/ERC1155 addresses decoding
as Address did not establish that every 40-hex-digit CLI argument would do so.
These failures are not evidence of malformed-response or revert handling.

Inspected the installed SDK Address implementation in the gltest-direct cache
(`v0.3.0-rc7/py-lib-genlayer-std/.../genlayer/py/types.py`) before editing.
Address accepts hex/base64/buffers, exposes checksummed `as_hex` and 20-byte
`as_bytes`, and does not validate input checksums. Its `as_int` is little-endian;
it must not be used to interpret a CLI numeric hex argument.

The new `_cli_address` accepts only exact SDK Address and exact Python int.
Integers must satisfy `0 < value < 2**160`; they become 20-byte big-endian hex,
including leading zero padding. Address values use `as_hex`. Both paths pass
through the existing `_address` validator before delegating to unchanged
`nft_candidate`. Zero Address, zero/negative/oversized integers, booleans,
strings (including malformed strings), bytes, containers, floats and arbitrary
objects are rejected. Strict string callers continue using `nft_candidate`,
whose length, hex, checksum and nonzero validation is unchanged. Original
textual checksum information is unavailable once CLI has decoded an integer.
The public Address annotations are retained; runtime normalization handles the
observed decoding variation.

Added 52 regression cases: both live fixture integers plus lower/upper numeric
boundaries, Address/integer wallets, both ABI selectors, successful mocked
balances, malformed bytes and transport exceptions; invalid values in either
parameter; unsupported Python objects; and strict `nft_candidate` validation.
Existing Address transport coverage remains. Success still requires
`eligible=null`, `probe_only=true` and
`verification_status=PROBE_ONLY_NOT_AUTHORIZATION`.

Final local validation (project `.venv/bin` prepended to PATH):

- `pytest tests/direct/test_eligibility_probe.py -q`: 143 passed.
- `pytest tests/direct/test_voxen.py -q`: 271 passed.
- `pytest tests/direct/test_patterns.py -q`: 28 passed.
- `genvm-lint lint contracts/eligibility_probe.py`: passed, 3 checks.
- `genvm-lint lint contracts/voxen.py`: passed, 3 checks.
- `git diff --check`: passed. Files are untracked in this checkout, so an
  additional whitespace check against saved pre-edit copies covers all three edits.

The initial probe run had 141 passes and two test failures because floats cannot
be calldata-encoded. Those unsupported-object checks now call the guard directly;
the fixture regressions still traverse the calldata round trip.

Only `contracts/eligibility_probe.py`, `tests/direct/test_eligibility_probe.py`
and this document were edited. Voxen integration, frontend and LayerShield were
not changed. No deployment or commit was performed.

A **new eligibility_probe deployment is required**; local edits cannot repair
the deployed code. After local validation, the exact next live command, from
repository root, is (not executed):

```bash
genlayer deploy --rpc https://rpc-bradbury.genlayer.com --contract contracts/eligibility_probe.py
```

Then record the new address and transaction, wait for FINALIZED, verify deployed
source, and rerun the holder/non-holder and failure matrix against the new probe.
Live fixture outcomes after this fix remain unproven until those calls run.
