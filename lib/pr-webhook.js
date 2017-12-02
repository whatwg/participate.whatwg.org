"use strict";
const gitHubAPI = require("./helpers/github.js").api;
const getUserStatus = require("./get-user-status.js");

module.exports = async body => {
  const status = await getUserStatus(body.pull_request.user.login, body.repository.name);

  await gitHubAPI.repos.createStatus(Object.assign({
    owner: body.repository.owner.login,
    repo: body.repository.name,
    sha: body.pull_request.head.sha
  }, status));
};
