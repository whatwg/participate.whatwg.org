"use strict";
const privateConfig = require("../../private-config.json");
const { createHmac } = require("crypto");

module.exports = (ctx, workstreamFromRepo) => {
  const signature = getAndAssertHeader(ctx, "X-Hub-Signature");
  const event = getAndAssertHeader(ctx, "X-GitHub-Event");
  getAndAssertHeader(ctx, "X-GitHub-Delivery");

  ctx.assert(event === "push" || event === "pull_request", 400,
    `Only push and pull_request events are accepted by this endpoint`);

  const payloadSignature = sign(privateConfig.webhook.secret, ctx.request.rawBody);

  ctx.assert(payloadSignature === signature, 400,
    "X-Hub-Signature does not match the body signature");

  if (workstreamFromRepo(ctx.request.body.repository.name) === undefined) {
    return;
  }

  if (event === "pull_request" && (ctx.request.body.action === "opened" ||
                                   ctx.request.body.action === "synchronize")) {
    return event;
  }

  if (event === "push" && ctx.request.body.ref === "refs/heads/main") {
    return event;
  }
};

function getAndAssertHeader(ctx, header) {
  const value = ctx.get(header.toLowerCase());
  ctx.assert(value, 400, `No ${header} header provided`);

  return value;
}

function sign(secret, body) {
  return "sha1=" + createHmac("sha1", secret).update(body).digest("hex");
}
