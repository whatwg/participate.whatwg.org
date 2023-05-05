"use strict";
const pushToMain = require("./__fixtures__/push-to-main.json");
const pushToMainMeta = require("./__fixtures__/push-to-main-meta.json");
const pushToBranch = require("./__fixtures__/push-to-branch.json");

jest.mock("twitter-api-v2");
const { TwitterApi } = require("twitter-api-v2");

jest.mock("../private-config.json", () => {
  return {
    twitterApp: {
      key: "appkey",
      secret: "appsecret"
    },
    twitterAccounts: {
      thedomstandard: {
        key: "domstandardkey",
        secret: "domstandardsecret"
      },
      htmlstandard: {
        key: "htmlstandardkey",
        secret: "htmlstandardsecret"
      },
      fetchstandard: {
        key: "fetchstandardkey",
        secret: "fetchstandardsecret"
      }
    }
  };
}, { virtual: true });

const tweetWebhook = require("../lib/tweet-webhook.js");

let mockTweet;
beforeEach(() => {
  mockTweet = jest.fn();
  TwitterApi.mockClear().mockReturnValueOnce({ readWrite: { v2: { tweet: mockTweet } } });
});

test("A push to main with a substantive commit must trigger a tweet", async () => {
  await tweetWebhook(pushToMain);

  expect(TwitterApi).toHaveBeenCalledTimes(1);
  expect(TwitterApi).toHaveBeenCalledWith({
    appKey: "appkey",
    appSecret: "appsecret",
    accessToken: "domstandardkey",
    accessSecret: "domstandardsecret"
  });

  expect(mockTweet).toHaveBeenCalledWith(
    "Use a single exception for name validation (follow-up)\nhttps://github.com/whatwg/dom/commit/c80cbf52b351609b3a107bb2d047d6377ffafbf9"
  );
});

test("A push to main with a Meta: commit must not trigger a tweet", async () => {
  await tweetWebhook(pushToMainMeta);

  expect(TwitterApi).not.toHaveBeenCalled();
});

test("A push to a non-main branch must not trigger a tweet", async () => {
  await tweetWebhook(pushToBranch);

  expect(TwitterApi).not.toHaveBeenCalled();
});

// Tests to write (easier once we collect some events to paste into __fixtures__):
// - Push to a main branch but in a non-standard repo
// - A standard repo with no keys configured should throw an error
// - Multiple commits in a single event?
