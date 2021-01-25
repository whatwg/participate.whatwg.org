"use strict";
const workstreamsData = require("../../sg/db.json").workstreams;

exports.workstreams = workstreamsData;

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
};

exports.standardFromRepo = repoName => {
  for (const workstream of workstreamsData) {
    for (const standard of workstream.standards) {
      if (getShortname(standard.href) === repoName) {
        return standard;
      }
    }
  }
}

function getShortname(standardHref) {
  return standardHref.slice("https://".length, standardHref.indexOf("."));
}
