"use strict";

// Fake the UUID generator so it is deterministic for snapshot testing.
jest.mock("uuid/v4", () => {
  return () => "1d8ab899-4d91-48b8-acfa-bf9cde5ad909";
});

const lolex = require("lolex");
const submitAgreement = require("../lib/process-agreement.js");
const { BadRequest } = require("http-errors");

// Fake the clock so that signature timestamps are deterministic for snapshot testing.
let clock;
beforeAll(() => {
  clock = lolex.install({ toFake: ["Date"] });
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
    scope: "all",
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

test("An individual with a signature mismatching the name must throw BadRequest", () => {
  const request = goodIndividualRequest();
  request["individual-name"] = "Someone else";

  expect(() => submitAgreement(request)).toThrow(BadRequest);
});

// Entity

function goodEntityRequest() {
  return {
    scope: "all",
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

// Both

const factories = {
  Individual: goodIndividualRequest,
  Entity: goodEntityRequest
};

for (const [label, requestFactory] of Object.entries(factories)) {
  test(label + " with an invalid scope value must throw BadRequest", () => {
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
