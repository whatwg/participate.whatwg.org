import { before, test, mock } from "node:test";

let workstreams;
before(async () => {
  mock.module("../../sg/db.json", {
    defaultExport: {
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
    }
  });

  workstreams = await import("../../lib/helpers/workstreams.js");
});

test("repos", t => {
  t.assert.deepStrictEqual(workstreams.repos, ["standard1", "standard2", "standard3"]);
});

test("workstreamFromRepo, for a one-standard workstream", t => {
  const result = workstreams.workstreamFromRepo("standard1");
  t.assert.strictEqual(result.id, "workstream1");
});

test("workstreamFromRepo, for a two-standard workstream", t => {
  const result1 = workstreams.workstreamFromRepo("standard2");
  t.assert.strictEqual(result1.id, "workstream2");

  const result2 = workstreams.workstreamFromRepo("standard3");
  t.assert.strictEqual(result2.id, "workstream2");
});

test("workstreamFromRepo, for an invalid repo", t => {
  t.assert.strictEqual(workstreams.workstreamFromRepo("not-a-standard"), null);
});

test("standardFromRepo, for a single standard workstream", t => {
  t.assert.strictEqual(workstreams.standardFromRepo("standard1").href, "https://standard1.spec.whatwg.org/");
});

test("standardFromRepo, for a double standard workstream", t => {
  t.assert.strictEqual(workstreams.standardFromRepo("standard3").href, "https://standard3.spec.whatwg.org/");
});

test("standardFromRepo, for an invalid repo", t => {
  t.assert.strictEqual(workstreams.standardFromRepo("not-a-standard"), null);
});
