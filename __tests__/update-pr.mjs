import { before, beforeEach, test, mock } from "node:test";
import httpErrors from "http-errors";
const { BadRequest, Forbidden } = httpErrors;

import fromBranch from "./__fixtures__/pr-from-branch.json" with { type: "json" };
import fromFork from "./__fixtures__/pr-from-fork.json" with { type: "json" };
import merged from "./__fixtures__/merged-pr.json" with { type: "json" };

let mockCreateStatus, mockGet, updatePR;
before(async () => {
  mock.module("../lib/get-user-status.js", {
    defaultExport: () => {
      return {
        statusField1: "status value 1",
        statusField2: "status value 2"
      };
    }
  });

  mock.module("../lib/helpers/github.js", {
    defaultExport: {
      api: {
        pulls: {
          get get() {
            return mockGet;
          }
        },
        repos: {
          get createCommitStatus() {
            return mockCreateStatus;
          }
        }
      }
    }
  });

  updatePR = (await import("../lib/update-pr.js")).default;
});

beforeEach(() => {
  mockGet = null;
  mockCreateStatus = mock.fn();
});

test("A PR from a branch must trigger an appropriate status update", async t => {
  mockGet = mock.fn(() => fromBranch);

  await updatePR("https://github.com/whatwg/console/pull/5");

  t.assert.strictEqual(mockGet.mock.callCount(), 1);
  t.assert.deepStrictEqual(mockGet.mock.calls[0].arguments, [{ owner: "whatwg", repo: "console", pull_number: 5 }]);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0].arguments);
});

test("A PR from a fork must trigger an appropriate status update", async t => {
  mockGet = mock.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/6");

  t.assert.strictEqual(mockGet.mock.callCount(), 1);
  t.assert.deepStrictEqual(mockGet.mock.calls[0].arguments, [{ owner: "whatwg", repo: "console", pull_number: 6 }]);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0].arguments);
});

test("A PR with a hash at the end must still trigger an appropriate status update", async t => {
  mockGet = mock.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131#issuecomment-376766631");

  t.assert.strictEqual(mockGet.mock.callCount(), 1);
  t.assert.deepStrictEqual(mockGet.mock.calls[0].arguments, [{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0].arguments);
});

test("A PR with /files at the end must still trigger an appropriate status update", async t => {
  mockGet = mock.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131/files");

  t.assert.strictEqual(mockGet.mock.callCount(), 1);
  t.assert.deepStrictEqual(mockGet.mock.calls[0].arguments, [{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0].arguments);
});

test("A PR with /commits at the end must still trigger an appropriate status update", async t => {
  mockGet = mock.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131/commits");

  t.assert.strictEqual(mockGet.mock.callCount(), 1);
  t.assert.deepStrictEqual(mockGet.mock.calls[0].arguments, [{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  t.assert.strictEqual(mockCreateStatus.mock.callCount(), 1);
  t.assert.snapshot(mockCreateStatus.mock.calls[0].arguments);
});

test("Bad URLs must reject", async t => {
  await t.assert.rejects(
    updatePR("https://github.com/not-whatwg/console/pull/7"),
    BadRequest
  );

  await t.assert.rejects(
    updatePR("https://github.com/whatwg/not-a-valid-repo/pull/7"),
    BadRequest
  );

  await t.assert.rejects(
    updatePR("https://github.com/whatwg/console/pull/7notanumber"),
    BadRequest
  );
});

test("Already-merged PRs must not be updated", async t => {
  mockGet = mock.fn(() => merged);

  await t.assert.rejects(
    updatePR("https://github.com/whatwg/console/pull/7"),
    Forbidden
  );
});
