"use strict";
const { URL } = require("url");
const uuidv4 = require("uuid").v4;
const { BadRequest } = require("http-errors");
const workstreamsData = require("../sg/db.json").workstreams;
const gitHubIDRegExp = require("github-username-regex");

const allWorkstreamIDs = new Set(workstreamsData.map(workstream => workstream.id));

module.exports = body => {
  const id = uuidv4();
  const type = getType(body);

  const publicData = {
    id,
    verified: false,
    workstreams: getWorkstreams(body)
  };
  let privateData = null;

  switch (type) {
    case "individual": {
      const info = getIndividualInfo(body);

      publicData.info = info.public;
      publicData.signature = getIndividualSignature(body, info.public);
      if (body["individual-type"] === "invited") {
        publicData.invited = true;
      }

      privateData = { id, info: info.private };
      break;
    }
    case "entity": {
      publicData.info = getEntityInfo(body);
      publicData.signature = getEntitySignature(body);
      break;
    }

    /* istanbul ignore next */
    default: {
      // This should be impossible (I can't write a test that exercises it).
      throw new Error(`An invalid form type was encountered: ${type}`);
    }
  }

  return { type, publicData, privateData };
};

function getType(body) {
  const individualName = getStringField(body, "individual-name", { allowEmpty: true });
  const entityName = getStringField(body, "entity-name", { allowEmpty: true });

  if (individualName.length > 0 && entityName.length > 0) {
    throw new BadRequest("Both 'individual-name' and 'entity-name' were provided.");
  }

  return individualName.length > 0 ? "individual" : "entity";
}

function getIndividualInfo(body) {
  const info = {
    public: {
      name: getStringField(body, "individual-name"),
      gitHubID: normalizeGitHubID(getStringField(body, "individual-github"), "GitHub ID")
    },
    private: {
      address: getStringField(body, "individual-address"),
      email: getStringField(body, "individual-email")
    }
  };

  const type = getStringField(body, "individual-type");
  if (type !== "self" && type !== "invited") {
    throw new BadRequest("'individual-type' must be either 'self' or 'invited'");
  }
  if (type === "invited") {
    if (body.scope !== "invited") {
      throw new BadRequest("'individual-type' was set to 'invited' but 'scope' was not set " +
                           "to 'invited'");
    }
  }

  // We don't actually use this value, but you shouldn't be able to submit the form without it, so
  // better safe than sorry.
  getStringField(body, "individual-date");

  return info;
}

function getEntityInfo(body) {
  const info = {
    name: getStringField(body, "entity-name"),
    address: getStringField(body, "entity-address"),
    url: getStringField(body, "entity-url"),
    gitHubOrganization: normalizeGitHubID(
      getStringField(body, "entity-github-organization"),
      "GitHub organization"
    ),
    contact1: {
      name: getStringField(body, "contact-1-name"),
      email: getStringField(body, "contact-1-email"),
      gitHubID: normalizeGitHubID(
        getStringField(body, "contact-1-github"),
        "Primary Contact GitHub ID"
      )
    }
  };

  const contact2Name = getStringField(body, "contact-2-name", { allowEmpty: true });
  const contact2Email = getStringField(body, "contact-2-email", { allowEmpty: true });
  const contact2GitHubID = getStringField(body, "contact-2-github", { allowEmpty: true });
  if (contact2Name || contact2Email || contact2GitHubID) {
    if (!contact2Name || !contact2Email || !contact2GitHubID) {
      throw new BadRequest("Only some information was provided for the backup contact.");
    }

    info.contact2 = {
      name: contact2Name,
      email: contact2Email,
      gitHubID: normalizeGitHubID(contact2GitHubID, "Primary Contact GitHub ID")
    };
  }

  try {
    info.url = (new URL(info.url)).href;
  } catch (e) {
    throw new BadRequest("The given 'url' could not be parsed as a URL");
  }

  return info;
}

function getIndividualSignature(body, publicInfo) {
  const signature = getStringField(body, "individual-signature");
  if (signature !== publicInfo.name) {
    throw new BadRequest("The signature provided did not match the name supplied.");
  }

  // We don't actually use this value, but you shouldn't be able to submit the form without it, so
  // better safe than sorry.
  getStringField(body, "individual-date");

  return {
    signedAt: (new Date()).toISOString()
  };
}

function getEntitySignature(body) {
  const signedBy = getStringField(body, "entity-signed-by");
  const signature = getStringField(body, "entity-signature");
  if (signedBy !== signature) {
    throw new BadRequest("The signature provided did not match the signed-by name supplied.");
  }

  const title = getStringField(body, "entity-title");

  // We don't actually use this value, but you shouldn't be able to submit the form without it, so
  // better safe than sorry.
  getStringField(body, "entity-date");

  return {
    signedBy,
    signedByTitle: title,
    signedAt: (new Date()).toISOString()
  };
}

function getWorkstreams(body) {
  if (body.scope !== "all" && body.scope !== "some" && body.scope !== "invited") {
    throw new BadRequest("Invalid 'scope' field");
  }

  if (body.scope === "all") {
    if ("scope-workstreams" in body) {
      throw new BadRequest("Extra 'scope-workstreams' field");
    }

    return "all";
  }
  if (body.scope === "invited") {
    if ("scope-workstreams" in body) {
      throw new BadRequest("Extra 'scope-workstreams' field");
    }
    if (body["individual-type"] !== "invited") {
      throw new BadRequest("'scope' was set to 'invited' but 'individual-type' was not set " +
                           "to 'invited'");
    }

    return "Verifier: replace this with the array of workstreams the SG has invited this " +
           "individual to, or replace it with \"all\" if they're invited to all workstreams.";
  }

  // OK, so they must have selected "some"
  // If multiple workstreams are checked, it's an array. Otherwise, it's a string.
  // (See https://github.com/whatwg/html/pull/3606#issuecomment-378049017 for some history.)
  let scopeWorkstreamIDs = body["scope-workstreams"] || [];
  if (typeof scopeWorkstreamIDs === "string") {
    scopeWorkstreamIDs = [scopeWorkstreamIDs];
  }

  if (!Array.isArray(scopeWorkstreamIDs)) {
    throw new BadRequest("Invalid 'scope-workstreams' field");
  }

  if (scopeWorkstreamIDs.length === 0) {
    throw new BadRequest("No Workstreams were selected for the Agreement to apply to.");
  }

  for (const workstreamID of scopeWorkstreamIDs) {
    if (!allWorkstreamIDs.has(workstreamID)) {
      throw new BadRequest(`Invalid workstream specified: ${workstreamID}`);
    }
  }

  return scopeWorkstreamIDs;
}

function getStringField(body, field, { allowEmpty = false } = {}) {
  if (typeof body[field] !== "string") {
    if (!allowEmpty || body[field] !== undefined) {
      throw new BadRequest(`Invalid '${field}' field`);
    }
  }

  if (!allowEmpty && body[field].length === 0) {
    throw new BadRequest(`Empty '${field}' field`);
  }

  return body[field] || "";
}

function normalizeGitHubID(putativeID, field) {
  if (putativeID.startsWith("@")) {
    putativeID = putativeID.substring(1);
  }

  const match = /^(?:https:\/\/)?github\.com\/([^/]+)\/?/u.exec(putativeID);
  if (match) {
    putativeID = match[1];
  }

  if (!gitHubIDRegExp.test(putativeID)) {
    throw new BadRequest(`Invalid ${field} value: ${putativeID} is not a valid GitHub ID`);
  }

  return putativeID;
}
