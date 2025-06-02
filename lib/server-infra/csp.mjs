export default async function csp(ctx, next) {
  const nonce = crypto.randomUUID();
  ctx.state.cspNonce = nonce;

  ctx.set("Content-Security-Policy", `object-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none';`);

  await next();
}
