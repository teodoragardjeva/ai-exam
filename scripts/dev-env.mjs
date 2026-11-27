// Creates .env.local from .env.example and fills empty secrets with random values.
// Usage: npm run dev:env            (keeps an existing .env.local)
//        npm run dev:env -- --force (overwrites it; recreate the dev containers after:
//                                    npm run dev:services:reset)
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SECRETS = ["POSTGRES_PASSWORD", "N8N_DB_PASSWORD", "N8N_ENCRYPTION_KEY", "BOT_SECRET"];
const target = ".env.local";

if (existsSync(target) && !process.argv.includes("--force")) {
  console.log(`${target} already exists, nothing changed. Use --force to regenerate it.`);
  process.exit(0);
}

const lines = readFileSync(".env.example", "utf8").split(/\r?\n/).map((line) => {
  const match = /^([A-Z0-9_]+)=$/.exec(line);
  // Hex only: the database password goes into DATABASE_URL.
  return match && SECRETS.includes(match[1]) ? `${match[1]}=${randomBytes(24).toString("hex")}` : line;
});

writeFileSync(target, lines.join("\n"));
console.log(`Created ${target} with new random secrets (git-ignored, never commit it).`);
