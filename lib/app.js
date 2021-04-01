"use strict";
/* eslint-disable no-console */
const Koa = require("koa");
const KoaRouter = require("@koa/router");
const koaHandlebars = require("koa-handlebars");
const koaBodyParser = require("koa-bodyparser");
const handlebars = require("handlebars");
const httpGracefulShutdown = require("http-graceful-shutdown");
const routes = require("./routes.js");

const errorHandler = require("./server-infra/error-handler.js");
const handlebarsSectionHelper = require("./server-infra/handlebars-section-helper.js");
const headers = require("./server-infra/headers.js");

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

module.exports = server;
