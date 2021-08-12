"use strict";

module.exports = (commit, standard) => {
  let [commitTitle] = commit.message.split("\n");
  for (const exclude of ["Editorial", "Meta", "Review Draft Publication"]) {
    if (commitTitle.startsWith(`${exclude}:`)) {
      return null;
    }
  }

  const authorEmails = standard.authors.map(author => author.email);
  const acknowledgment = commit.author.username || commit.author.name;
  if (!authorEmails.includes(commit.author.email) && acknowledgment) {
    commitTitle += ` (thanks ${acknowledgment}!)`;
  }

  return `${commitTitle}\n${commit.url}`;
};
