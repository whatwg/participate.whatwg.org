"use strict";
const { URL } = require("url");
const listify = require("listify");
const config = require("../config.json");
const gitHubAPI = require("./helpers/github.js").api;
const jsonGitHubDatabase = require("./helpers/json-github-database.js");

const statusURLBase = (new URL(config.statusPath, config.serverURL)).href;

module.exports = async (submitterGitHubID, repoName) => {
  const [individualsData, entityData] = await Promise.all([
    jsonGitHubDatabase.get("individual-public"),
    jsonGitHubDatabase.get("entity")
  ]);

  for (const individual of individualsData.content) {
    if (individual.info.gitHubID === submitterGitHubID) {
      if (individual.verified) {
        if (individual.workstreams === "all" || individual.workstreams.includes(repoName)) {
          return statusIndividual(submitterGitHubID, repoName);
        }
        return statusIndividualNoWorkstreams(submitterGitHubID, repoName);
      }

      return statusIndividualUnverified(submitterGitHubID, repoName);
    }
  }

  // It's easier and more deterministic to just wait for all, rather than trying to do anything
  // clever with succeeding early. Especially because of the verified checks.
  const entitiesOrNull = await Promise.all(entityData.content.map(async entity => {
    if (await isOrgMember(entity.info.gitHubOrganization, submitterGitHubID)) {
      return entity;
    }
    return null;
  }));
  const entitiesUserIsWith = entitiesOrNull.filter(val => val !== null);

  if (entitiesUserIsWith.length > 0) {
    const verifiedEntities = entitiesUserIsWith.filter(entity => entity.verified);

    if (verifiedEntities.length === 0) {
      return statusEntitiesUnverified(submitterGitHubID, repoName, entitiesUserIsWith);
    }

    for (const entity of verifiedEntities) {
      if (entity.workstreams === "all" || entity.workstreams.includes(repoName)) {
        return statusEntity(submitterGitHubID, repoName, entity);
      }
    }

    return statusEntityNoWorkstreams(submitterGitHubID, repoName, verifiedEntities);
  }

  return statusNothing(submitterGitHubID, repoName);
};

function statusIndividual(submitterGitHubID, repoName) {
  return {
    state: "success",
    isNothing: false,
    description: `@${submitterGitHubID} has signed up to participate as an individual`,
    longDescription: `@${submitterGitHubID} has signed up to participate as an individual. All ` +
                     `is well; contribute at will!`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusIndividualNoWorkstreams(submitterGitHubID, repoName) {
  const workstreamName = getWorkstreamName(repoName);
  const repo = config.publicDataRepo.owner + "/" + config.publicDataRepo.name;

  return {
    state: "pending",
    isNothing: false,
    description: `@${submitterGitHubID} participates as an individual, but not in this workstream`,
    longDescription: `@${submitterGitHubID} has signed up to participate as an individual, but ` +
                     `has not chosen to participate in the ${workstreamName} workstream. To ` +
                     `amend your agreement, submit a pull request to <a href="https://github.com/` +
                     `${repo}">${repo}</a>.`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusIndividualUnverified(submitterGitHubID, repoName) {
  return {
    state: "pending",
    isNothing: false,
    description: `@${submitterGitHubID} is not yet verified`,
    longDescription: `@${submitterGitHubID} has signed up to participate as an individual, but ` +
                     `has not yet been verified. Hold tight while we sort this out on our end!`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusEntity(submitterGitHubID, repoName, entity) {
  const workstreamName = getWorkstreamName(repoName);

  return {
    state: "success",
    isNothing: false,
    description: `${submitterGitHubID} participates on behalf of ${entity.info.name}`,
    longDescription: `@${submitterGitHubID} is part of the ${entity.info.gitHubOrganization} ` +
                     `GitHub organization, associated with ${entity.info.name}, which has signed ` +
                     `the agreement and participates in the ${workstreamName} workstream. All is ` +
                     `well; contribute at will!`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusEntitiesUnverified(submitterGitHubID, repoName, entities) {
  const { orgs, word, pronoun, haveVerb } = entityVerbiage(entities);

  return {
    state: "pending",
    isNothing: false,
    description: `@${submitterGitHubID} participates on behalf of an unverified entity`,
    longDescription: `@${submitterGitHubID} is part of the ${orgs} GitHub ${word}, but ` +
                     `${pronoun} ${haveVerb} not yet been verified. Hold tight while we sort ` +
                     `this out on our end!`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusEntityNoWorkstreams(submitterGitHubID, repoName, entities) {
  const { orgs, word, pronoun, pronoun2, doVerb } = entityVerbiage(entities);
  const workstreamName = getWorkstreamName(repoName);

  return {
    state: "pending",
    isNothing: false,
    description: `@${submitterGitHubID} participates on behalf of a non-workstream entity`,
    longDescription: `@${submitterGitHubID} is part of the ${orgs} GitHub ${word}, but ` +
                     `${pronoun} ${doVerb} not participate in the ${workstreamName} workstream. ` +
                     `Please have the contact for ${pronoun2} ${word} update their participation ` +
                     `agreement.`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function statusNothing(submitterGitHubID, repoName) {
  return {
    state: "pending",
    isNothing: true,
    description: `@${submitterGitHubID} has not signed up to participate`,
    longDescription: `@${submitterGitHubID} does not appear to have signed the agreement, or be ` +
                     `associated with an entity that has done so. Please sign it, or forward it ` +
                     `to an authorized representative!`,
    target_url: `${statusURLBase}?user=${submitterGitHubID}&repo=${repoName}`,
    context: "Participation"
  };
}

function entityVerbiage(entities) {
  return {
    orgs: listify(entities.map(entity => entity.info.gitHubOrganization)),
    word: entities.length === 1 ? "organization" : "organizations",
    pronoun: entities.length === 1 ? "it" : "they all",
    pronoun2: entities.length === 1 ? "this" : "those",
    haveVerb: entities.length === 1 ? "has" : "have",
    doVerb: entities.length === 1 ? "does" : "do"
  };
}

async function isOrgMember(org, username) {
  try {
    await gitHubAPI.orgs.checkPublicMembership({ org, username });
    return true;
  } catch (e) {
    return false;
  }
}

function getWorkstreamName(repoName) {
  return config.workstreams.find(workstream => workstream.id === repoName).name;
}
