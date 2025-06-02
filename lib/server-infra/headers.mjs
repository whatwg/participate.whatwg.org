export default async function headers(ctx, next) {
  // These headers should be kept (mostly) in sync with configuration and tests
  // in https://github.com/whatwg/misc-server.
  ctx.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  ctx.set("X-Content-Type-Options", "nosniff");
  ctx.set("X-Frame-Options", "deny");
  await next();
}
