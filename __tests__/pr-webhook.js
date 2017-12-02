"use strict";

const fromBranch = require("./__fixtures__/pr-from-branch-hook-payload.json");
const fromFork = require("./__fixtures__/pr-from-fork-hook-payload.json");

jest.mock("../lib/get-user-status.js", () => {
  return () => {
    return {
      statusField1: "status value 1",
      statusField2: "status value 2"
    };
  };
});

let mockCreateStatus;
jest.mock("../lib/helpers/github.js", () => {
  return {
    api: {
      repos: {
        get createStatus() {
          return mockCreateStatus;
        }
      }
    }
  };
});

const prWebhook = require("../lib/pr-webhook.js");

beforeEach(() => {
  mockCreateStatus = jest.fn();
});

test("A PR from a branch must trigger an appropriate status update", async () => {
  await prWebhook(fromBranch);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});

test("A PR from a fork must trigger an appropriate status update", async () => {
  await prWebhook(fromFork);

  expect(mockCreateStatus).toHaveBeenCalledTimes(1);
  expect(mockCreateStatus.mock.calls[0]).toMatchSnapshot();
});
