"use strict";
const { Conflict } = require("http-errors");
const jsonGitHubDatabase = require("./helpers/json-github-database.js");

exports.addIndividualData = async (privateData, publicData) => {
  const [privateFile, publicFile] = await Promise.all([
    jsonGitHubDatabase.get("individual-private"),
    jsonGitHubDatabase.get("individual-public")
  ]);

  const { gitHubID } = publicData.info;
  const { email } = privateData.info;

  for (const existingPrivateEntry of privateFile.content) {
    if (existingPrivateEntry.info.email === email) {
      throw new Conflict(`Email ${email} is already present in the system.`);
    }
  }
  for (const existingPublicEntry of publicFile.content) {
    if (existingPublicEntry.info.gitHubID === gitHubID) {
      throw new Conflict(`GitHub ID ${gitHubID} is already present in the system.`);
    }
  }

  privateFile.content.push(privateData);
  publicFile.content.push(publicData);

  const commitMessage = `Add data for ${publicData.info.name}`;

  // Use sequential await, and not Promise.all, as it's important that we don't commit the public
  // data unless we have the corresponding private data.
  await jsonGitHubDatabase.update("individual-private", commitMessage, privateFile.sha, privateFile.content);

  await jsonGitHubDatabase.update("individual-public", commitMessage, publicFile.sha, publicFile.content);
};

exports.addEntityData = async data => {
  const file = await jsonGitHubDatabase.get("entity", { defaultContent: [] });

  // Checking these for duplicates isn't foolproof; there are many non-canonical forms of each
  // (e.g. "Contoso" vs. "Contoso Ltd."; "https://contoso.com/" vs. "https://www.contoso.com/";
  // addresses with our without the country name). But, it provides a first line check; humans will
  // be needed to verify eventually anyway.
  //
  // Note also that the URL is a pretty reasonable key, www/no-www aside, since we parse and
  // re-serialize it. Thus things like trailing slashes will not impact the check.
  const { name, url, address } = data.info;
  for (const existingEntry of file.content) {
    if (existingEntry.info.name === name) {
      throw new Conflict(`Entity name ${name} is already present in the system.`);
    }
    if (existingEntry.info.url === url) {
      throw new Conflict(`Entity URL ${url} is already present in the system.`);
    }
    if (existingEntry.info.address === address) {
      throw new Conflict(`Entity address ${address} is already present in the system.`);
    }
  }

  file.content.push(data);

  const commitMessage = `Add data for ${name}`;
  await jsonGitHubDatabase.update("entity", commitMessage, file.sha, file.content);
};
