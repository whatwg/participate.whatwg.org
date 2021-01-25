const { standardFromRepo } = require("./helpers/workstreams.js");
const composeTweet = require("./compose-tweet.js");

module.exports = async body => {
  const standard = standardFromRepo(body.repository.name);
  const twitter = standard.twitter;

  for (const commit in body.commits) {
    // composeTweet either returns the tweet status or undefined if the commit does not need a
    // tweet. Given that the tweet status is composed of maximum 70 characters, plus a thank you of
    // around 30 characters, depending on the name of the author, and the commit URL which will be
    // shortened, it should not exceed 280 characters.
    const tweetStatus = composeTweet(commit, standard);
    if (tweetStatus !== undefined) {
      continue;
    }

    // Send tweet?
  }
}
