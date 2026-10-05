import { emptyContent, type ContentBook } from "./book.ts";

export const CONTENT_SLOTS = ["home", "help", "legal"] as const;
export type SlotId = (typeof CONTENT_SLOTS)[number];

const COPY: Record<SlotId, [string, string]> = {
  home: ["Movera", "Book a ride in Stockholm."],
  help: ["Help", "Call support from the trip screen."],
  legal: ["Legal", "Trips follow the published terms."],
};

export function emptySlot(id: SlotId): ContentBook {
  if (id === "home") return emptyContent();
  const [title, body] = COPY[id];
  const block = { id, title, body };
  return { authorId: "nora", draft: block, published: block, history: [block] };
}
