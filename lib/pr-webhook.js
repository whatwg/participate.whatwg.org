"use strict";
const gitHubAPI = require("./helpers/github.js").api;
const getUserStatus = require("./get-user-status.js");

module.exports = async body => {
  // The PR existence check is necessary because deleted PRs still ping this endpoint, for some
  // reason. See https://github.com/whatwg/html/issues/3582 for what happened previously.
  const [status, exists] = await Promise.all([
    getUserStatus(body.pull_request.user.login, body.repository.name),
    prExists(body.pull_request)
  ]);

  if (!exists) {
    return;
  }

  await gitHubAPI.repos.createStatus(Object.assign({
    owner: body.repository.owner.login,
    repo: body.repository.name,
    sha: body.pull_request.head.sha
  }, status));
};

// This is inefficient (gets the entire PR body for no reason).
// See https://github.com/octokit/rest.js/issues/841.
async function prExists(pr) {
  try {
    await gitHubAPI.pullRequests.get({
      number: pr.number,
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name
    });
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
  return true;
}
