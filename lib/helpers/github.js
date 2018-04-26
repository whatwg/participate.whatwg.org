"use strict";
const GitHub = require("@octokit/rest");
const config = require("../../config.json");
const privateConfig = require("../../private-config.json");

exports.api = new GitHub();

// Note: this is OK to call at top level because it just stores the token for future requests.
exports.api.authenticate({
  type: "token",
  token: privateConfig.gitHub.accessToken
});

exports.locationFromType = type => {
  switch (type) {
    case "individual-private": {
      return {
        owner: privateConfig.privateDataRepo.owner,
        repo: privateConfig.privateDataRepo.name,
        path: filePath(privateConfig.privateDataRepo, type)
      };
    }

    case "individual-public":
    case "entity": {
      return {
        owner: config.publicDataRepo.owner,
        repo: config.publicDataRepo.name,
        path: filePath(config.publicDataRepo, type)
      };
    }

    default: {
      throw new RangeError("Invalid data file type " + type);
    }
  }
};

function filePath(dataRepo, type) {
  const parts = [fileBasename(type) + ".json"];
  if (dataRepo.dataPath) {
    parts.unshift(dataRepo.dataPath);
  }

  return parts.join("/");
}

function fileBasename(type) {
  switch (type) {
    case "individual-private":
    case "individual-public": {
      return "individuals";
    }
    case "entity": {
      return "entities";
    }
    default: {
      throw new RangeError("Invalid data file type " + type);
    }
  }
}
