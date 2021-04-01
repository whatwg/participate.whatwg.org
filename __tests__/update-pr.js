"use strict";
const fromBranch = require("./__fixtures__/pr-from-branch.json");
const fromFork = require("./__fixtures__/pr-from-fork.json");
const merged = require("./__fixtures__/merged-pr.json");

jest.mock("../lib/get-user-status.js", () => {
  return () => {
    return {
      statusField1: "status value 1",
      statusField2: "status value 2"
    };
  };
});

let mockCreateStatus, mockGet;
jest.mock("../lib/helpers/github.js", () => {
  return {
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
  };
});

const updatePR = require("../lib/update-pr.js");

beforeEach(() => {
  mockGet = null;
  mockCreateStatus = jest.fn();
});

test("A PR from a branch must trigger an appropriate status update", async () => {
  mockGet = jest.fn(() => fromBranch);

  await updatePR("https://github.com/whatwg/console/pull/5");

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0]).toEqual([{ owner: "whatwg", repo: "console", pull_number: 5 }]);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR from a fork must trigger an appropriate status update", async () => {
  mockGet = jest.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/6");

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0]).toEqual([{ owner: "whatwg", repo: "console", pull_number: 6 }]);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR with a hash at the end must still trigger an appropriate status update", async () => {
  mockGet = jest.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131#issuecomment-376766631");

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0]).toEqual([{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR with /files at the end must still trigger an appropriate status update", async () => {
  mockGet = jest.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131/files");

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0]).toEqual([{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR with /commits at the end must still trigger an appropriate status update", async () => {
  mockGet = jest.fn(() => fromFork);

  await updatePR("https://github.com/whatwg/console/pull/131/commits");

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0]).toEqual([{ owner: "whatwg", repo: "console", pull_number: 131 }]);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("Bad URLs must reject", async () => {
  await expect(updatePR("https://github.com/not-whatwg/console/pull/7"))
    .rejects.toHaveProperty("name", "BadRequestError");

  await expect(updatePR("https://github.com/whatwg/not-a-valid-repo/pull/7"))
    .rejects.toHaveProperty("name", "BadRequestError");

  await expect(updatePR("https://github.com/whatwg/console/pull/7notanumber"))
    .rejects.toHaveProperty("name", "BadRequestError");
});

test("Already-merged PRs must not be updated", async () => {
  mockGet = jest.fn(() => merged);

  await expect(updatePR("https://github.com/whatwg/console/pull/7"))
    .rejects.toHaveProperty("name", "ForbiddenError");
});
