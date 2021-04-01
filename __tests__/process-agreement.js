"use strict";

// Fake the UUID generator so it is deterministic for snapshot testing.
jest.mock("uuid", () => {
  return {
    v4() {
      return "1d8ab899-4d91-48b8-acfa-bf9cde5ad909";
    }
  };
});

const fakeTimers = require("@sinonjs/fake-timers");
const submitAgreement = require("../lib/process-agreement.js");
const { BadRequest } = require("http-errors");

// Fake the clock so that signature timestamps are deterministic for snapshot testing.
let clock;
beforeAll(() => {
  clock = fakeTimers.install({ toFake: ["Date"] });
});
afterAll(() => {
  clock.uninstall();
});

// General

test("An empty body must throw BadRequest", () => {
  expect(() => submitAgreement({})).toThrow(BadRequest);
});

test("A body with both individual and entity fields must throw BadRequest", () => {
  const request = Object.assign(goodIndividualRequest(), goodEntityRequest());

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

// Individual

function goodIndividualRequest() {
  return {
    "scope": "all",
    "individual-type": "self",
    "individual-name": "Domenic Denicola",
    "individual-address": "New York, NY, USA",
    "individual-email": "d@domenic.me",
    "individual-github": "domenic",
    "individual-signature": "Domenic Denicola",
    "individual-date": "2017-08-10"
  };
}

test("An individual with a scope of \"all\" must transform appropriately", () => {
  expect(submitAgreement(goodIndividualRequest())).toMatchSnapshot();
});

test("An individual with an array of known scopes must transform appropriately", () => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  expect(submitAgreement(request)).toMatchSnapshot();
});

// The data format is different: see https://github.com/whatwg/html/pull/3606#issuecomment-378049017
test("An individual selecting a single known workstream must transform appropriately", () => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = "html";

  expect(submitAgreement(request)).toMatchSnapshot();
});

test("An individual sending a single unknown workstream must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = "asdf";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An invited individual with all the workstreams must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "all";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An invited individual with a single non-invited workstream must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "some";
  request["scope-workstreams"] = "compat";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An invited individual with multiple non-invited workstreams must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An invited individual with scope-workstreams set must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "invited";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("A non-invited individual with scope set to invited must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "self";
  request.scope = "invited";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An invited individual with invited as their workstreams must transform appropriately", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "invited";

  expect(submitAgreement(request)).toMatchSnapshot();
});

const requiredIndividualKeys = Object.keys(goodIndividualRequest());
for (const key of requiredIndividualKeys) {
  test(`Individual information missing ${key} must throw BadRequest`, () => {
    const without = goodIndividualRequest();
    delete without[key];
    expect(() => submitAgreement(without)).toThrow(BadRequest);
  });

  for (const disallowed of ["", null, 5]) {
    test(`Individual information with ${key} set to ${JSON.stringify(disallowed)} ` +
      "must throw BadRequest", () => {
      const bad = goodIndividualRequest();
      bad[key] = "";
      expect(() => submitAgreement(bad)).toThrow(BadRequest);
    });
  }
}

test("An individual with an invalid individual-type must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-type"] = "asdf";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An individual with a signature mismatching the name must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-name"] = "Someone else";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An individual with a GitHub ID including @ must get normalized", () => {
  const request = goodIndividualRequest();
  request["individual-github"] = "@domenic";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubID).toEqual("domenic");
});

test("An individual with a GitHub ID as a no-slash URL must get normalized", () => {
  const request = goodIndividualRequest();
  request["individual-github"] = "https://github.com/domenic";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubID).toEqual("domenic");
});

test("An individual with a GitHub ID as a slash-suffixed URL must get normalized", () => {
  const request = goodIndividualRequest();
  request["individual-github"] = "https://github.com/domenic/";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubID).toEqual("domenic");
});

test("An individual with a GitHub ID as a protocol-less slash-less URL must get normalized", () => {
  const request = goodIndividualRequest();
  request["individual-github"] = "github.com/domenic";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubID).toEqual("domenic");
});

