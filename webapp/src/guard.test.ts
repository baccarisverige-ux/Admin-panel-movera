import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

function files(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "guard.test.ts") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...files(path));
    else if (!name.endsWith(".test.ts") && (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".css"))) found.push(path);
  }
  return found;
}

const root = new URL(".", import.meta.url).pathname;
const banned = /NYC|New York|Chicago|LA Metro|USD|\$\d|RideShare|John Smith|2023-/;
const emoji = /\p{Extended_Pictographic}/u;
for (const path of files(root)) {
  const text = readFileSync(path, "utf8");
  assert(!banned.test(text), `${path} has old demo copy`);
  assert(!text.includes("GenericPage"), `${path} still names the old page`);
  assert(!emoji.test(text), `${path} has an emoji`);
  if (path.includes("/pages/") && path.endsWith(".tsx")) {
    assert(!text.includes("<table"), `${path} has its own table`);
    assert(!/from ["'][^"']*\/(book|seed)["']/.test(text) && !text.includes("/data/"), `${path} imports data outside the API`);
  }
}

console.log("guard ok");
