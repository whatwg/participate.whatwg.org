"use strict";

const mockStandard = { authors: [{ email: "a@example.com" }, { email: "b@example.com" }] };

const mockCommits = [
  {
    name: "Commit message starts with Editorial:",
    input: {
      message: "Editorial: typo",
      url: "https://example.com/1",
      author: { email: "a@example.com", username: "a", name: "name" }
    },
    expected: null
  },
  {
    name: "Commit message starts with Meta:",
    input: {
      message: "Meta: rename branch",
      url: "https://example.com/1",
      author: { email: "a@example.com", username: "a", name: "name" }
    },
    expected: null
  },
  {
    name: "Commit message starts with Review Draft Publication:",
    input: {
      message: "Review Draft Publication: that time of the year",
      url: "https://example.com/1",
      author: { email: "a@example.com", username: "a", name: "name" }
    },
    expected: null
  },
  {
    name: "Commit author is standard author",
    input: {
      message: "Fix example",
      url: "https://example.com/2",
      author: { email: "b@example.com", username: "b", name: "name" }
    },
    expected: "Fix example\nhttps://example.com/2"
  },
  {
    name: "Commit author is not a standard author",
    input: {
      message: "Fix example",
      url: "https://example.com/3",
      author: { email: "c@example.com", username: "c", name: "name" }
    },
    expected: "Fix example (thanks c!)\nhttps://example.com/3"
  },
  {
    name: "Commit author is not a standard author, and has no username but has a name",
    input: {
      message: "Fix example",
      url: "https://example.com/3",
      author: { email: "c@example.com", name: "name" }
    },
    expected: "Fix example (thanks name!)\nhttps://example.com/3"
  },
  {
    name: "Commit author is not a standard author, and has no username or name",
    input: {
      message: "Fix example",
      url: "https://example.com/3",
      author: { email: "c@example.com" }
    },
    expected: "Fix example\nhttps://example.com/3"
  },
  {
    name: "Commit message contains newlines",
    input: {
      message: "Fix example\n\nCloses #342",
      url: "https://example.com/4",
      author: { email: "a@example.com", username: "a" }
    },
    expected: "Fix example\nhttps://example.com/4"
  }
];

const composeTweet = require("../lib/compose-tweet.js");

for (const mockCommit of mockCommits) {
  test(mockCommit.name, () => {
    expect(composeTweet(mockCommit.input, mockStandard)).toEqual(mockCommit.expected);
  });
}
