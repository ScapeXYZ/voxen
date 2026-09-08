# V0.4.1 GenVM lint hardening

No product policy changes. Validation failures now use the installed SDK's
`gl.vm.UserError` rather than Python ValueError; clients may observe the SDK error
representation. Tests still allow native ValueError for Python parsing/encoding
failures, and separately assert UserError for explicit contract validation.

## Baseline findings (before edits)

64 W004 explicit built-in exception raises, 2 E010 nondeterministic reachability
findings, no other categories. These were not 64 broad exception handlers: there
was one `except Exception` handler, in the validator. Every diagnostic follows.

| Category | Rule | Original line | Finding |
| --- | --- | --- | --- |
| A: explicit exception | W004 | 73 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 77 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 81 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 86 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 92 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 98 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 110 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 114 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 148 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 150 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 161 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 170 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 207 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 213 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 217 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 219 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 221 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 246 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 275 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 291 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 295 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 301 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 347 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 351 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 353 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 358 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 366 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 372 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 378 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 384 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 389 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 402 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 445 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 456 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 460 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 462 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 465 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 495 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 498 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 500 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 506 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 513 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 515 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 564 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 578 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 589 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 592 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 594 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 596 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 598 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 601 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 611 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 629 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 635 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 640 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 643 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 654 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 656 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 659 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 683 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 686 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 727 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 730 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| A: explicit exception | W004 | 736 | Bare Python exception 'ValueError' in contract; use gl.vm.UserError("message") instead |
| B: nondeterministic reachability | E010 | 652 | gl.nondet.* call in 'Voxen._evaluate_governance' not reachable from equivalence principle block |
| B: nondeterministic reachability | E010 | 677 | gl.nondet.* call in 'Voxen._evaluate_governance' not reachable from equivalence principle block |

## Root cause and refactor

Installed `genvm_linter/lint/safety.py`, SafeEntryPointFinder.SAFE_PATTERNS, matches
`gl.vm.run_nondet_unsafe` literally; it does not resolve the `glvm` import alias.
Consequently neither callback was recognized as a safe entry point, and the two
calls in `_evaluate_governance` were reported as unreachable. The helper actually
was only invoked by callbacks, but the boundary was opaque to this static analysis.

The alias is removed and the canonical call is used. `_evaluate_governance` is
removed; all evidence retrieval and model execution now live directly in nested
`leader_fn`. The validator calls `leader_fn()` independently after validating the
leader result. Pure schema/comparison helpers contain no nondeterministic calls.
Snapshot and timestamp capture precede execution; storage writes remain strictly
after consensus return and deterministic revalidation. No diagnostic suppression,
linter configuration changes, or SDK changes were made.

All 64 explicit raises now use actual `gl.vm.UserError`, defined as an Exception
subclass in the installed `genlayer/gl/vm.py`. The one broad validator catch was
replaced with `gl.vm.UserError`, `NondetException`, `ValueError`, `TypeError`,
`KeyError`, and `OSError`. The installed `genlayer/gl/nondet/__init__.py` defines
NondetException and raises it from `_decode_nondet` for external operation errors.
ValueError includes JSONDecodeError and UnicodeDecodeError; OSError includes
TimeoutError. Unexpected errors propagate, failing the review before writes,
rather than being swallowed. No broad exception handlers remain in the contract.

## Validation

Final lint: zero diagnostics, all three lint checks passed. Tests cover failures
in both callbacks with existing review history: malformed JSON/schema, evidence
I/O failure, SDK model failure, and unexpected propagated errors. They verify no
partial record, consumed ID, changed history or automatic opening, and successful
retry uses the next ID. Existing disagreement and independently fetched evidence
tests remain. Direct callbacks are exercised through the existing test-only harness;
real distributed consensus/rollback and Studio/Bradbury execution remain deployment
proof obligations. Static lint success does not resolve the prior EVM or timestamp
runtime limitations.
