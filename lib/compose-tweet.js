"use strict";

module.exports = (commit, standard) => {
  let [commitTitle] = commit.message.split("\n");
  for (const exclude of ["Editorial", "Meta", "Review Draft Publication"]) {
    if (commitTitle.startsWith(`${exclude}:`)) {
      return;
    }
  }

  const authorEmails = standard.authors.map(author => author.email);
  if (!authorEmails.includes(commit.author.email)) {
    commitTitle += ` (thanks ${commit.author.name}!)`;
  }

  return `${commitTitle}\n${commit.url}`;
};
