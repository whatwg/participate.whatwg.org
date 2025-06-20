import privateConfig from "./private-config.mjs";
import { api, locationFromType } from "./github.mjs";

export async function update(type, commitMessage, previousSHA, contents) {
  const location = locationFromType(type);

  const options = {
    message: commitMessage,
    content: serializeForAPI(contents),
    committer: privateConfig.gitHub.committer,
    ...location
  };
  if (previousSHA) {
    options.sha = previousSHA;
  }

  await api.repos.createOrUpdateFileContents(options);
}

export async function get(type) {
  const location = locationFromType(type);

  let result;
  try {
    result = await api.repos.getContent(location);
  } catch (e) {
    if (e.status === 404) {
      return {
        sha: null,
        content: []
      };
    }
    throw e;
  }

  return {
    sha: result.data.sha,
    content: deserializeFromAPI(result.data.content)
  };
}

function serializeForAPI(object) {
  const asString = `${JSON.stringify(object, 0, 4)}\n`;
  const asBuffer = Buffer.from(asString);

  return asBuffer.toString("base64");
}

function deserializeFromAPI(base64String) {
  const asBuffer = Buffer.from(base64String, "base64");
  const asString = asBuffer.toString("utf-8");

  return JSON.parse(asString);
}
