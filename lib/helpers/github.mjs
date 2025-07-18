import { Octokit } from "@octokit/rest";
import privateConfig from "./private-config.mjs";
import config from "../../config.json" with { type: "json" };

export const api = (new Octokit({
  auth: privateConfig.gitHub.accessToken
})).rest;

export function locationFromType(type) {
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
      throw new RangeError(`Invalid data file type ${type}`);
    }
  }
}

function filePath(dataRepo, type) {
  const parts = [`${fileBasename(type)}.json`];
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
      throw new RangeError(`Invalid data file type ${type}`);
    }
  }
}
