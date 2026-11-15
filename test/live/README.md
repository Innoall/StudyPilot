# Live tests

`provider.test.mjs` runs the fixed normal and injection cases against a real, supported AI provider using a dedicated test key. It verifies response validity and that authoritative plan blocks survive unchanged. It never uses real coursework, prints credentials, loads `.env` files, or treats a rule-engine fallback as model success.

```sh
node --experimental-strip-types --test test/live/*.test.mjs
```

Set `STUDYPILOT_TEST_AI_PROVIDER`, `STUDYPILOT_TEST_AI_MODEL` and `STUDYPILOT_TEST_AI_KEY` privately in the test process, and opt in with `RUN_LIVE_TESTS=1`. Without explicit opt-in and all three variables, the tests skip. For release validation use `REQUIRE_LIVE_TESTS=1`; missing configuration then fails. A configured run makes at most two billed AI calls. Do not run it without the account owner's authorisation and an appropriate quota limit.

The protected GitHub `provider-evaluation` environment is used only by a manually triggered workflow, never by an untrusted PR. See `docs/testing.md` for thresholds, test-plan approval, branch protection setup, human quality review and the Canvas live acceptance procedure. Offline success and skipped live tests are not real-provider evidence.

`canvas.test.mjs` verifies the current user's identity boundary with a dedicated `STUDYPILOT_TEST_CANVAS_TOKEN` and `RUN_CANVAS_LIVE_TESTS=1`. Full read-only sync additionally requires `STUDYPILOT_TEST_CANVAS_ALLOW_SYNC=1`; required Canvas validation uses `REQUIRE_CANVAS_LIVE_TESTS=1`. It returns no raw records in logs and never writes back to Canvas. Keep test-account authorisation and any necessary university permission separate from test success.
