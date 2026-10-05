import { editContent, publishContent } from "./book.ts";
import { emptySlot } from "./slots.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const help = editContent(emptySlot("help"), "Airport pickup is level 3.", "nora");
const legal = emptySlot("legal");
const published = publishContent(help, "lena").book;
assert(published.published.body.includes("level 3"), "help publishes on its own");
assert(legal.published.body.includes("published terms"), "legal text is unchanged");

console.log("slots ok");
