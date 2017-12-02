"use strict";
const privateConfig = require("../../private-config.json");
const { createHmac } = require("crypto");

module.exports = ctx => {
  const signature = getAndAssertHeader(ctx, "X-Hub-Signature");
  const event = getAndAssertHeader(ctx, "X-GitHub-Event");
  getAndAssertHeader(ctx, "X-GitHub-Delivery");

  ctx.assert(event === "pull_request", 400,
    "Only pull_request events are accepted by this endpoint");

  const payloadSignature = sign(privateConfig.webhook.secret, ctx.request.rawBody);

  ctx.assert(payloadSignature === signature, 400,
    "X-Hub-Signature does not match the body signature");

  return ctx.request.body.action === "opened" || ctx.request.body.action === "synchronize";
};

function getAndAssertHeader(ctx, header) {
  const value = ctx.get(header.toLowerCase());
  ctx.assert(value, 400, `No ${header} header provided`);

  return value;
}

function sign(secret, body) {
  return "sha1=" + createHmac("sha1", secret).update(body).digest("hex");
}
