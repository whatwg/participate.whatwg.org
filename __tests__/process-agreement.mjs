import { before, test, mock } from "node:test";
import httpErrors from "http-errors";
const { BadRequest } = httpErrors;

let submitAgreement;
before(async () => {
  // Fake the UUID generator so it is deterministic for snapshot testing.
  mock.module("crypto", {
    namedExports: {
      randomUUID() {
        return "1d8ab899-4d91-48b8-acfa-bf9cde5ad909";
      }
    }
  });

  // Mock Date.now() to return 0 for deterministic testing
  mock.timers.enable({ apis: ["Date"], now: 0 });

  submitAgreement = (await import("../lib/process-agreement.js")).default;
});

// General

test("An empty body must throw BadRequest", t => {
  t.assert.throws(() => submitAgreement({}), BadRequest);
});

test("A body with both individual and entity fields must throw BadRequest", t => {
  const request = Object.assign(goodIndividualRequest(), goodEntityRequest());

  t.assert.throws(() => submitAgreement(request), BadRequest);
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

test("An individual with a scope of \"all\" must transform appropriately", t => {
  t.assert.snapshot(submitAgreement(goodIndividualRequest()));
});

test("An individual with an array of known scopes must transform appropriately", t => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  t.assert.snapshot(submitAgreement(request));
});

// The data format is different: see https://github.com/whatwg/html/pull/3606#issuecomment-378049017
test("An individual selecting a single known workstream must transform appropriately", t => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = "html";

  t.assert.snapshot(submitAgreement(request));
});

test("An individual sending a single unknown workstream must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request.scope = "some";
  request["scope-workstreams"] = "asdf";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An invited individual with all the workstreams must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "all";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An invited individual with a single non-invited workstream must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "some";
  request["scope-workstreams"] = "compat";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An invited individual with multiple non-invited workstreams must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An invited individual with scope-workstreams set must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "invited";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("A non-invited individual with scope set to invited must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "self";
  request.scope = "invited";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An invited individual with invited as their workstreams must transform appropriately", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "invited";
  request.scope = "invited";

  t.assert.snapshot(submitAgreement(request));
});

const requiredIndividualKeys = Object.keys(goodIndividualRequest());
for (const key of requiredIndividualKeys) {
  test(`Individual information missing ${key} must throw BadRequest`, t => {
    const without = goodIndividualRequest();
    delete without[key];
    t.assert.throws(() => submitAgreement(without), BadRequest);
  });

  for (const disallowed of ["", null, 5]) {
    test(`Individual information with ${key} set to ${JSON.stringify(disallowed)} ` +
      "must throw BadRequest", t => {
      const bad = goodIndividualRequest();
      bad[key] = "";
      t.assert.throws(() => submitAgreement(bad), BadRequest);
    });
  }
}

test("An individual with an invalid individual-type must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-type"] = "asdf";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An individual with a signature mismatching the name must throw BadRequest", t => {
  const request = goodIndividualRequest();
  request["individual-name"] = "Someone else";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An individual with a GitHub ID including @ must get normalized", t => {
  const request = goodIndividualRequest();
  request["individual-github"] = "@domenic";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubID, "domenic");
});

test("An individual with a GitHub ID as a no-slash URL must get normalized", t => {
  const request = goodIndividualRequest();
  request["individual-github"] = "https://github.com/domenic";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubID, "domenic");
});

test("An individual with a GitHub ID as a slash-suffixed URL must get normalized", t => {
  const request = goodIndividualRequest();
  request["individual-github"] = "https://github.com/domenic/";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubID, "domenic");
});

test("An individual with a GitHub ID as a protocol-less slash-less URL must get normalized", t => {
  const request = goodIndividualRequest();
  request["individual-github"] = "github.com/domenic";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubID, "domenic");
});

