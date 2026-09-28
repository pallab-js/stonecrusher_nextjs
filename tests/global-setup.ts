import fs from "node:fs";
import path from "node:path";

/** Wipe the e2e SQLite database so every run starts from a clean, bootstrapped state. */
export default async function globalSetup() {
  const dir = path.join(process.cwd(), "data", "e2e");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
