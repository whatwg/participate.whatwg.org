import dbData from "../../sg/db.json" with { type: "json" };

const workstreamsData = dbData.workstreams;

export const repos = workstreamsData
  .flatMap(workstream => workstream.standards)
  .map(standard => getShortname(standard.href));

export function workstreamFromRepo(repoName) {
  for (const workstream of workstreamsData) {
    for (const standard of workstream.standards) {
      if (getShortname(standard.href) === repoName) {
        return workstream;
      }
    }
  }

  return null;
}

export function standardFromRepo(repoName) {
  for (const workstream of workstreamsData) {
    for (const standard of workstream.standards) {
      if (getShortname(standard.href) === repoName) {
        return standard;
      }
    }
  }

  return null;
}

function getShortname(standardHref) {
  return standardHref.slice("https://".length, standardHref.indexOf("."));
}
