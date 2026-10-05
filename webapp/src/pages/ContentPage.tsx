import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { editContent, emptyContent, phonePreview, publishContent, rollbackContent, type ContentBook } from "../content/book";

export function ContentPage() {
  const { agent } = useSession();
  const [book, setBook] = useState<ContentBook>(() => emptyContent());
  const [notice, setNotice] = useState("Draft is not on the phone until a second agent publishes.");

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Content</h2>
          <p>Driver home, rider banners and legal text share this publish path.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <label>
          Text
          <textarea value={book.draft.body} onChange={(event) => agent && setBook(editContent(book, event.target.value, agent.id))} />
        </label>
        <pre>{phonePreview(book.published)}</pre>
        <div className="actions">
          <button className="primary-btn" type="button" onClick={() => { if (!agent) return; const result = publishContent(book, agent.id); if (result.error) setNotice(result.error); else { setBook(result.book); setNotice("Published."); } }}>
            Publish
          </button>
          <button className="secondary-btn" type="button" onClick={() => { setBook(rollbackContent(book)); setNotice("Rolled back."); }}>
            Roll back
          </button>
        </div>
      </article>
    </>
  );
}
