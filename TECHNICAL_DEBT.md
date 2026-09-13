# Deferred technical debt

This file records verified, non-blocking work that should be completed before
the repository-wide test suite is used as a release gate.

## Zubite backend test harness portability

**Status:** Deferred — does not block Clear Advance Phase 3.

**Recorded:** 2026-09-13, after the Phase 1/2 Clear Advance audit and fixes.

### Verified current behaviour

- The Clear Advance integration suite passes: 31/31 tests across
  `test_clear_advance_import.py`, `test_clear_advance_outcomes.py`, and
  `test_clear_advance_sweep.py`.
- The backend compiles successfully with `python -m compileall -q backend`.
- The Zubite frontend production build and TypeScript validation pass.
- Running `python -m pytest backend/tests` directly from a clean Windows shell
  fails during collection for unrelated legacy tests, before those tests run.

### Causes observed

- Several tests import application configuration before supplying required
  variables such as `MONGO_URL`.
- Some tests require `REACT_APP_BACKEND_URL` even when no live integration test
  should be running.
- `test_bookings_engine.py` contains a deployment-specific
  `/app/frontend/.env` fallback that does not exist on Windows or in arbitrary
  checkouts.
- `test_bugs_iter58.py` imports `aiohttp`, but that test dependency is not
  installed by the current local test setup.
- The test directory mixes isolated unit tests with tests that expect a running
  deployed API, so one repository-wide command has no documented, reproducible
  environment contract.

### Required follow-up

1. Define safe test defaults in a shared pytest bootstrap for configuration
   required at import time. Do not use production credentials or services.
2. Replace hard-coded `/app/...` paths with paths derived from the repository
   root, or remove file-based fallback configuration from tests.
3. Add every test-only dependency, including `aiohttp`, to a pinned development
   or test requirements file.
4. Mark live/deployment tests explicitly and separate them from the default
   isolated suite (for example, `unit` and `integration` pytest markers).
5. Document the exact commands and environment for both suites in `README.md`.
6. Make the default isolated suite collect and pass from a clean Windows shell
   and from CI without access to Render, MongoDB Atlas, or production secrets.
7. Run the live integration suite separately against an intentionally selected
   non-production environment.

### Definition of done

- `python -m pytest backend/tests` has no missing-variable, missing-path, or
  missing-package collection errors in the documented development setup.
- Unit tests cannot accidentally connect to production infrastructure.
- CI runs the isolated suite on every change and reports the optional live suite
  separately.

