import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const implementationPath = /^(?:(?:src\/)?(?:app|lib|components|hooks)\/|scripts\/|prompts\/|\.github\/|package(?:-lock)?\.json$)/;
const planPath = "docs/test-approvals/plan.md";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 10_000_000 }).trim();

/** GOV-001: test-only and documentation-only proposals may precede approval. */
export function changedPathsRequireApproval(paths) { return paths.some((path) => implementationPath.test(path)); }

/** GOV-001: a locally editable 'approved' flag is never sufficient merge evidence. */
export function verifyApprovalReview(review, { author, approvedCommit, firstImplementationTime, latestReview }) {
  if (review?.state !== "APPROVED" || !review.submitted_at) throw new Error("A submitted, non-dismissed APPROVED GitHub review is required");
  if (review.user?.type !== "User" || !review.user?.login || review.user.login.toLowerCase() === author.toLowerCase()) throw new Error("Test approval must be from an independent human reviewer");
  if (!["OWNER", "MEMBER", "COLLABORATOR"].includes(review.author_association)) throw new Error("Test approver must be a repository collaborator");
  if (review.commit_id !== approvedCommit) throw new Error("Review must approve the exact tests-only commit");
  if (!review.body?.includes("[TEST-PLAN APPROVED]")) throw new Error("Review must explicitly include [TEST-PLAN APPROVED]");
  if (!Number.isFinite(Date.parse(review.submitted_at)) || (firstImplementationTime && !Number.isFinite(Date.parse(firstImplementationTime)))) throw new Error("Review and implementation times must be valid");
  if (latestReview && (latestReview.id !== review.id || latestReview.state !== "APPROVED")) throw new Error("Approval has been superseded or dismissed");
  if (firstImplementationTime && Date.parse(review.submitted_at) >= Date.parse(firstImplementationTime)) throw new Error("Test review must be submitted before the first implementation commit");
}

async function run() {
  if (!process.env.GITHUB_EVENT_PATH || !process.env.GITHUB_REPOSITORY) throw new Error("This merge gate requires GitHub PR event evidence; local tests are not merge approval");
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  if (!pr) throw new Error("A pull_request event is required");
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("Invalid repository identifier");
  const head = pr.head.sha;
  const base = pr.base.sha;
  for (const sha of [head, base]) if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Invalid commit identifier");
  const paths = git("diff", "--name-only", `${base}...${head}`).split("\n").filter(Boolean);
  if (!changedPathsRequireApproval(paths)) { console.log("Test-approval gate: no implementation change; tests/plan may be reviewed first."); return; }
  let evidence;
  try { evidence = JSON.parse(git("show", `${head}:docs/test-approvals/current.json`)); } catch { throw new Error("Missing docs/test-approvals/current.json with a real GitHub review ID and approved tests commit"); }
  const approved = evidence.approvedCommit;
  if (!/^[a-f0-9]{40}$/.test(approved || "") || !Number.isSafeInteger(evidence.githubReviewId) || evidence.githubReviewId <= 0) throw new Error("Implementation is blocked until an independent GitHub tests-only review exists; chat authorisation is recorded separately");
  git("merge-base", "--is-ancestor", approved, head);
  const beforeApproval = git("diff", "--name-only", `${base}...${approved}`).split("\n").filter(Boolean);
  if (changedPathsRequireApproval(beforeApproval)) throw new Error("Approved commit already contains implementation changes; review tests before implementing");
  if (!git("show", `${approved}:${planPath}`).trim()) throw new Error("The approved commit must include the test plan");
  const tests = git("ls-tree", "-r", "--name-only", approved, "test").split("\n").filter(Boolean);
  if (!tests.some((path) => /\.test\.mjs$/.test(path))) throw new Error("Approved commit has no executable tests");
  if (git("diff", "--name-only", approved, head, "--", "test", planPath)) throw new Error("Tests or plan changed after approval; obtain a fresh tests-only approval");
  const commits = git("rev-list", "--reverse", `${approved}..${head}`).split("\n").filter(Boolean);
  let firstImplementationTime;
  for (const sha of commits) {
    const names = git("diff-tree", "--no-commit-id", "--name-only", "-r", sha).split("\n");
    if (changedPathsRequireApproval(names)) { firstImplementationTime = git("show", "-s", "--format=%cI", sha); break; }
  }
  if (!firstImplementationTime) throw new Error("No post-approval implementation commit found");
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${pr.number}/reviews/${evidence.githubReviewId}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Unable to verify GitHub approval (HTTP ${response.status})`);
  const review = await response.json();
  const reviews = [];
  for (let page = 1; page <= 10; page += 1) {
    const listed = await fetch(`https://api.github.com/repos/${repository}/pulls/${pr.number}/reviews?per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (!listed.ok) throw new Error(`Unable to verify current review state (HTTP ${listed.status})`);
    const batch = await listed.json();
    if (!Array.isArray(batch)) throw new Error("Invalid review list");
    reviews.push(...batch);
    if (batch.length < 100) break;
    if (page === 10) throw new Error("Review history exceeds verifier limits; manual governance review required");
  }
  const latestReview = reviews.filter((item) => item.user?.login === review.user?.login && ["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(item.state)).at(-1);
  if (!latestReview) throw new Error("The approval is no longer present in the current review history");
  verifyApprovalReview(review, { author: pr.user.login, approvedCommit: approved, firstImplementationTime, latestReview });
  console.log("Test-approval gate passed: independent GitHub review, tests-only ancestor, unchanged approved tests and pre-implementation review chronology.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await run(); } catch (error) { console.error(error instanceof Error ? error.message : "Test-approval verification failed"); process.exitCode = 1; }
}
