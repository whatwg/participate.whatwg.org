"use strict";
const { BadRequest, Forbidden } = require("http-errors");
const gitHubAPI = require("./helpers/github.js").api;
const getUserStatus = require("./get-user-status.js");
const config = require("../config.json");
const workstreamsData = require("../sg/db.json").workstreams;

const repos = workstreamsData.map(workstream => workstream.id).join("|");

module.exports = async url => {
  const prLocation = getPRLocation(url);
  const pr = (await gitHubAPI.pulls.get(prLocation)).data;

  if (pr.merged_at) {
    throw new Forbidden("Cannot update pull requests that have been merged; their status must " +
      "stay immutable for the historical record.");
  }

  const status = await getUserStatus(pr.user.login, prLocation.repo);

  await gitHubAPI.repos.createStatus(Object.assign({
    owner: prLocation.owner,
    repo: prLocation.repo,
    sha: pr.head.sha
  }, status));
};

function getPRLocation(url) {
  // URL will have been parsed and serialized by now, so this is reasonable to do.
  const re = new RegExp(
    `^https://github.com/${config.specOrg}/(${repos})/pull/([1-9][0-9]*)(?:/[^/]+)?(?:#.*)?$`);
  const match = re.exec(url);

  if (match === null) {
    throw new BadRequest(
      `The URL did not look like a valid pull request URL for ${config.specOrg}.`
    );
  }

  return {
    owner: config.specOrg,
    repo: match[1],
    pull_number: Number(match[2])
  };
}
