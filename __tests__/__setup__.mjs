import * as path from "node:path";
import { snapshot } from "node:test";

snapshot.setResolveSnapshotPath(testFilePath => {
  const base = path.dirname(testFilePath);
  const filename = path.basename(testFilePath);
  return path.resolve(base, "__snapshots__", `${filename}.snap`);
});
