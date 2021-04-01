"use strict";
const privateConfig = require("../helpers/private-config.js");
const { createHmac } = require("crypto");

module.exports = (ctx, expectedEvent) => {
  const signature = getAndAssertHeader(ctx, "X-Hub-Signature");
  const event = getAndAssertHeader(ctx, "X-GitHub-Event");
  getAndAssertHeader(ctx, "X-GitHub-Delivery");

  ctx.assert(
    event === expectedEvent,
    400,
    `Only ${expectedEvent} events are accepted by this endpoint`
  );

  const payloadSignature = sign(privateConfig.webhook.secret, ctx.request.rawBody);

  ctx.assert(
    payloadSignature === signature,
    400,
    "X-Hub-Signature does not match the body signature"
  );

  return true;
};

function getAndAssertHeader(ctx, header) {
  const value = ctx.get(header.toLowerCase());
  ctx.assert(value, 400, `No ${header} header provided`);

  return value;
}

function sign(secret, body) {
  return `sha1=${createHmac("sha1", secret).update(body).digest("hex")}`;
}
