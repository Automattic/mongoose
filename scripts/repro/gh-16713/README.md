# Missing unchanged documents in bulkSave (gh-16713)

This package supports the design discussion in [issue #16713](https://github.com/Automattic/mongoose/issues/16713).
It contains regression coverage, runnable probes, investigation notes, source snapshots, and execution evidence.
It does not change production behavior or define a new error or ordering contract.

The prepared upstream draft PR title is `test(model): investigate missing unchanged documents in bulkSave (gh-16713)`.
Its [full description](PR_DESCRIPTION.md) is included for review and reuse. The authenticated integration could push
this branch to the fork, but GitHub rejected upstream PR creation with `Resource not accessible by integration`.

## Reproduced behavior

On upstream `ab4e3637a5a65f875e385abd4f3b77f457e66d78`, an unchanged document's `save()` rejects with
`DocumentNotFoundError` after its stored record is deleted. `bulkSave()` resolves for that case in default,
ordered, and unordered modes, and runs the missing document's post-save success hook.

For `[update A, insert B, missing unchanged C, update D, insert E]`, all four writes persist in both modes.
The default test suite has one new existing-document control and three deliberately failing missing-document
regressions in `test/model.test.js`. This is a draft investigation, with no production fix.

## Decisions exposed by the probes

* A preflight read can disagree with sequential saves without a competing client. An earlier insert can recreate
  a later unchanged input's record; earlier updates can reverse whether its `$where` filter matches.
* Existence by `_id` is weaker than matching `save()`'s filter. Separate instances with the same `_id` can have
  different `$where` filters. A projected set of matching IDs does not identify which input/filter matched.
* `Model.find()` can run query middleware that the raw collection read used by `save()` does not run.
* An ordered bulk update that matches zero records currently permits later writes, then raises an aggregate
  `MongooseBulkSaveIncompleteError`. Stopping at a missing unchanged input would introduce a stronger rule.
* Missing inputs can coexist with driver write errors. Error precedence, partial results, success hooks, and
  original input indexes need an agreed contract.
* Checks must classify inputs after pre-save hooks and preserve the operation's session/read semantics.
* At 10,000 unchanged inputs, the projected read used `find` plus `getMore`; current `bulkSave()` used zero commands.

The first decision is whether existence means **before the batch starts** or **when the input is reached**.
Then error shape, aggregation, write ordering, and the additional read budget can be specified.

See [the deeper analysis](notes/deeper-design.txt) for concrete alternatives and
[the historical maintainer discussion](https://github.com/Automattic/mongoose/issues/14763#issuecomment-2315834655)
for the existing aggregate-error rationale. That earlier discussion does not settle this new behavior.

## Run from any checkout

Run these commands at the repository root after `npm install`. They use the repository's normal Mocha global
fixture and real disposable MongoDB instances. Clearing URI overrides prevents them from using an existing database.
MongoDB binaries may need to be downloaded. `MONGOMS_DOWNLOAD_DIR` can select a writable cache directory.

The 15-case current-behavior probe:

```sh
env -u MONGOOSE_TEST_URI -u MONGOOSE_REPLSET_URI -u START_REPLICA_SET \
  MONGOMS_VERSION=8.2.0 \
  ./node_modules/.bin/mocha --exit scripts/repro/gh-16713/probes/observations.test.js
```

The 13-case design probe, including transaction visibility on a disposable replica set:

```sh
env -u MONGOOSE_TEST_URI -u MONGOOSE_REPLSET_URI \
  START_REPLICA_SET=1 MONGOMS_VERSION=8.2.0 \
  ./node_modules/.bin/mocha --exit scripts/repro/gh-16713/probes/deep-observations.test.js
```

The command-count probe at 1, 100, and 10,000 inputs:

```sh
env -u MONGOOSE_TEST_URI -u MONGOOSE_REPLSET_URI -u START_REPLICA_SET \
  MONGOMS_VERSION=8.2.0 \
  ./node_modules/.bin/mocha --exit scripts/repro/gh-16713/probes/read-cost.test.js
```

The deliberately failing regression cases:

```sh
env -u MONGOOSE_TEST_URI -u MONGOOSE_REPLSET_URI -u START_REPLICA_SET \
  MONGOMS_VERSION=8.2.0 npm test -- --grep gh-16713
```

The probes characterize current upstream behavior, including bugs; they are outside the default `test/**/*.test.js`
suite and are not assertions of a desired public contract. Revisit them when a production fix changes the behavior.
Each probe writes JSON to ignored `results/local/` by default. Set `MONGOOSE_16713_OUTPUT_DIR` to redirect output.

`run.py` can additionally record a command, output, and actual exit code:

```sh
python3 scripts/repro/gh-16713/run.py lint npm run lint-js
```

It writes `<label>.log` and `<label>.command.json` to the same output directory, and returns the command's exit code.
Command metadata uses a distinct suffix to avoid overwriting a probe's result JSON.

## Evidence inventory

* `results/original/`: original raw logs, exact commands and exit codes, versions, and machine-readable observations.
* `results/publish/`: verification after making the probes portable for this draft PR.
* `notes/report.txt`: original Problem / Fix / Tests / Evidence report and execution details.
* `notes/deeper-design.txt`: additional findings and implementation alternatives.
* `notes/draft-comment*.txt`: both draft issue comments; they were not separately posted.
* `sources/`: issue/PR status snapshot and the earlier #14763 discussion.

The original snapshots retain their historical workspace paths and timestamps. Duplicate metadata aliases were
deduplicated; the `.command.json` files retain their full content. Notes about work remaining local describe the
state before publication. Generated databases, binaries, dependency caches, and unrelated workspace files are excluded.

Original runs used Node 24.22.1, npm 11.9.0, Mongoose 9.12.1, MongoDB driver 7.8.0, and MongoDB 8.2.0:

| Check | Actual result |
| --- | --- |
| Existing focused suite before adding regressions | 45 passing, 2 pending; exit 0 |
| New regression cases | 1 passing, 3 deliberately failing; exit 3 |
| Combined focused suite | 46 passing, 2 pending, 3 deliberately failing; exit 3 |
| Current-behavior probe | 15 passing; exit 0 |
| Deeper design probe | 13 passing; exit 0 |
| Read-cost probe | 1 passing; exit 0 |
| JS lint, lib charset, diff whitespace | Passed; exit 0 |

The portable package was rechecked before publication: all 29 probe cases passed, and the focused suite again
reported 46 passing, 2 pending, and the 3 deliberate regression failures. JS lint, Markdown lint, lib charset,
and diff whitespace checks passed. `results/publish/summary.json` records the command-level results.
The `initial-*` logs retain the first packaging runs, including a lint failure corrected by importing Mocha's
test functions explicitly in the standalone probes. Unsuffixed logs record the final runs.

The three failures are all `Missing expected rejection`. The two pending tests concern transaction retry coverage
in the standalone focused run; the separate design probe tests transaction visibility, not the full retry suite.
No full repository-suite pass is claimed. Investigation and code were prepared with OpenAI Codex.
