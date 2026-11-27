// Every file in n8n/workflows needs a unique top-level "id" (16 letters/digits).
// n8n's autoload uses it to update the same workflow on each start instead of adding a copy.
// Usage: npm run check:n8n   (also runs in CI)
import { readFileSync, readdirSync } from "node:fs";

const dir = "n8n/workflows";
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const seen = new Map();
let ok = true;

for (const file of files) {
  const path = `${dir}/${file}`;
  let id;
  try {
    id = JSON.parse(readFileSync(path, "utf8")).id;
  } catch (err) {
    console.error(`::error file=${path}::invalid JSON: ${err.message}`);
    ok = false;
    continue;
  }
  if (!/^[A-Za-z0-9]{16}$/.test(id ?? "")) {
    console.error(`::error file=${path}::needs a top-level "id" of 16 letters/digits`);
    ok = false;
  } else if (seen.has(id)) {
    console.error(`::error file=${path}::id ${id} is also used by ${seen.get(id)}`);
    ok = false;
  } else {
    seen.set(id, file);
  }
}

console.log(`${files.length} workflow file(s) checked`);
process.exit(ok ? 0 : 1);
