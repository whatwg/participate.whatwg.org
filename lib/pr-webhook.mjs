import { api as gitHubAPI } from "./helpers/github.mjs";
import getUserStatus from "./get-user-status.mjs";
import { workstreamFromRepo } from "./helpers/workstreams.mjs";

export default async function prWebhook(body) {
  if (!workstreamFromRepo(body.repository.name)) {
    return;
  }

  if (body.action !== "opened" && body.action !== "synchronize") {
    return;
  }

  // It's possible for random users to create pull requests between any two branches they can see,
  // for some reason. In particular they can create pull requests from main to other branches,
  // which if we proceeded, would cause this hook to override the status on main. If that happens,
  // bail out.
  if (body.pull_request.base.ref !== "main") {
    return;
  }

  // It's possible for a PR to contain no commits, or to just consist of syncing to main. Updating
  // the status of the head commit would then update the status of main, which is incorrect. See
  // https://github.com/whatwg/participate.whatwg.org/issues/478.
  if (body.pull_request.head.sha === body.pull_request.base.sha) {
    return;
  }

  // The PR existence check is necessary because deleted PRs still ping this endpoint, for some
  // reason. See https://github.com/whatwg/html/issues/3582 for what happened previously.
  const [status, exists] = await Promise.all([
    getUserStatus(body.pull_request.user.login, body.repository.name, body.pull_request.number),
    prExists(body.pull_request)
  ]);

  if (!exists) {
    return;
  }

  await gitHubAPI.repos.createCommitStatus({
    owner: body.repository.owner.login,
    repo: body.repository.name,
    sha: body.pull_request.head.sha,
    ...status
  });
}

async function prExists(pr) {
  try {
    await gitHubAPI.pulls.get({
      pull_number: pr.number,
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      method: "HEAD"
    });
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
  return true;
}
