import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "../dist");
mkdirSync(dist, { recursive: true });
copyFileSync(resolve(root, "page.html"), resolve(dist, "index.html"));
copyFileSync(resolve(root, "miner.css"), resolve(dist, "miner.css"));
