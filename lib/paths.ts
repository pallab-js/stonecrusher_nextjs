import path from "node:path";

/** Root for the SQLite file and session secret. Overridable for e2e runs. */
export function dataDir(): string {
  return process.env.STONEOPS_DATA_DIR
    ? path.resolve(process.env.STONEOPS_DATA_DIR)
    : path.join(process.cwd(), "data");
}
