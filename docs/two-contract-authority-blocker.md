# Two-contract authority blocker

The requested split has one indispensable operation: after Governance reaches
validator consensus, Core must atomically decide whether the current review
authorizes publication of the exact proposal revision against the exact Space
rules revision.

The pinned GenLayer contract environment exposes `gl_call_generic` only for an
EVM `EthCall`.  That is a read-only EVM RPC operation.  It cannot invoke an
Intelligent Contract write method, cannot preserve `gl.message.sender_address`
as the Governance IC, and cannot atomically update Core state.  The installed
SDK/runtime exposes no supported IC-to-IC call, authenticated callback, or
verifiable receipt primitive for this purpose.

Consequently, neither of these apparent designs is safe:

* accepting a frontend-submitted review in Core (the frontend can forge it);
* letting Governance submit an EVM call or asking Core to trust an address
  supplied as calldata (the caller identity is not authenticated as Governance);
* storing reviews only in Governance and having Core read them through `EthCall`
  (the result is not an atomic, authenticated authorization for Core's write).

Publishing either contract pair with one of those designs would make Governance
Guard frontend-only authorization or silently weaken its current enforcement.

## Smallest safe runtime interface

Provide an atomic authenticated IC-to-IC call facility, conceptually:

`gl.contract_call(Address core, "record_governance_review", calldata)`

with these guarantees:

1. Core receives an unforgeable immediate caller identity equal to Governance's
   contract address (not a user address or calldata field).
2. The call is executed in the same consensus transaction, and either both
   review persistence and Core authorization state commit or neither does.
3. Core can bind the review to `proposal_id`, proposal revision, rules revision,
   policy and a canonical input snapshot/hash.
4. View calls are explicitly read-only and cannot be substituted for this write
   authorization path.

Once that interface is stable on Bradbury and direct-testable, Core should own
an allowlist containing the deployed Governance address and expose only a
Governance-caller-protected `record_governance_review` method.  Governance
should retain the nondeterministic review, consensus and immutable history.
Core must independently enforce the recorded approval when publishing.  No
frontend authorization is involved.
