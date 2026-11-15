import test from "node:test";
import assert from "node:assert/strict";
import { validateAgainstSchema } from "../../scripts/validate-schema.mjs";
import { verifyApprovalReview, changedPathsRequireApproval } from "../../scripts/verify-test-approval.mjs";

test("GOV-001 schema gate enforces the schema, including lengths and extra fields", () => {
  const schema = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 3 } }, additionalProperties: false };
  assert.doesNotThrow(() => validateAgainstSchema({ id: "ABC" }, schema));
  assert.throws(() => validateAgainstSchema({ id: "A" }, schema), /length/);
  assert.throws(() => validateAgainstSchema({ id: "ABC", extra: true }, schema), /additional/);
  assert.throws(() => validateAgainstSchema({}, schema), /required/);
});

test("GOV-001 schema gate rejects unsupported validation keywords instead of ignoring them", () => {
  assert.throws(() => validateAgainstSchema("anything", { type: "string", format: "email" }), /Unsupported/);
  assert.throws(() => validateAgainstSchema(1, { type: "object" }), /object/);
  assert.throws(() => validateAgainstSchema(["x"], { type: "array", minItems: 2, items: { type: "string" } }), /items/);
  assert.throws(() => validateAgainstSchema(1, { type: "number", minimum: "not-a-number" }), /schema/);
  assert.doesNotThrow(() => validateAgainstSchema({ b: 2, a: 1 }, { enum: [{ a: 1, b: 2 }] }));
  assert.throws(() => validateAgainstSchema([{ a: 1, b: 2 }, { b: 2, a: 1 }], { type: "array", uniqueItems: true }), /duplicate/);
});

test("GOV-001 a test approval is an independent submitted GitHub review of the exact plan commit", () => {
  const review = { id: 42, state: "APPROVED", commit_id: "a".repeat(40), submitted_at: "2026-11-16T00:00:00Z", body: "[TEST-PLAN APPROVED] Cases include success and failure.", user: { login: "reviewer", type: "User" }, author_association: "COLLABORATOR" };
  assert.doesNotThrow(() => verifyApprovalReview(review, { author: "author", approvedCommit: "a".repeat(40), firstImplementationTime: "2026-11-16T00:01:00Z" }));
  assert.throws(() => verifyApprovalReview({ ...review, user: { login: "author", type: "User" } }, { author: "author", approvedCommit: "a".repeat(40) }), /independent/);
  assert.throws(() => verifyApprovalReview({ ...review, state: "COMMENTED" }, { author: "author", approvedCommit: "a".repeat(40) }), /APPROVED/);
  assert.throws(() => verifyApprovalReview(review, { author: "author", approvedCommit: "b".repeat(40) }), /commit/);
  assert.throws(() => verifyApprovalReview(review, { author: "author", approvedCommit: "a".repeat(40), firstImplementationTime: "2026-11-15T00:00:00Z" }), /before/);
  assert.throws(() => verifyApprovalReview(review, { author: "author", approvedCommit: "a".repeat(40), latestReview: { id: 43, state: "CHANGES_REQUESTED" } }), /superseded/);
});

test("GOV-001 code, prompt, script and workflow changes require test approval", () => {
  for (const path of ["app/page.tsx", "src/app/page.tsx", "lib/ai.ts", "scripts/verify-structure.mjs", "prompts/prompt_v1.1.yaml", ".github/workflows/ci.yml"]) assert.equal(changedPathsRequireApproval([path]), true);
  assert.equal(changedPathsRequireApproval(["docs/testing.md", "test/offline/data.test.mjs"]), false);
});
