"use strict";

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

  const res = await fetch(url);
  expect(res.status).toEqual(200);

  const body = await res.text();
  expect(body).toContain("participate in the WHATWG");
});

test("send the expected headers", async () => {
  const url = `http://127.0.0.1:${server.address().port}/`;

  const res = await fetch(url);
  expect(res.status).toEqual(200);

  expect(res.headers.get("strict-transport-security"))
    .toEqual("max-age=63072000; includeSubDomains; preload");
  expect(res.headers.get("x-content-type-options")).toEqual("nosniff");
  expect(res.headers.get("x-frame-options")).toEqual("deny");
});

test("/agreement-status throws appropriate error for incorrect pull parameter", async () => {
  const url = `http://127.0.0.1:${server.address().port}/agreement-status?user=test&repo=test&pull=<script>alert(1)</script>`;

  const res = await fetch(url);
  expect(res.status).toEqual(400);

  const body = await res.text();
  expect(body).toContain("The pull parameter can only contain digits (0-9).");
});

test("/version uses VERSION environment variable", async () => {
  process.env.VERSION = "1234567890abcdef";
  const url = `http://127.0.0.1:${server.address().port}/version`;

  const res = await fetch(url);
  expect(res.status).toEqual(200);

  const body = await res.text();
  expect(body).toEqual("1234567890abcdef");
});

test("/version is 404 if VERSION is not set", async () => {
  delete process.env.VERSION;
  const url = `http://127.0.0.1:${server.address().port}/version`;

  const res = await fetch(url);
  expect(res.status).toEqual(404);
});
