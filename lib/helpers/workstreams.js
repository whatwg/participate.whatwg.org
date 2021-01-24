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

  throw new Error(`${repoName} not associated with a Workstream.`);
};

function getShortname(standardHref) {
  return standardHref.slice("https://".length, standardHref.indexOf("."));
}
