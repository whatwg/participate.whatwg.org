/* eslint-disable no-console */
import Koa from "koa";
import KoaRouter from "@koa/router";
import koaHandlebars from "koa-handlebars";
import koaBodyParser from "koa-bodyparser";
import handlebars from "handlebars";
import httpGracefulShutdown from "http-graceful-shutdown";
import routes from "./routes.mjs";
import csp from "./server-infra/csp.mjs";
import errorHandler from "./server-infra/error-handler.mjs";
import handlebarsSectionHelper from "./server-infra/handlebars-section-helper.mjs";
import headers from "./server-infra/headers.mjs";

const app = new Koa();
const router = new KoaRouter();

for (const route of routes) {
  const routerMethod = route.method.toLowerCase();
  router[routerMethod](route.path, route.handler);
}

app
  .use(koaBodyParser())
  .use(koaHandlebars({
    defaultLayout: "whatwg",
    handlebars,
    helpers: {
      section: handlebarsSectionHelper
    }
  }))
  .use(csp)
  .use(errorHandler)
  .use(headers)
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`Running site at: http://localhost:${port}`);

httpGracefulShutdown(server, {
  finally() {
    console.log(`Gracefully shut down the server on ${port}`);
  }
});

export default server;
