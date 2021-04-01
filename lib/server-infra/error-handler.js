"use strict";
/* eslint-disable no-console */
const { STATUS_CODES } = require("http");
const config = require("../../config.json");

module.exports = async (ctx, next) => {
  try {
    await next();

    // Koa doesn't treat 404s as thrown errors usually
    if (ctx.response.status === 404 && !ctx.response.body) {
      ctx.throw(404);
    }
  } catch (err) {
    ctx.status = typeof err.status === "number" && !isOctokitError(err) ? err.status : 500;

    if (ctx.status === 500) {
      console.error(err.stack, err);
    }

    const statusMessage = STATUS_CODES[ctx.status];
    if (ctx.accepts("text/html", "json") === "json") {
      ctx.type = "application/json";
      ctx.body = {
        statusMessage,
        message: err.expose && err.message !== statusMessage ? err.message : null
      };
    } else {
      await ctx.render("error", {
        title: `Error ${ctx.status}`,
        error: err,
        showMessage: err.expose && err.message !== statusMessage,
        isInternal: !err.expose,
        isConflict: ctx.status === 409,
        statusMessage,
        publicDataRepo: `${config.publicDataRepo.owner}/${config.publicDataRepo.name}`
      });
    }
  }
};

// Octokit uses HttpError too, and these can bubble to us.
// But if one of these reaches us, it's an internal server error, and should not be communicated as
// whatever status code the GitHub API returned.
function isOctokitError(err) {
  return err.documentation_url && err.documentation_url.startsWith("https://developer.github.com/");
}
