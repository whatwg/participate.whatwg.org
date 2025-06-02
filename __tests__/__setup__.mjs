import * as path from "node:path";
import * as fs from "node:fs";
import { snapshot } from "node:test";

snapshot.setResolveSnapshotPath(testFilePath => {
  const base = path.dirname(testFilePath);
  const filename = path.basename(testFilePath);
  return path.resolve(base, "__snapshots__", `${filename}.snap`);
});

// If there's no private-config.json (e.g., as there is on CI), copy the private-config.sample.json there.
// This is especially necessary since Node.js's module mocking doesn't work on files that don't exist.
const privateConfigPath = path.resolve(import.meta.dirname, "../private-config.json");
const privateConfigSamplePath = path.resolve(import.meta.dirname, "../private-config.sample.json");
try {
  fs.copyFileSync(privateConfigSamplePath, privateConfigPath, fs.constants.COPYFILE_EXCL);
} catch (e) {
  if (e.code !== "EEXIST") {
    throw e;
  }
}
