import { before, test, mock } from "node:test";

let validateGitHubWebhook;
before(async () => {
  mock.module("../../private-config.json", {
    defaultExport: { webhook: { secret: "hunter2" } }
  });

  validateGitHubWebhook = (await import("../../lib/server-infra/validate-github-webhook.js")).default;
});

[
  {
    name: "All good",
    ctxInput: {
      request: {
        rawBody: "test",
        headers: {
          "x-hub-signature": "sha1=acb939cbeb9654742b5157ab6d202ac3a7c5938c",
          "x-github-event": "push",
          "x-github-delivery": "..."
        }
      }
    },
    expected: true
  },
  {
    name: "No X-GitHub-Delivery header",
    ctxInput: {
      request: {
        rawBody: "test",
        headers: {
          "x-hub-signature": "sha1=acb939cbeb9654742b5157ab6d202ac3a7c5938c",
          "x-github-event": "push"
        }
      }
    },
    expected: new Error("No X-GitHub-Delivery header provided")
  },
  {
    name: "Expected incorrect event",
    ctxInput: {
      request: {
        rawBody: "test",
        headers: {
          "x-hub-signature": "sha1=acb939cbeb9654742b5157ab6d202ac3a7c5938c",
          "x-github-event": "push",
          "x-github-delivery": "..."
        }
      }
    },
    eventInput: "meh",
    expected: new Error("Only meh events are accepted by this endpoint")
  },
  {
    name: "Signature mismatch",
    ctxInput: {
      request: {
        rawBody: "signature mismatch",
        headers: {
          "x-hub-signature": "sha1=acb939cbeb9654742b5157ab6d202ac3a7c5938c",
          "x-github-event": "push",
          "x-github-delivery": "..."
        }
      }
    },
    expected: new Error("X-Hub-Signature does not match the body signature")
  }
].forEach(({ name, ctxInput: mockCtx, eventInput = "push", expected }) => {
  mockCtx.get = header => mockCtx.request.headers[header];
  mockCtx.assert = (condition, status, message) => {
    if (!condition || status !== 400) {
      throw new Error(message);
    }
  };

  test(name, t => {
    if (expected === true) {
      t.assert.strictEqual(validateGitHubWebhook(mockCtx, eventInput), expected);
    } else {
      t.assert.throws(() => validateGitHubWebhook(mockCtx, eventInput), expected);
    }
  });
});
