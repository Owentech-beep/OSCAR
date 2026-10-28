import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.resolve(
  __dirname,
  "../../public/oscar-brain/.vite/manifest.json",
);

export function getBrainAssets() {
  if (!fs.existsSync(manifestPath)) {
    return {
      script: null,
      stylesheet: null,
    };
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );

  const entry = manifest["index.html"];

  if (!entry) {
    return {
      script: null,
      stylesheet: null,
    };
  }

  return {
    script: `/oscar-brain/${entry.file}`,
    stylesheet: entry.css?.[0]
      ? `/oscar-brain/${entry.css[0]}`
      : null,
  };
}