export type ContentBlock = { id: string; title: string; body: string };

export type ContentBook = { authorId: string; draft: ContentBlock; published: ContentBlock; history: ContentBlock[] };

export function emptyContent(authorId = "nora"): ContentBook {
  const block = { id: "home", title: "Movera", body: "Book a ride in Stockholm." };
  return { authorId, draft: block, published: block, history: [block] };
}

export function editContent(book: ContentBook, body: string, authorId: string): ContentBook {
  return { ...book, authorId, draft: { ...book.draft, body } };
}

export function publishContent(book: ContentBook, actorId: string): { book: ContentBook; error?: string } {
  if (actorId === book.authorId) return { book, error: "A second agent must publish." };
  const snapshot = { ...book.draft };
  return { book: { ...book, published: snapshot, history: [...book.history, snapshot] } };
}

export function rollbackContent(book: ContentBook): ContentBook {
  if (book.history.length < 2) return book;
  const history = book.history.slice(0, -1);
  const published = history[history.length - 1]!;
  return { ...book, history, published, draft: published };
}

export function phonePreview(block: ContentBlock): string {
  return `${block.title}\n${block.body}`;
}
