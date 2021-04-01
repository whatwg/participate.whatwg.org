"use strict";
const fromBranch = require("./__fixtures__/pr-from-branch-hook-payload.json");
const fromFork = require("./__fixtures__/pr-from-fork-hook-payload.json");
const fromMain = require("./__fixtures__/pr-from-main-hook-payload.json");

jest.mock("../lib/get-user-status.js", () => {
  return () => {
    return {
      statusField1: "status value 1",
      statusField2: "status value 2"
    };
  };
});

let mockCreateStatus, mockPRGet;
jest.mock("../lib/helpers/github.js", () => {
  return {
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
  };
});

const prWebhook = require("../lib/pr-webhook.js");

beforeEach(() => {
  mockCreateStatus = jest.fn();
  mockPRGet = jest.fn();
});

test("A PR from a branch must trigger an appropriate status update", async () => {
  mockPRGet.mockReturnValue(Promise.resolve());

  await prWebhook(fromBranch);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR from a fork must trigger an appropriate status update", async () => {
  mockPRGet.mockReturnValue(Promise.resolve());

  await prWebhook(fromFork);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR that no longer exists from a fork must trigger no status update", async () => {
  // eslint-disable-next-line prefer-promise-reject-errors
  mockPRGet.mockReturnValue(Promise.reject({ code: 404 }));

  await prWebhook(fromFork);

  expect(mockCreateStatus).toHaveBeenCalledTimes(0);
});

test("A PR that no longer exists from a branch must trigger no status update", async () => {
  // eslint-disable-next-line prefer-promise-reject-errors
  mockPRGet.mockReturnValue(Promise.reject({ code: 404 }));

  await prWebhook(fromBranch);

  expect(mockCreateStatus).toHaveBeenCalledTimes(0);
});

test("Non-404 errors getting the PR must be propagated", () => {
  const notA404 = new Error("Internal error");
  mockPRGet.mockReturnValue(Promise.reject(notA404));

  expect(prWebhook(fromFork)).rejects.toThrow(notA404);

  expect(mockCreateStatus).toHaveBeenCalledTimes(0);
});

test("A PR to from main to a non-main branch must not trigger any status update", async () => {
  mockPRGet.mockReturnValue(Promise.resolve());

  await prWebhook(fromMain);

  expect(mockCreateStatus).toHaveBeenCalledTimes(0);
});