test("An individual with an otherwise-invalid GitHub ID must throw BadRequest", () => {
  const request = goodIndividualRequest();

  request["individual-github"] = "dom enic";
  expect(() => submitAgreement(request)).toThrow(BadRequest);

  request["individual-github"] = "domenic-";
  expect(() => submitAgreement(request)).toThrow(BadRequest);

  request["individual-github"] = "domenic@";
  expect(() => submitAgreement(request)).toThrow(BadRequest);

  request["individual-github"] = "https://domenic";
  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

// Entity

function goodEntityRequest() {
  return {
    "scope": "all",
    "entity-name": "Contoso Ltd.",
    "entity-address": "123 Main Street, New York, NY, USA",
    "entity-url": "https://contoso.com/",
    "entity-signed-by": "Domenic Denicola",
    "entity-title": "Software engineer",
    "entity-signature": "Domenic Denicola",
    "entity-date": "2017-08-10",
    "contact-1-name": "Ellen Adams",
    "contact-1-email": "ellen@contoso.com",
    "contact-1-github": "ellencontoso",
    "contact-2-name": "Lisa Andrews",
    "contact-2-email": "lisa@contoso.com",
    "contact-2-github": "lisacontoso",
    "entity-github-organization": "contoso"
  };
}

test("An entity with a scope of \"all\" must transform appropriately", () => {
  expect(submitAgreement(goodEntityRequest())).toMatchSnapshot();
});

test("An entity with a scope of \"invited\" must throw BadRequest", () => {
  const request = goodEntityRequest();
  request.scope = "invited";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with an array of known scopes must transform appropriately", () => {
  const request = goodEntityRequest();
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  expect(submitAgreement(request)).toMatchSnapshot();
});

const requiredEntityKeys = new Set(Object.keys(goodEntityRequest()));
requiredEntityKeys.delete("contact-2-name");
requiredEntityKeys.delete("contact-2-email");
requiredEntityKeys.delete("contact-2-github");

for (const key of requiredEntityKeys) {
  test(`Entity information missing ${key} must throw BadRequest`, () => {
    const without = goodEntityRequest();
    delete without[key];
    expect(() => submitAgreement(without)).toThrow(BadRequest);
  });

  for (const disallowed of ["", null, 5]) {
    test(`Entity information with ${key} set to ${JSON.stringify(disallowed)} ` +
      "must throw BadRequest", () => {
      const bad = goodEntityRequest();
      bad[key] = "";
      expect(() => submitAgreement(bad)).toThrow(BadRequest);
    });
  }
}

test("An invalid entity URL must throw BadRequest", () => {
  const request = goodEntityRequest();
  request["entity-url"] = "https://example.com:notanumber";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("A non-normalized entity URL must become normalized", () => {
  const request = goodEntityRequest();
  request["entity-url"] = "https:example.com";

  const result = submitAgreement(request);

  expect(result.publicData.info.url).toBe("https://example.com/");
});

test("An entity with a backup contact: yes name/yes email/no GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: yes name/no email/yes GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: yes name/no email/no GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];
  delete request["contact-2-github"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: no name/yes email/yes GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: no name/yes email/no GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-github"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: no name/no email/yes GitHub in the input, must throw " +
  "BadRequest", () => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-email"];

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with a backup contact: no name/no email/no GitHub in the input, must end up with " +
  "no backup contact in the output", () => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-email"];
  delete request["contact-2-github"];

  const result = submitAgreement(request);
  expect(result.publicData.info.contact2).toBeUndefined();
});

test("An entity with a signature mismatching the signer name must throw BadRequest", () => {
  const request = goodEntityRequest();
  request["entity-signed-by"] = "Someone else";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

test("An entity with GitHub IDs including @s must get normalized", () => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "@contoso";
  request["contact-1-github"] = "@ellencontoso";
  request["contact-2-github"] = "@lisacontoso";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubOrganization).toEqual("contoso");
  expect(result.publicData.info.contact1.gitHubID).toEqual("ellencontoso");
  expect(result.publicData.info.contact2.gitHubID).toEqual("lisacontoso");
});

test("An entity with GitHub IDs as no-slash URLs must get normalized", () => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "https://github.com/contoso";
  request["contact-1-github"] = "https://github.com/ellencontoso";
  request["contact-2-github"] = "https://github.com/lisacontoso";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubOrganization).toEqual("contoso");
  expect(result.publicData.info.contact1.gitHubID).toEqual("ellencontoso");
  expect(result.publicData.info.contact2.gitHubID).toEqual("lisacontoso");
});

test("An entity with GitHub IDs as slash-suffixed URLs must get normalized", () => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "https://github.com/contoso/";
  request["contact-1-github"] = "https://github.com/ellencontoso/";
  request["contact-2-github"] = "https://github.com/lisacontoso/";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubOrganization).toEqual("contoso");
  expect(result.publicData.info.contact1.gitHubID).toEqual("ellencontoso");
  expect(result.publicData.info.contact2.gitHubID).toEqual("lisacontoso");
});

