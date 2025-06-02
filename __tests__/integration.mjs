import { before, after, test, mock } from "node:test";

let server;
before(async () => {
  // The sample config should suffice for just starting up the server.
  // We may need something fancier if the integration tests get more in-depth.
  mock.module("../private-config.json", {
    defaultExport: (await import("../private-config.sample.json", { with: { type: "json" } })).default
  });

  server = (await import("../lib/app.mjs")).default;
});

after(() => {
  server.close();
});

test("responds to requests to the homepage", async t => {
  const url = `http://127.0.0.1:${server.address().port}/`;

  const res = await fetch(url);
  t.assert.strictEqual(res.status, 200);

  const body = await res.text();
  t.assert.ok(body.includes("participate in the WHATWG"));
});

test("send the expected headers", async t => {
  const url = `http://127.0.0.1:${server.address().port}/`;

  const res = await fetch(url);
  t.assert.strictEqual(res.status, 200);

  t.assert.strictEqual(res.headers.get("strict-transport-security"), "max-age=63072000; includeSubDomains; preload");
  t.assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
  t.assert.strictEqual(res.headers.get("x-frame-options"), "deny");
});

test("/agreement-status throws appropriate error for incorrect pull parameter", async t => {
  const url = `http://127.0.0.1:${server.address().port}/agreement-status?user=test&repo=test&pull=<script>alert(1)</script>`;

  const res = await fetch(url);
  t.assert.strictEqual(res.status, 400);

  const body = await res.text();
  t.assert.ok(body.includes("The pull parameter can only contain digits (0-9)."));
});

test("/version uses VERSION environment variable", async t => {
  process.env.VERSION = "1234567890abcdef";
  const url = `http://127.0.0.1:${server.address().port}/version`;

  const res = await fetch(url);
  t.assert.strictEqual(res.status, 200);

  const body = await res.text();
  t.assert.strictEqual(body, "1234567890abcdef");
});

test("/version is 404 if VERSION is not set", async t => {
  delete process.env.VERSION;
  const url = `http://127.0.0.1:${server.address().port}/version`;

  const res = await fetch(url);
  t.assert.strictEqual(res.status, 404);
});
