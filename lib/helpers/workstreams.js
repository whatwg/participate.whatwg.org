"use strict";
const workstreamsData = require("../../sg/db.json").workstreams;

exports.repos = workstreamsData
  .flatMap(workstream => workstream.standards)
  .map(standard => getShortname(standard.href));

exports.workstreamFromRepo = repoName => {
  for (const workstream of workstreamsData) {
    for (const standard of workstream.standards) {
      if (getShortname(standard.href) === repoName) {
        return workstream;
      }
    }
  }

  return null;
};

exports.standardFromRepo = repoName => {
  for (const workstream of workstreamsData) {
    for (const standard of workstream.standards) {
      if (getShortname(standard.href) === repoName) {
        return standard;
      }
    }
  }

  return null;
};

function getShortname(standardHref) {
  return standardHref.slice("https://".length, standardHref.indexOf("."));
}
