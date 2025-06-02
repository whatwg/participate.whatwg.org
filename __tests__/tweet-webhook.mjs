import { before, beforeEach, test, mock } from "node:test";

import pushToMain from "./__fixtures__/push-to-main.json" with { type: "json" };
import pushToMainMeta from "./__fixtures__/push-to-main-meta.json" with { type: "json" };
import pushToBranch from "./__fixtures__/push-to-branch.json" with { type: "json" };

let mockTweet, tweetWebhook;
const mockTwitterApi = mock.fn();
before(async () => {
  mock.module("twitter-api-v2", {
    namedExports: {
      TwitterApi: mockTwitterApi
    }
  });

  mock.module("../private-config.json", {
    defaultExport: {
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
    }
  });

  tweetWebhook = (await import("../lib/tweet-webhook.mjs")).default;
});

beforeEach(() => {
  mockTweet = mock.fn();

  mockTwitterApi.mock.resetCalls();
  mockTwitterApi.mock.mockImplementationOnce(class {
    constructor() {
      // eslint-disable-next-line no-constructor-return
      return { readWrite: { v2: { tweet: mockTweet } } };
    }
  });
});

test("A push to main with a substantive commit must trigger a tweet", async t => {
  const { TwitterApi } = await import("twitter-api-v2");

  await tweetWebhook(pushToMain);

  t.assert.strictEqual(TwitterApi.mock.callCount(), 1);
  t.assert.deepStrictEqual(TwitterApi.mock.calls[0].arguments, [
    {
      appKey: "appkey",
      appSecret: "appsecret",
      accessToken: "domstandardkey",
      accessSecret: "domstandardsecret"
    }
  ]);

  t.assert.strictEqual(mockTweet.mock.callCount(), 1);
  t.assert.deepStrictEqual(
    mockTweet.mock.calls[0].arguments,
    ["Use a single exception for name validation (follow-up)\nhttps://github.com/whatwg/dom/commit/c80cbf52b351609b3a107bb2d047d6377ffafbf9"]
  );
});

test("A push to main with a Meta: commit must not trigger a tweet", async t => {
  const { TwitterApi } = await import("twitter-api-v2");

  await tweetWebhook(pushToMainMeta);

  t.assert.strictEqual(TwitterApi.mock.callCount(), 0);
});

test("A push to a non-main branch must not trigger a tweet", async t => {
  const { TwitterApi } = await import("twitter-api-v2");

  await tweetWebhook(pushToBranch);

  t.assert.strictEqual(TwitterApi.mock.callCount(), 0);
});

// Tests to write (easier once we collect some events to paste into __fixtures__):
// - Push to a main branch but in a non-standard repo
// - A standard repo with no keys configured should throw an error
// - Multiple commits in a single event?
