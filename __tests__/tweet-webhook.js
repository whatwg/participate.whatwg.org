"use strict";
const pushToMain = require("./__fixtures__/push-to-main.json");

jest.mock("twitter-lite");
const Twitter = require("twitter-lite");

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
      }
    }
  };
}, { virtual: true });

const tweetWebhook = require("../lib/tweet-webhook.js");

beforeEach(() => {
  Twitter.mockClear();
});

test("A push to main must trigger a tweet", async () => {
  await tweetWebhook(pushToMain);

  expect(Twitter).toHaveBeenCalledTimes(1);
  expect(Twitter).toHaveBeenCalledWith({
    consumer_key: "appkey",
    consumer_secret: "appsecret",
    access_token_key: "domstandardkey",
    access_token_secret: "domstandardsecret"
  });

  expect(Twitter.mock.instances[0].post).toHaveBeenCalledWith(
    "statuses/update",
    {
      status: "Use a single exception for name validation (follow-up)\nhttps://github.com/whatwg/dom/commit/c80cbf52b351609b3a107bb2d047d6377ffafbf9"
    }
  );
});

// Tests to write (easier once we collect some events to paste into __fixtures__):
// - Pushes to a non-main branch
// - Push to a main branch but in a non-standard repo
// - A standard repo with no keys configured should throw an error
// - Multiple commits in a single event?
// - Cases where composeTweet returns null?
//   Should we do that by mocking composeTweet, or by adding redundant coverage?