test("An individual with an otherwise-invalid GitHub ID must throw BadRequest", t => {
  const request = goodIndividualRequest();

  request["individual-github"] = "dom enic";
  t.assert.throws(() => submitAgreement(request), BadRequest);

  request["individual-github"] = "domenic-";
  t.assert.throws(() => submitAgreement(request), BadRequest);

  request["individual-github"] = "domenic@";
  t.assert.throws(() => submitAgreement(request), BadRequest);

  request["individual-github"] = "https://domenic";
  t.assert.throws(() => submitAgreement(request), BadRequest);
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

test("An entity with a scope of \"all\" must transform appropriately", t => {
  t.assert.snapshot(submitAgreement(goodEntityRequest()));
});

test("An entity with a scope of \"invited\" must throw BadRequest", t => {
  const request = goodEntityRequest();
  request.scope = "invited";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with an array of known scopes must transform appropriately", t => {
  const request = goodEntityRequest();
  request.scope = "some";
  request["scope-workstreams"] = ["compat", "console", "xhr"];

  t.assert.snapshot(submitAgreement(request));
});

const requiredEntityKeys = new Set(Object.keys(goodEntityRequest()));
requiredEntityKeys.delete("contact-2-name");
requiredEntityKeys.delete("contact-2-email");
requiredEntityKeys.delete("contact-2-github");

for (const key of requiredEntityKeys) {
  test(`Entity information missing ${key} must throw BadRequest`, t => {
    const without = goodEntityRequest();
    delete without[key];
    t.assert.throws(() => submitAgreement(without), BadRequest);
  });

  for (const disallowed of ["", null, 5]) {
    test(`Entity information with ${key} set to ${JSON.stringify(disallowed)} ` +
      "must throw BadRequest", t => {
      const bad = goodEntityRequest();
      bad[key] = "";
      t.assert.throws(() => submitAgreement(bad), BadRequest);
    });
  }
}

test("An invalid entity URL must throw BadRequest", t => {
  const request = goodEntityRequest();
  request["entity-url"] = "https://example.com:notanumber";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("A non-normalized entity URL must become normalized", t => {
  const request = goodEntityRequest();
  request["entity-url"] = "https:example.com";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.url, "https://example.com/");
});

test("An entity with a backup contact: yes name/yes email/no GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: yes name/no email/yes GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: yes name/no email/no GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-email"];
  delete request["contact-2-github"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: no name/yes email/yes GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: no name/yes email/no GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-github"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: no name/no email/yes GitHub in the input, must throw " +
  "BadRequest", t => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-email"];

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with a backup contact: no name/no email/no GitHub in the input, must end up with " +
  "no backup contact in the output", t => {
  const request = goodEntityRequest();
  delete request["contact-2-name"];
  delete request["contact-2-email"];
  delete request["contact-2-github"];

  const result = submitAgreement(request);
  t.assert.strictEqual(result.publicData.info.contact2, undefined);
});

test("An entity with a signature mismatching the signer name must throw BadRequest", t => {
  const request = goodEntityRequest();
  request["entity-signed-by"] = "Someone else";

  t.assert.throws(() => submitAgreement(request), BadRequest);
});

test("An entity with GitHub IDs including @s must get normalized", t => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "@contoso";
  request["contact-1-github"] = "@ellencontoso";
  request["contact-2-github"] = "@lisacontoso";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubOrganization, "contoso");
  t.assert.strictEqual(result.publicData.info.contact1.gitHubID, "ellencontoso");
  t.assert.strictEqual(result.publicData.info.contact2.gitHubID, "lisacontoso");
});

test("An entity with GitHub IDs as no-slash URLs must get normalized", t => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "https://github.com/contoso";
  request["contact-1-github"] = "https://github.com/ellencontoso";
  request["contact-2-github"] = "https://github.com/lisacontoso";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubOrganization, "contoso");
  t.assert.strictEqual(result.publicData.info.contact1.gitHubID, "ellencontoso");
  t.assert.strictEqual(result.publicData.info.contact2.gitHubID, "lisacontoso");
});

test("An entity with GitHub IDs as slash-suffixed URLs must get normalized", t => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "https://github.com/contoso/";
  request["contact-1-github"] = "https://github.com/ellencontoso/";
  request["contact-2-github"] = "https://github.com/lisacontoso/";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubOrganization, "contoso");
  t.assert.strictEqual(result.publicData.info.contact1.gitHubID, "ellencontoso");
  t.assert.strictEqual(result.publicData.info.contact2.gitHubID, "lisacontoso");
});

test("An entity with GitHub IDs as protocol-less slash-less URLs must get normalized", t => {
  const request = goodEntityRequest();
  request["entity-github-organization"] = "github.com/contoso";
  request["contact-1-github"] = "github.com/ellencontoso";
  request["contact-2-github"] = "github.com/lisacontoso";

  const result = submitAgreement(request);

  t.assert.strictEqual(result.publicData.info.gitHubOrganization, "contoso");
  t.assert.strictEqual(result.publicData.info.contact1.gitHubID, "ellencontoso");
  t.assert.strictEqual(result.publicData.info.contact2.gitHubID, "lisacontoso");
});

test("An entity with otherwise-invalid GitHub IDs must throw BadRequest", t => {
  for (const field of ["entity-github-organization", "contact-1-github", "contact-2-github"]) {
    const request = goodEntityRequest();

    request[field] = "cont oso";
    t.assert.throws(() => submitAgreement(request), BadRequest);

    request[field] = "contoso-";
    t.assert.throws(() => submitAgreement(request), BadRequest);

    request[field] = "contoso@";
    t.assert.throws(() => submitAgreement(request), BadRequest);

    request[field] = "https://contoso";
    t.assert.throws(() => submitAgreement(request), BadRequest);
  }
});

// Both

const factories = {
  Individual: goodIndividualRequest,
  Entity: goodEntityRequest
};

for (const [label, requestFactory] of Object.entries(factories)) {
  test(`${label} with an invalid scope value must throw BadRequest`, t => {
    const request = requestFactory();
    request.scope = "blah";

    t.assert.throws(() => submitAgreement(request), BadRequest);
  });

  test(`${label} with an "all" scope but a workstreams field must throw BadRequest`, t => {
    const request = requestFactory();
    request["scope-workstreams"] = ["compat"];

    t.assert.throws(() => submitAgreement(request), BadRequest);
  });

  test(`${label} with a "some" scope but no workstreams field must throw BadRequest`, t => {
    const request = requestFactory();
    request.scope = "some";

    t.assert.throws(() => submitAgreement(request), BadRequest);
  });

  test(`${label} with a "some" scope but an empty workstreams field must throw BadRequest`, t => {
    const request = requestFactory();
    request.scope = "some";
    request["scope-workstreams"] = [];

    t.assert.throws(() => submitAgreement(request), BadRequest);
  });

  test(
    `${label} with a "some" scope but a non-array workstreams field must throw BadRequest`,
    t => {
      const request = requestFactory();
      request.scope = "some";
      request["scope-workstreams"] = 5;

      t.assert.throws(() => submitAgreement(request), BadRequest);
    }
  );

  test(`${label} with a "some" scope but invalid workstreams must throw BadRequest`, t => {
    const request = requestFactory();
    request.scope = "some";
    request["scope-workstreams"] = ["console", "compat", "blah"];

    t.assert.throws(() => submitAgreement(request), BadRequest);
  });
}
