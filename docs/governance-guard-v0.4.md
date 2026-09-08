# Governance Guard V0.4

Governance Guard reviews Space proposals against the Space constitution and optional
public evidence. It does not cast votes, determine winners, resolve ties, verify
asset holdings, control wallets, or move funds. GEN/POAP verification remains
unavailable in production; voting still rejects unavailable eligibility.

## Schema and consensus

The AI response must contain exactly these fields:

| Field | Allowed values |
| --- | --- |
| classification | COMPLIANT, NEEDS_REVIEW, NON_COMPLIANT |
| risk | LOW, MEDIUM, HIGH, CRITICAL |
| confidence | Integer 0–100; booleans and floats rejected |
| evidence_consistent | Boolean |
| reason | Nonblank string, maximum 1000 characters |

Missing/extra keys, wrong types, invalid enums, duplicate JSON keys, markdown-wrapped
JSON and malformed output fail. Accepted reasons are trimmed; records use canonical
JSON with sorted keys. No unvalidated model output becomes authoritative storage.

The installed PatternTest `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` pattern
is used. Both callbacks independently evaluate the same captured input snapshot.
A validator rejects non-Return or malformed leader output before evaluating its own
result. Classification, risk and evidence consistency must match exactly; confidence
may differ by at most 10 points in either direction. Reasons need not match.
The accepted leader confidence is stored without averaging.

`request_governance_review(proposal_id)` is creator-only and requires a Guard Space
proposal in REVIEW, plus current Space availability/creation permission. It takes
no submitted AI result. The constitution and proposal are captured as canonical
JSON before nondeterministic execution. The callbacks perform no storage writes.
After consensus returns, the result is validated again and appended to history.
Execution errors/disagreement store no new review and do not open the proposal.
The creator can retry while remaining in REVIEW.

## Enforcement and revisions

Spaces default to BLOCK_NON_COMPLIANT. The owner alone may set that policy or
WARN_ONLY via `set_governance_guard_policy` (also configurable at Space creation).
BLOCK_NON_COMPLIANT permits opening only for COMPLIANT; both NEEDS_REVIEW and
NON_COMPLIANT block. WARN_ONLY permits all three classifications, retaining the
original visible review as the warning. No classification is rewritten.

Standalone proposals cannot request Space Guard; explicit Guard=true without a
Space is rejected. The Space's Guard requirement is snapshotted at creation.
Guard proposals use DRAFT -> REVIEW -> OPEN; simple proposals use DRAFT -> OPEN.
AI execution never advances status. REVIEW -> OPEN separately checks the latest
accepted review's proposal revision, rules revision and current enforcement policy.

Proposal revision starts at 1. Creator edits are allowed in DRAFT and Guard REVIEW.
The first real critical-field edit after a completed review increments revision;
additional edits before the next completed review stay in that revision. No-op
edits do not increment. This includes content, options, evidence, schedule,
eligibility and result/vote-change policies. Space association and Guard requirement
remain fixed. OPEN and later states freeze edits. Old review history is immutable.
A failed edit changes neither revision nor history. Repeated completed reviews of
the same revision are allowed and appended; opening uses the latest one.

Space rules revision starts at 1 and increments whenever the constitution actually
changes; setting identical text is a no-op. Each review records the rules revision
and constitution snapshot. Changing rules requires a fresh review before opening,
even under WARN_ONLY or after changing rules back. A rules change does not edit the
proposal revision. Policy changes apply at opening. Already-open proposals are not
retroactively closed by later Space changes.

Review IDs are global incremental `review-1`, `review-2`, etc. Records contain the
five validated fields, id, proposal_id, proposal_revision, rules_revision, created_at
(transaction Unix seconds), and input_snapshot (constitution and proposal).
`get_governance_review`, `get_latest_governance_review` and
`get_governance_review_ids` expose ordered, immutable history. Latest may be stale
following an edit; opening checks versions instead of equating latest with valid.

## Evidence and security boundary

Optional evidence is fetched independently inside each callback using installed
`gl.nondet.web.get`. A 2xx response with nonempty valid UTF-8 text up to 64 KiB is
required. Empty, oversized, undecodable or NUL-containing evidence fails execution;
there is no silent truncation or invented replacement. Network/timeouts propagate
as failure. No custom timeout parameter is invented; execution limits belong to
GenLayer. Absent evidence is explicitly null and is not automatically noncompliant:
the constitution determines whether evidence is necessary. The prompt explains that
consistency without evidence does not certify external facts.

Evidence URLs must be HTTPS on port 443/default, without credentials, whitespace,
fragments, local hostnames or non-global literal IPs. The runtime network layer must
still enforce safe DNS resolution and redirects; application URL checks cannot prove
where a hostname resolves. Redirect/DNS controls require deployment verification.
Only supplied evidence is fetched, with no credentials or secrets added by Voxen.

The prompt labels constitution, proposal and untrusted evidence separately in JSON.
It tells the model to treat even constitution text as the compliance standard, not
instructions overriding its role, and to ignore instructions in proposal/evidence.
It prohibits invented evidence, extra retrievals, voting and fund actions. Strict
schema and independent agreement are additional controls, not a guarantee that an
LLM can never be influenced by malicious text. Adversarial evaluation is required.

## Validation limits and deployment prerequisites

The pinned runtime remains py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6
from GenVM v0.3.0-rc7, tested with genlayer-test 0.29.2. Web Response uses status/body;
LLM calls use response_format="json". No network or real LLM is used by direct tests.

The direct harness normally executes only the leader. Tests separately invoke its
captured validator and use a test-only monkeypatch of run_nondet_unsafe to invoke
both actual callbacks before returning or raising on disagreement. Neither strategy
is proof of distributed validator consensus. No production test override exists.

V0.4.1 resolves the previous lint findings using canonical callback registration,
network/model operations directly in the nested callback, SDK UserError validation
failures, and specific validator exception handling. Lint now reports zero
diagnostics. See [hardening details](genvm-lint-v0.4.1.md) for the exact baseline,
root cause and refactor. Static lint is not sandbox deployment validation.

Studio/Bradbury must prove closure serialization, deterministic snapshot capture,
independent validator fetch/model execution, consensus failure rollback and ID
preservation, malformed outputs, response limits/timeouts, URL redirect/DNS policy,
transaction timestamp semantics, and adversarial prompt-injection behavior. Exercise
all enforcement policies and stale revision rejection through real transactions.
Real models may legitimately disagree; do not weaken consensus to force acceptance.

The direct timestamp warp limitation still requires explicit test context injection.
EOA GEN balance semantics and the pinned EVM proxy defect remain separate blockers
for live voting eligibility. No live deployment or Bradbury proof was performed.
