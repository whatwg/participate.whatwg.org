"use strict";

const privateConfig = require("../private-config.json");
const { standardFromRepo } = require("./helpers/workstreams.js");
const composeTweet = require("./compose-tweet.js");
const Twitter = require("twitter-lite");

module.exports = async body => {
  const standard = standardFromRepo(body.repository.name);
  const { twitter } = standard;
  const keys = privateConfig.twitterAccounts[twitter];
  if (keys === undefined) {
    return;
  }

  for (const commit in body.commits) {
    // The composeTweet function either returns the tweet status or undefined if the commit does not
    // need a tweet. Given that the tweet status is composed of maximum 70 characters, plus a thank
    // you of around 30 characters, depending on the name of the author, and the commit URL which
    // will be shortened, it should not exceed 280 characters.
    const tweetStatus = composeTweet(commit, standard);
    if (tweetStatus !== undefined) {
      continue;
    }

    const client = new Twitter({
      consumer_key: privateConfig.twitterBot.key,
      consumer_secret: privateConfig.twitterBot.secret,
      access_token_key: keys.key,
      access_token_secret: keys.secret
    });
    // Can you await inside a for loop?
    await client.post("statuses/update", { status: tweetStatus });
  }
}
