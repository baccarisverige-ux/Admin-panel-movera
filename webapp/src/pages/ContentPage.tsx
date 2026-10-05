import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { editContent, phonePreview, publishContent, rollbackContent, useRecords, type ContentBook } from "../api/hooks";
import { CONTENT_SLOTS, emptySlot, type SlotId } from "../content/slots";

export function ContentPage() {
  const { agent } = useSession();
  const [slot, setSlot] = useState<SlotId>("home");
  const [books, setBooks] = useState<Record<SlotId, ContentBook>>(() => ({
    home: emptySlot("home"),
    help: emptySlot("help"),
    legal: emptySlot("legal"),
  }));
  const [notice, setNotice] = useState("Each text publishes on its own. A second agent is required.");
  const book = books[slot];
  const banners = useRecords("banners", null);

  function save(next: ContentBook) {
    setBooks({ ...books, [slot]: next });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Content</h2>
          <p>Home, help and legal are separate. {banners.data?.length ?? "…"} rider-home banners. Publishing one does not change the others.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <div className="actions">
        {CONTENT_SLOTS.map((id) => (
          <button key={id} className="secondary-btn" type="button" onClick={() => setSlot(id)}>
            {id}
          </button>
        ))}
      </div>
      <article className="panel">
        <h3>{book.draft.title}</h3>
        <label>
          Text
          <textarea value={book.draft.body} onChange={(event) => agent && save(editContent(book, event.target.value, agent.id))} />
        </label>
        <pre>{phonePreview(book.published)}</pre>
        <div className="actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              if (!agent) return;
              const result = publishContent(book, agent.id);
              if (result.error) setNotice(result.error);
              else {
                save(result.book);
                setNotice(`${slot} published. The other texts are unchanged.`);
              }
            }}
          >
            Publish
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              save(rollbackContent(book));
              setNotice(`${slot} rolled back.`);
            }}
          >
            Roll back
          </button>
        </div>
      </article>
    </>
  );
}
