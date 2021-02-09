"use strict";
const privateConfig = require("./helpers/private-config.js");
const { standardFromRepo } = require("./helpers/workstreams.js");
const composeTweet = require("./compose-tweet.js");
const Twitter = require("twitter-lite");

module.exports = async body => {
  if (body.ref !== "refs/heads/main") {
    return;
  }

  const standard = standardFromRepo(body.repository.name);
  if (!standard) {
    return;
  }

  const { twitter } = standard;
  const keys = privateConfig.twitterAccounts[twitter];
  if (!keys) {
    throw new Error(`Keys are not configured for the ${twitter} account.`);
  }

  for (const commit of body.commits) {
    // The composeTweet function either returns the tweet status or null if the commit does not
    // need a tweet. Given that the tweet status is composed of maximum 70 characters, plus a thank
    // you of around 30 characters, depending on the name of the author, and the commit URL which
    // will be shortened, it should not exceed 280 characters.
    const tweetStatus = composeTweet(commit, standard);
    if (!tweetStatus) {
      continue;
    }

    // Keeping this inside the loop (and after the above `if`) makes testing easier since we can
    // just assert whether or not the `Twitter` constructor was called.
    const client = new Twitter({
      consumer_key: privateConfig.twitterApp.key,
      consumer_secret: privateConfig.twitterApp.secret,
      access_token_key: keys.key,
      access_token_secret: keys.secret
    });

    await client.post("statuses/update", { status: tweetStatus });
  }
};
