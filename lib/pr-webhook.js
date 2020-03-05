"use strict";
const gitHubAPI = require("./helpers/github.js").api;
const getUserStatus = require("./get-user-status.js");

module.exports = async body => {
  // It's possible for random users to create pull requests between any two branches they can see,
  // for some reason. In particular they can create pull requests from master to other branches,
  // which if we proceeded, would cause this hook to override the status on master. If that
  // happens, bail out.
  if (body.pull_request.base.ref !== "master") {
    return;
  }

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

async function prExists(pr) {
  try {
    await gitHubAPI.pulls.get({
      pull_number: pr.number,
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      method: "HEAD"
    });
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
  return true;
}