test("An entity with GitHub IDs as protocol-less slash-less URLs must get normalized", () => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "github.com/contoso";
  request["contact-1-github"] = "github.com/ellencontoso";
  request["contact-2-github"] = "github.com/lisacontoso";

  const result = submitAgreement(request);

  expect(result.publicData.info.gitHubOrganization).toEqual("contoso");
  expect(result.publicData.info.contact1.gitHubID).toEqual("ellencontoso");
  expect(result.publicData.info.contact2.gitHubID).toEqual("lisacontoso");
});

test("An entity with otherwise-invalid GitHub IDs must throw BadRequest", () => {
  for (const field of ["entity-github-organization", "contact-1-github", "contact-2-github"]) {
    const request = goodEntityRequest();

    request[field] = "cont oso";
    expect(() => submitAgreement(request)).toThrow(BadRequest);

    request[field] = "contoso-";
    expect(() => submitAgreement(request)).toThrow(BadRequest);

    request[field] = "contoso@";
    expect(() => submitAgreement(request)).toThrow(BadRequest);

    request[field] = "https://contoso";
    expect(() => submitAgreement(request)).toThrow(BadRequest);
  }
});


// Both

const factories = {
  Individual: goodIndividualRequest,
  Entity: goodEntityRequest
};

for (const [label, requestFactory] of Object.entries(factories)) {
  test(`${label} with an invalid scope value must throw BadRequest`, () => {
    const request = requestFactory();
    request.scope = "blah";

    expect(() => submitAgreement(request)).toThrow(BadRequest);
  });

  test(`${label} with an "all" scope but a workstreams field must throw BadRequest`, () => {
    const request = requestFactory();
    request["scope-workstreams"] = ["compat"];

    expect(() => submitAgreement(request)).toThrow(BadRequest);
  });

  test(`${label} with a "some" scope but no workstreams field must throw BadRequest`, () => {
    const request = requestFactory();
    request.scope = "some";

    expect(() => submitAgreement(request)).toThrow(BadRequest);
  });

  test(`${label} with a "some" scope but an empty workstreams field must throw BadRequest`, () => {
    const request = requestFactory();
    request.scope = "some";
    request["scope-workstreams"] = [];

    expect(() => submitAgreement(request)).toThrow(BadRequest);
  });

  test(
    `${label} with a "some" scope but a non-array workstreams field must throw BadRequest`,
    () => {
      const request = requestFactory();
      request.scope = "some";
      request["scope-workstreams"] = 5;

      expect(() => submitAgreement(request)).toThrow(BadRequest);
    }
  );

  test(`${label} with a "some" scope but invalid workstreams must throw BadRequest`, () => {
    const request = requestFactory();
    request.scope = "some";
    request["scope-workstreams"] = ["console", "compat", "blah"];

    expect(() => submitAgreement(request)).toThrow(BadRequest);
  });
}
