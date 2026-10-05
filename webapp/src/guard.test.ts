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
for (const path of files(root)) {
  const text = readFileSync(path, "utf8");
  assert(!banned.test(text), `${path} has old demo copy`);
  assert(!text.includes("GenericPage"), `${path} still names the old page`);
}

const nav = readFileSync(new URL("./nav.ts", import.meta.url), "utf8");
assert(!/\p{Extended_Pictographic}/u.test(nav), "no emoji in the menu");

console.log("guard ok");
