"use strict";
const { randomUUID } = require("crypto");

module.exports = async (ctx, next) => {
  const nonce = randomUUID();
  ctx.state.cspNonce = nonce;

  ctx.set("Content-Security-Policy", `object-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none';`);

  await next();
};
