// Creates .env.local from .env.example and fills empty secrets with random values.
// Usage: npm run dev:env            (new file, or adds variables that .env.local is missing)
//        npm run dev:env -- --force (regenerates everything; recreate the dev containers after:
//                                    npm run dev:services:reset)
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SECRETS = [
  "POSTGRES_PASSWORD",
  "N8N_DB_PASSWORD",
  "N8N_APP_DB_PASSWORD",
  "N8N_READONLY_DB_PASSWORD",
  "N8N_ENCRYPTION_KEY",
  "BOT_SECRET",
  "BETTER_AUTH_SECRET",
  "STAFF_MANAGER_PASSWORD",
  "STAFF_AGENT_PASSWORD",
];
const target = ".env.local";
const force = process.argv.includes("--force");

// Hex only: the database password goes into DATABASE_URL.
const fill = (line) => {
  const match = /^([A-Z0-9_]+)=$/.exec(line);
  return match && SECRETS.includes(match[1]) ? `${match[1]}=${randomBytes(24).toString("hex")}` : line;
};
const keyOf = (line) => /^([A-Z0-9_]+)=/.exec(line)?.[1];

const example = readFileSync(".env.example", "utf8").split(/\r?\n/);

if (!existsSync(target) || force) {
  writeFileSync(target, example.map(fill).join("\n"));
  console.log(`Created ${target} with new random secrets (git-ignored, never commit it).`);
  process.exit(0);
}

const current = readFileSync(target, "utf8");
const have = new Set(current.split(/\r?\n/).map(keyOf).filter(Boolean));
const missing = example.filter((line) => keyOf(line) && !have.has(keyOf(line))).map(fill);

if (!missing.length) {
  console.log(`${target} already has every variable from .env.example, nothing changed.`);
} else {
  writeFileSync(target, current.replace(/\s*$/, "\n") + missing.join("\n") + "\n");
  console.log(`Added to ${target}: ${missing.map(keyOf).join(", ")}`);
}
