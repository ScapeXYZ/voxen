# V0.5.1 — State-changing GEN eligibility experiment

Prepared locally; not deployed or committed. Live signed execution is still
unproven. Voxen, frontend and LayerShield are unchanged. Authorization remains
disabled; candidate results are never production eligibility.

## Supplied live V0.5 evidence

User reports revised probe 0xcF424777516aD9f6a8A09023864a70E6FC38Bc43 finalized.
Caller and origin: 0x25c8a9c84461840500544c8b4d58C802C389dbD5.
Runtime chain ID: 1 (UNPROVEN identity); external RPC chain ID and configured
target: 4221. Native candidate 49984960137270285488 wei exactly matched the
reported GenLayer Chain RPC balance. Threshold 1000000000000000000 returned
true; 49984960137270285489 returned false. eligible remained null,
verification_status UNPROVEN_EOA_BALANCE_SEMANTICS, probe_only true.
These are supplied view observations, not a signed-write proof.

## Implementation and limits

Public write: `record_native_candidate(threshold_wei: int) -> None`.
Public view: `get_last_native_candidate() -> dict | None`.
Only persistent field: `last_native_candidate_json: str`, initially `"null"`.
Each successful write replaces the global last record, including writes from a
different caller. Inspect and save each result before running the next write.

Stored fields:
- caller: gl.message.sender_address, never origin or a supplied address;
- observed_candidate_wei: decimal string from NativeBalanceCandidate(caller).balance;
- threshold_wei: validated positive uint256, decimal string;
- candidate_meets_threshold: observed >= threshold;
- runtime_datetime: host message_raw datetime string, otherwise null;
- runtime_chain_id: informational runtime metadata only;
- configured_target_evm_chain_id: 4221;
- network_verification_status: UNPROVEN_RUNTIME_CHAIN_ID;
- eligible: null;
- verification_status: UNPROVEN_EOA_BALANCE_SEMANTICS;
- probe_only: true.

Validation, native balance read, metadata construction and JSON serialization
all precede the single storage assignment. No later application work can fail
after that assignment. Injected balance, metadata and serialization failures
preserve empty or previous state. Host-level storage failure/transaction rollback
and validator agreement still require live execution evidence. Direct tests use
mock balances, not signatures or network consensus. Runtime datetime is metadata,
not freshness evidence; the direct harness does not refresh raw datetime on warp.
No GEN transfer, lock, charge or weighting is implemented. Ordinary network
transaction fees can change the caller's balance during the live experiment.

## Prepared commands — not executed

Use the selected encrypted CLI account for the caller above. Verify its public
address with `genlayer account show --rpc https://rpc-bradbury.genlayer.com`.
The installed CLI's `write` command signs and submits; no --broadcast is needed.

Deploy the new source when separately authorized:

```bash
genlayer deploy --rpc https://rpc-bradbury.genlayer.com --contract contracts/eligibility_probe.py
```

Set VOXEN_PROBE to the NEW V0.5.1 deployment address from its receipt, not the
V0.5 address above. Wait for FINALIZED deployment and verify code. With VOXEN_TX
set to each returned transaction hash, inspect finalization using:

```bash
genlayer receipt "$VOXEN_TX" --rpc https://rpc-bradbury.genlayer.com
genlayer code "$VOXEN_PROBE" --rpc https://rpc-bradbury.genlayer.com
```

Signed below-balance threshold (1 GEN):

```bash
genlayer write "$VOXEN_PROBE" record_native_candidate --rpc https://rpc-bradbury.genlayer.com --args 1000000000000000000
```

Wait for FINALIZED, then inspect and save the record:

```bash
genlayer call "$VOXEN_PROBE" get_last_native_candidate --rpc https://rpc-bradbury.genlayer.com
```

Signed B+1 using the supplied B=49984960137270285488:

```bash
genlayer write "$VOXEN_PROBE" record_native_candidate --rpc https://rpc-bradbury.genlayer.com --args 49984960137270285489
```

Wait for FINALIZED and run the same read command again. The supplied B is
historical. For a fresh pre-submission B+1 after deployment/first-write fees:

```bash
VOXEN_BLOCK=$(cast block-number --rpc-url https://rpc.testnet-chain.genlayer.com)
VOXEN_BALANCE=$(cast balance 0x25c8a9c84461840500544c8b4d58C802C389dbD5 --block "$VOXEN_BLOCK" --rpc-url https://rpc.testnet-chain.genlayer.com)
VOXEN_ABOVE=$(.venv/bin/python -c 'import sys; print(int(sys.argv[1]) + 1)' "$VOXEN_BALANCE")
genlayer write "$VOXEN_PROBE" record_native_candidate --rpc https://rpc-bradbury.genlayer.com --args "$VOXEN_ABOVE"
```

Record surrounding blocks, balances, transaction hashes and final receipts.
Fees or balance changes mean pre-submission B need not equal the observed
execution balance. Evaluate the comparison against the persisted observation;
a false result alone does not prove exact snapshot semantics or a one-wei
execution-time boundary. Confirm the stored caller, runtime metadata and all
UNPROVEN/null markers for each transaction. No result enables Voxen voting.

## Local validation

- pytest tests/direct/test_eligibility_probe.py -q: 78 passed.
- pytest tests/direct/test_voxen.py -q: 271 passed.
- pytest tests/direct/test_patterns.py -q: 28 passed.
- Total: 377 passed.
- genvm-lint lint contracts/eligibility_probe.py: passed, 3 checks, no diagnostics.
- genvm-lint lint contracts/voxen.py: passed, 3 checks, no diagnostics.
- git diff --check: passed; untracked changed files also checked for whitespace.

Commands used the repository .venv/bin executables. Files changed in this session:
contracts/eligibility_probe.py, tests/direct/test_eligibility_probe.py, and this
new report. No deploy or commit was executed.
