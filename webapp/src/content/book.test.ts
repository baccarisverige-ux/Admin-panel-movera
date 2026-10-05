import { editContent, emptyContent, phonePreview, publishContent, rollbackContent } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

let book = editContent(emptyContent("nora"), "Reserve for the match.", "nora");
assert(publishContent(book, "nora").error, "author cannot publish");
const live = publishContent(book, "lena");
assert(live.book.published.body === "Reserve for the match.", "published");
assert(phonePreview(live.book.published).includes("Reserve for the match."), "phone preview uses the text");
book = rollbackContent(live.book);
assert(book.published.body === "Book a ride in Stockholm.", "rollback restores the previous text");

console.log("content ok");
