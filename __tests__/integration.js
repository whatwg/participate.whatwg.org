"use strict";
const fetch = require("node-fetch");

// The sample config should suffice for just starting up the server.
// We may need something fancier if the integration tests get more in-depth.
jest.mock("../private-config.json", () => {
  // eslint-disable-next-line global-require
  return require("../private-config.sample.json");
}, { virtual: true });


const server = require("../lib/app.js");

afterAll(() => {
  server.close();
});

test("responds to requests to the homepage", async () => {
  const url = `http://127.0.0.1:${server.address().port}/`;

  const body = await (await fetch(url)).text();

  expect(body).toContain("participate in the WHATWG");
});
