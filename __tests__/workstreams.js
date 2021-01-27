"use strict";

jest.mock("../sg/db.json", () => {
  return {
    workstreams: [
      {
        id: "workstream1",
        name: "Workstream 1",
        standards: [
          {
            href: "https://standard1.spec.whatwg.org/"
          }
        ]
      },
      {
        id: "workstream2",
        name: "Workstream 2",
        standards: [
          {
            href: "https://standard2.spec.whatwg.org/"
          },
          {
            href: "https://standard3.spec.whatwg.org/"
          }
        ]
      }
    ]
  };
}, { virtual: true });

const workstreams = require("../lib/helpers/workstreams.js");

test("repos", () => {
  expect(workstreams.repos).toEqual(["standard1", "standard2", "standard3"]);
});

test("workstreamFromRepo, for a one-standard workstream", () => {
  const result = workstreams.workstreamFromRepo("standard1");
  expect(result.id).toEqual("workstream1");
});

test("workstreamFromRepo, for a two-standard workstream", () => {
  const result1 = workstreams.workstreamFromRepo("standard2");
  expect(result1.id).toEqual("workstream2");

  const result2 = workstreams.workstreamFromRepo("standard3");
  expect(result2.id).toEqual("workstream2");
});

test("workstreamFromRepo, for an invalid repo", () => {
  expect(workstreams.workstreamFromRepo("not-a-standard")).toEqual(null);
});

test("standardFromRepo, for a single standard workstream", () => {
  expect(workstreams.standardFromRepo("standard1").href).toEqual("https://standard1.spec.whatwg.org/");
});

test("standardFromRepo, for a double standard workstream", () => {
  expect(workstreams.standardFromRepo("standard3").href).toEqual("https://standard3.spec.whatwg.org/");
});

test("standardFromRepo, for an invalid repo", () => {
  expect(workstreams.standardFromRepo("not-a-standard")).toEqual(null);
});
