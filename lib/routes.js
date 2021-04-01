"use strict";
const { URL } = require("url");
const { BadRequest } = require("http-errors");

const config = require("../config.json");
const workstreamsData = require("../sg/db.json").workstreams;
const validateGitHubWebhook = require("./server-infra/validate-github-webhook.js");
const processAgreement = require("./process-agreement.js");
const { addIndividualData, addEntityData } = require("./add-data.js");
const getUserStatus = require("./get-user-status.js");
const prWebhook = require("./pr-webhook.js");
const updatePR = require("./update-pr.js");
const tweetWebhook = require("./tweet-webhook.js");

const publicDataRepo = `${config.publicDataRepo.owner}/${config.publicDataRepo.name}`;

module.exports = [
  {
    path: "/",
    method: "GET",
    async handler(ctx) {
      await ctx.render("index", {
        title: "Participation",
        isIndex: true
      });
    }
  },
  {
    path: "/agreement",
    method: "GET",
    async handler(ctx) {
      await ctx.render("agreement", {
        title: "Participant Agreement",
        workstreams: workstreamsData
      });
    }
  },
  {
    path: "/agreement-update",
    method: "GET",
    async handler(ctx) {
      await ctx.render("agreement-update", {
        title: "Participant Agreement Updates",
        publicDataRepo,
        steeringGroupEmail: config.steeringGroupEmail
      });
    }
  },
  {
    path: "/submit-agreement",
    method: "POST",
    async handler(ctx) {
      const { type, publicData, privateData } = processAgreement(ctx.request.body);

      const commonTemplateVariables = {
        title: "Thanks for submitting!",
        publicDataRepo,
        steeringGroupEmail: config.steeringGroupEmail,
        publicData: JSON.stringify(publicData, 0, 4),
        privateData: JSON.stringify(privateData, 0, 4)
      };

      switch (type) {
        case "individual": {
          await addIndividualData(privateData, publicData);

          await ctx.render("individual-agreement-success", {
            gitHubID: publicData.info.gitHubID,
            ...commonTemplateVariables
          });
          break;
        }
        case "entity": {
          await addEntityData(publicData);

          await ctx.render("entity-agreement-success", {
            organizationName: publicData.info.gitHubOrganization,
            entityName: publicData.info.name,
            contact1: publicData.info.contact1,
            contact2: publicData.info.contact2,
            ...commonTemplateVariables
          });
          break;
        }
        default: {
          throw new Error(`An invalid form type was encountered: ${type}`);
        }
      }
    }
  },
  {
    path: config.statusPath,
    method: "GET",
    async handler(ctx) {
      const { user, repo, pull } = ctx.request.query;
      if (!user) {
        throw new BadRequest("A user parameter is required for this URL.");
      }
      if (!repo) {
        throw new BadRequest("A repo parameter is required for this URL.");
      }
      if (pull && !/^[0-9]+$/u.test(pull)) {
        throw new BadRequest("The pull parameter can only contain digits (0-9).");
      }

      const status = await getUserStatus(user, repo);

      await ctx.render("agreement-status", {
        title: "Participant Agreement Status",
        status: status.longDescription,
        isNothing: status.isNothing,
        prURL: pull ? `https://github.com/whatwg/${repo}/pull/${pull}` : ""
      });
    }
  },
  {
    path: "/update-pr",
    method: "POST",
    async handler(ctx) {
      const { pr } = ctx.request.body;
      if (!pr) {
        throw new BadRequest("A pull request URL is required.");
      }

      let parsedURL;
      try {
        parsedURL = new URL(pr);
      } catch (e) {
        throw new BadRequest("The pull request URL parameter must be a valid URL.");
      }

      await updatePR(parsedURL.href);

      ctx.status = 204;
    }
  },
  {
    path: "/push-status-check",
    method: "POST",
    async handler(ctx) {
      if (validateGitHubWebhook(ctx, "pull_request")) {
        await prWebhook(ctx.request.body);
      }

      ctx.status = 204;
    }
  },
  {
    path: "/webhooks/twitter",
    method: "POST",
    async handler(ctx) {
      if (validateGitHubWebhook(ctx, "push")) {
        await tweetWebhook(ctx.request.body);
      }

      ctx.status = 204;
    }
  },
  {
    path: "/version",
    method: "GET",
    handler(ctx) {
      if (process.env.VERSION) {
        ctx.response.body = process.env.VERSION;
      }
      // Will be treated as 404 by default.
    }
  }
];
