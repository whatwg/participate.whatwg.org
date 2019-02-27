"use strict";

let mockData = new Map(); // Type -> data file contents as a JS object
let mockOrgMemberships = new Map(); // GitHub user ID -> array of GitHub orgs

jest.mock("../lib/helpers/json-github-database.js", () => {
  return {
    get(type) {
      return {
        sha: "doesn't matter",
        content: mockData.get(type) || []
      };
    }
  };
});

jest.mock("../lib/helpers/github.js", () => {
  return {
    api: {
      orgs: {
        checkPublicMembership({ org, username }) {
          if (mockOrgMemberships.get(username).includes(org)) {
            return Promise.resolve();
          }

          return Promise.reject(new Error("Doesn't matter"));
        }
      }
    }
  };
});


const getUserStatus = require("../lib/get-user-status.js");

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

test("No data", async () => {
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});


test("Individual, participating in that particular workstream, verified", async () => {
  mockData.set("individual-public", [individualData(["console"], true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individual, participating in that particular workstream, unverified", async () => {
  mockData.set("individual-public", [individualData(["console"], false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individual, participating in all workstreams, verified", async () => {
  mockData.set("individual-public", [individualData("all", true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individual, participating in all workstreams, unverified", async () => {
  mockData.set("individual-public", [individualData("all", false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individual, participating in other workstreams but not that one, verified", async () => {
  mockData.set("individual-public", [individualData(["xhr"], true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individual, participating in other workstreams but not that one, unverified", async () => {
  mockData.set("individual-public", [individualData(["xhr"], false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});


test("Via entity, participating in that particular workstream, verified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData(["console"], true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Via entity, participating in that particular workstream, unverified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData(["console"], false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Via entity, participating in all workstreams, verified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData("all", true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Via entity, participating in all workstreams, unverified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData("all", false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Via entity, participating in other workstreams but not that one, verified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData(["xhr"], true)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Via entity, participating in other workstreams but not that one, unverified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso"]);
  mockData.set("entity", [entityData(["xhr"], false)]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});


test("Multiple entities, one participating and one not", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["xhr"], true, { name: "Contoso 1", org: "contoso1" }),
    entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Multiple entities, one verified and one not", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
    entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Multiple entities, participating one unverified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
    entityData(["xhr"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Multiple entities, one good option", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["xhr"], false, { name: "Contoso 1", org: "contoso1" }),
    entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Multiple entities, all unverified", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["console"], false, { name: "Contoso 1", org: "contoso1" }),
    entityData(["console"], false, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Multiple entities, all not in this workstream", async () => {
  mockOrgMemberships.set("johndoetw", ["contoso1", "contoso2"]);
  mockData.set("entity", [
    entityData(["xhr"], true, { name: "Contoso 1", org: "contoso1" }),
    entityData(["xhr"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});


test("Entities exist, but the user is not in them", async () => {
  mockOrgMemberships.set("johndoetw", []);
  mockData.set("entity", [
    entityData(["console"], true, { name: "Contoso 1", org: "contoso1" }),
    entityData(["console"], true, { name: "Contoso 2", org: "contoso2" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individuals exist, but the user is not one of them", async () => {
  mockData.set("individual-public", [
    individualData(["console"], true, { id: "janedoetw" }),
    individualData(["console"], true, { id: "bobbosstw" })
  ]);
  expect(await getUserStatus("johndoetw", "console")).toMatchSnapshot();
});

test("Individuals exist, but the user is not one of them; it is an XSS attempt", async () => {
  mockData.set("individual-public", [
    individualData(["console"], true, { id: "janedoetw" }),
    individualData(["console"], true, { id: "bobbosstw" })
  ]);
  expect(await getUserStatus("<script>alert(1);</script>", "console")).toMatchSnapshot();
});


test("Individual exists, but their username is spelled with a different case", async () => {
  mockData.set("individual-public", [individualData(["console"], true, { id: "janeDOEtw" })]);

  expect(await getUserStatus("JANEdoetw", "console")).toMatchSnapshot();
});
