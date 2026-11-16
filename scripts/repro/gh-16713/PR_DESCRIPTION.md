## Summary

Refs #16713. An unchanged document whose stored record has been deleted rejects from `save()` with `DocumentNotFoundError`, but `bulkSave()` omits it from its generated writes, resolves, and runs its post-save success hook. Applications batching saves can therefore miss deleted records.

This draft adds an existing-document control and three deliberately failing regressions for default, ordered, and unordered `bulkSave()`. It also preserves the complete investigation in `scripts/repro/gh-16713/`: portable probes, design notes, source snapshots, and raw command/results evidence. The probes live outside the default test suite because they characterize current behavior, including bugs.

**This is a test/design investigation, with no production patch or new public contract. The three missing-document regressions intentionally fail, so this PR is not merge-ready.**

## Examples

The regression creates a document, retains its unchanged instance, deletes the stored record, and expects `bulkSave()` to reject. Existing unchanged-document controls succeed. The existing individual-save regression continues to pass.

The additional probes demonstrate why the proposed batched existence read needs a behavior decision:

* For `[update A, insert B, missing unchanged C, update D, insert E]`, all four writes currently persist in both ordered modes.
* For `[replacement insert, retained unchanged document with the same _id]`, sequential saves succeed because the first write recreates the record. A preflight read labels the later input missing. Earlier writes can also reverse a later `$where` filter's match without any concurrent client.
* `_id` existence alone does not reproduce `save()` filters. Query middleware, original input indexes, session visibility, and error precedence also matter.
* A modified document matching zero records currently allows later ordered writes, then raises `MongooseBulkSaveIncompleteError`. Stopping at a missing unchanged input would introduce a stronger rule.
* At 10,000 unchanged inputs, the projected existence read issued `find` plus `getMore`; current unchanged-only `bulkSave()` issued zero commands.

Before a production patch, please clarify whether existence is checked against the pre-batch state or when each input is reached, how ordered/unordered failures and existing driver errors combine, and whether the additional reads are acceptable. The earlier aggregate-error discussion in #14763 provides context but does not settle these new semantics. Related #16533 and #16647 cover other bulk-save error/state paths.

## Validation

Verified against upstream `ab4e3637a5a65f875e385abd4f3b77f457e66d78`, using Node 24.22.1, Mongoose 9.12.1, MongoDB driver 7.8.0, and real disposable MongoDB 8.2.0 instances through the normal Mocha fixtures:

| Check | Actual result |
| --- | --- |
| Existing focused suite before the regression | 45 passing, 2 pending; exit 0 |
| Focused suite with the regression | 46 passing, 2 pending, 3 expected failures; exit 3 |
| Current-behavior probe | 15 passing |
| Deeper design probe on a replica set | 13 passing |
| Command-cost probe | 1 passing |
| JS lint, Markdown lint, lib charset, staged diff whitespace | Passed |

All three regression failures are `Missing expected rejection`. The portable probes were rerun before publication. Exact commands and outputs are in `results/original/` and `results/publish/` under the investigation directory. No full repository-suite pass is claimed.

Investigation and code were prepared with OpenAI Codex.
