# Project Improvement Issues

This file lists potential enhancements and cleanup tasks for this codebase. They are grouped and roughly prioritized to help you pick work items.

## 1. Architecture & Public API

- **1.1 Clarify and document entry points**  
  - Verify `index.js` re-exports are complete and consistent with `lib/mongoose.js` internals.  
  - Add internal documentation (in code comments or docs site) describing the public surface area vs. internal-only modules.

- **1.2 Driver / connection layering review**  
  - Review `lib/driver.js`, `lib/connection.js`, and `lib/drivers/*` to ensure layering is clear and internal abstractions are well-documented.  
  - Identify any tight coupling between core types (`Model`, `Query`, `Document`, `Connection`) that could be loosened.

- **1.3 AsyncLocalStorage usage**  
  - In `lib/mongoose.js`, review how `AsyncLocalStorage` is used for transactions (`options?.transactionAsyncLocalStorage`).  
  - Add tests and docs around transaction context propagation, including edge cases (nested operations, mixed callbacks/Promises).

## 2. Code Quality & Maintainability

- **2.1 TODOs and internal debt**  
  - Search for `TODO` markers (e.g. under `lib/helpers/document/*`, `lib/helpers/update/*`, `lib/aggregate.js`, `lib/error/validator.js`) and convert them into concrete issues or finish the work.  
  - Ensure every TODO is either resolved or tracked with a clear description.

- **2.2 Centralized error handling improvements**  
  - Review all files under `lib/error/` for consistency in error naming, messages, and inheritance from `MongooseError`.  
  - Ensure important error types are tested (including edge cases and message text) and documented for users.

- **2.3 Internal helper consistency**  
  - Audit helpers under `lib/helpers/**` for:  
    - Consistent function naming and argument order.  
    - No duplicated logic between helpers (e.g. array / path utilities).  
  - Extract any repeated patterns into small, well-named helpers.

- **2.4 Strictness and options validation**  
  - Review `VALID_OPTIONS`, `setOptionError`, and any configuration entry points.  
  - Add validation tests asserting that invalid options fail fast with clear messages.

## 3. Performance & Scalability

- **3.1 Query and aggregation performance**  
  - Examine `lib/query.js` and `lib/aggregate.js` for hot paths (casting, middleware, population).  
  - Identify opportunities to avoid unnecessary object allocations or repeated computations.  
  - Consider micro-benchmarks for large query/aggregation payloads.

- **3.2 Connection management**  
  - Review `Mongoose#connect`, `createConnection`, and connection pooling behavior (esp. in tests using in-memory MongoDB).  
  - Ensure connections are created and torn down efficiently, and add tests for connection leaks.

## 4. Testing & Tooling

- **4.1 Test coverage review**  
  - Use existing `mocha` test suite under `test/` to generate a coverage report via `npm run test-coverage`.  
  - Identify low-coverage modules in `lib/` and add targeted tests for them.

- **4.2 Test environment hardening**  
  - Review `test/common.js` and `test/mocha-fixtures.js` to ensure:  
    - Environment variables (`MONGOOSE_TEST_URI`, `MONGOOSE_REPLSET_URI`, `START_REPLICA_SET`, etc.) are documented and stable.  
    - Mongo Memory Server setup and teardown remains robust and does not leak resources.  
  - Add tests / scripts to detect flaky tests, especially those interacting with timeouts or TTLs.

- **4.3 TypeScript tests & typings**  
  - Review `types/` and `test/types` along with the `tsd` configuration in `package.json`.  
  - Add or refine TypeScript tests for newer APIs added in recent versions (up to 9.x).  
  - Ensure `tsconfig.json` and `tsd` options match the supported TypeScript/Node targets.

## 5. Linting, Style, and DX

- **5.1 ESLint configuration modernization**  
  - Review `eslint.config.mjs` and confirm rules are aligned with current code style and Node.js 20+ runtime.  
  - Fix or suppress noisy rules, and ensure CI runs `npm run lint` consistently.

- **5.2 Markdown and docs linting**  
  - Use `.markdownlint-cli2.cjs` and `npm run lint-md` to clean up any outstanding markdown issues in `README.md`, `docs/`, and other `.md` files.  
  - Ensure any recurring markdown problems are addressed or rules are tuned.

- **5.3 NPM scripts simplification**  
  - Review `package.json` scripts:  
    - Group related docs scripts with clearer names/descriptions.  
    - Consider adding high-level meta-scripts like `npm run ci` that runs lint + tests + type-checks.

## 6. Documentation & Examples

- **6.1 Version-specific migration docs**  
  - Ensure `migrating_to_5.md` and newer migration guides (for 6.x–9.x referenced in README and docs site) are internally consistent.  
  - If this repo is being used as a learning project, add a short `MIGRATING_NOTES.md` summarizing key conceptual changes.

- **6.2 Local docs workflow**  
  - Document the workflow for generating and viewing docs (`docs:generate`, `docs:view`, etc.) in `CONTRIBUTING.md` or a short `docs/DEVELOPING.md`.  
  - Verify that `scripts/website.js` and related tooling still work with current dependency versions.

- **6.3 Contribution guidance**  
  - Extend `CONTRIBUTING.md` with concrete examples for:  
    - Adding a new helper in `lib/helpers`.  
    - Adding a new schema option / query helper.  
    - Adding corresponding tests and docs.

---

You can treat each bullet as a potential GitHub issue or work item. For a more granular task list, break large bullets (like coverage or performance work) into per-module issues (e.g. `lib/query.js`, `lib/aggregate.js`, `lib/connection.js`).
