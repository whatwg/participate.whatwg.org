import { before, beforeEach, test, mock } from "node:test";

let mockData = new Map(); // Type -> data file contents as a JS object
let mockOrgMemberships = new Map(); // GitHub user ID -> array of GitHub orgs

let getUserStatus;
before(async () => {
  mock.module("../lib/helpers/json-github-database.js", {
    defaultExport: {
      get(type) {
        return {
          sha: "doesn't matter",
          content: mockData.get(type) || []
        };
      }
    }
  });

  mock.module("../lib/helpers/github.js", {
    defaultExport: {
      api: {
        orgs: {
          checkPublicMembershipForUser({ org, username }) {
            if (mockOrgMemberships.get(username).includes(org)) {
              return Promise.resolve();
            }

            return Promise.reject(new Error("Doesn't matter"));
          }
        }
      }
    }
  });

  getUserStatus = (await import("../lib/get-user-status.js")).default;
});

function individualData(workstreams, verified, { id = "johndoetw" } = {}) {
  return {
    verified,
    workstreams,
    info: {
      gitHubID: id
    }
  };
}

function entityData(workstreams, verified, { org = "contoso", name = "Contoso Ltd." } = {}) {
  return {
    verified,
    workstreams,
    info: {
      name,
      gitHubOrganization: org
    }
  };
}

beforeEach(() => {
  mockData = new Map();
  mockOrgMemberships = new Map();
});

for (const pull of [undefined, "120"]) {
  test("No data", async t => {
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });


  test("Individual, participating in that particular workstream, verified", async t => {
    mockData.set("individual-public", [individualData(["console"], true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individual, participating in that particular workstream, unverified", async t => {
    mockData.set("individual-public", [individualData(["console"], false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individual, participating in all workstreams, verified", async t => {
    mockData.set("individual-public", [individualData("all", true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individual, participating in all workstreams, unverified", async t => {
    mockData.set("individual-public", [individualData("all", false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individual, participating in other workstreams but not that one, verified", async t => {
    mockData.set("individual-public", [individualData(["xhr"], true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individual, participating in other workstreams but not that one, unverified", async t => {
    mockData.set("individual-public", [individualData(["xhr"], false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });


  test("Via entity, participating in that particular workstream, verified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData(["console"], true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Via entity, participating in that particular workstream, unverified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData(["console"], false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Via entity, participating in all workstreams, verified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData("all", true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Via entity, participating in all workstreams, unverified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData("all", false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Via entity, participating in other workstreams but not that one, verified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData(["xhr"], true)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Via entity, participating in other workstreams but not that one, unverified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso"]);
    mockData.set("entity", [entityData(["xhr"], false)]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });


  test("Multiple entities, one participating and one not", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["xhr"], true, { name: "Contoso 1", org: "contoso1" }),
      entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Multiple entities, one verified and one not", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
      entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Multiple entities, participating one unverified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
      entityData(["xhr"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Multiple entities, one good option", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["xhr"], false, { name: "Contoso 1", org: "contoso1" }),
      entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Multiple entities, all unverified", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
      entityData(["console"], false, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Multiple entities, all not in this workstream", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
    mockData.set("entity", [
      entityData(["xhr"], true, { name: "Contoso 1", org: "contoso1" }),
      entityData(["xhr"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Three entities", async t => {
    mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2", "contoso3"]);
    mockData.set("entity", [
      entityData(["xhr"], true, { name: "Contoso 1", org: "contoso1" }),
      entityData(["xhr"], true, { name: "Contoso 2", org: "contoso2" }),
      entityData(["xhr"], true, { name: "Contoso 3", org: "contoso3" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });


  test("Entities exist, but the user is not in them", async t => {
    mockOrgMemberships.set("johndoetw", []);
    mockData.set("entity", [
      entityData(["console"], true, { name: "Contoso 1", org: "contoso1" }),
      entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individuals exist, but the user is not one of them", async t => {
    mockData.set("individual-public", [
      individualData(["console"], true, { id: "janedoetw" }),
      individualData(["console"], true, { id: "bobbosstw" })
    ]);
    t.assert.snapshot(await getUserStatus("johndoetw", "console", pull));
  });

  test("Individuals exist, but the user is not one of them; it is an XSS attempt", async t => {
    mockData.set("individual-public", [
      individualData(["console"], true, { id: "janedoetw" }),
      individualData(["console"], true, { id: "bobbosstw" })
    ]);
    t.assert.snapshot(await getUserStatus("<script>alert(1);</script>", "console", pull));
  });


  test("Individual exists, but their username is spelled with a different case", async t => {
    mockData.set("individual-public", [individualData(["console"], true, { id: "janeDOEtw" })]);

    t.assert.snapshot(await getUserStatus("JANEdoetw", "console", pull));
  });
}
