import { before, beforeEach, test, mock } from "node:test";

import fromBranch from "./__fixtures__/pr-from-branch-hook-payload.json" with { type: "json" };
import fromFork from "./__fixtures__/pr-from-fork-hook-payload.json" with { type: "json" };
import sameSHA from "./__fixtures__/pr-same-sha-hook-payload.json" with { type: "json" };
import fromMain from "./__fixtures__/pr-from-main-hook-payload.json" with { type: "json" };

let mockCreateStatus, mockPRGet, prWebhook;
before(async () => {
  mock.module("../lib/get-user-status.mjs", {
    defaultExport: () => {
      return {
        statusField1: "status value 1",
        statusField2: "status value 2"
      };
    }
  });

  mock.module("../lib/helpers/github.mjs", {
    namedExports: {
      api: {
        repos: {
          get createCommitStatus() {
            return mockCreateStatus;
          }
        },
        pulls: {
          get get() {
            return mockPRGet;
          }
        }
      }
    }
  });

  prWebhook = (await import("../lib/pr-webhook.mjs")).default;
});

beforeEach(() => {
  mockCreateStatus = mock.fn();
  mockPRGet = mock.fn();
});

test("A PR from a branch must trigger an appropriate status update", async t => {
  mockPRGet.mock.mockImplementation(() => Promise.resolve());

  await prWebhook(fromBranch);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0]);
});

test("A PR from a fork must trigger an appropriate status update", async t => {
  mockPRGet.mock.mockImplementation(() => Promise.resolve());

  await prWebhook(fromFork);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0]);
});

test("A PR where the final commit has the same SHA as main must not trigger a status update", async t => {
  mockPRGet.mock.mockImplementation(() => Promise.resolve());

  await prWebhook(sameSHA);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 0);
});

test("A PR that no longer exists from a fork must trigger no status update", async t => {
  // eslint-disable-next-line prefer-promise-reject-errors
  mockPRGet.mock.mockImplementation(() => Promise.reject({ code: 404 }));

  await prWebhook(fromFork);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 0);
});

test("A PR that no longer exists from a branch must trigger no status update", async t => {
  // eslint-disable-next-line prefer-promise-reject-errors
  mockPRGet.mock.mockImplementation(() => Promise.reject({ code: 404 }));

  await prWebhook(fromBranch);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 0);
});

test("Non-404 errors getting the PR must be propagated", async t => {
  const notA404 = new Error("Internal error");
  mockPRGet.mock.mockImplementation(() => Promise.reject(notA404));

  await t.assert.rejects(prWebhook(fromFork), notA404);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 0);
});

test("A PR to from main to a non-main branch must not trigger any status update", async t => {
  mockPRGet.mock.mockImplementation(() => Promise.resolve());

  await prWebhook(fromMain);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 0);
});
