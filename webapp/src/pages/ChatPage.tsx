import { useState } from "react";
import { CommandButton } from "../ui/CommandButton";

type Line = { id: string; who: string; text: string; kind: "reply" | "note" };

const START: Record<"rider" | "driver", Line[]> = {
  rider: [{ id: "r1", who: "Emma", text: "The driver has not arrived.", kind: "reply" }],
  driver: [{ id: "d1", who: "Erik", text: "I am at the pickup.", kind: "reply" }],
};

export function ChatPage() {
  const [thread, setThread] = useState<"rider" | "driver">("rider");
  const [threads, setThreads] = useState(START);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("A reply goes to this thread only.");
  const lines = threads[thread];
  const visible = lines.filter((line) => line.kind === "reply");

  function push(kind: "reply" | "note") {
    const text = draft.trim();
    if (!text) {
      setNotice("Write a message first.");
      return;
    }
    const id = `${thread}-${lines.length + 1}`;
    setThreads({ ...threads, [thread]: [...lines, { id, who: "Nora", text, kind }] });
    setDraft("");
    setNotice(kind === "note" ? "Private note saved. It is not sent to the app." : "Reply sent once to this thread.");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Chat</h2>
          <p>Rider and driver threads stay separate. Private notes are never sent.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <div className="actions">
        <CommandButton command="admin.tabs.select" className={thread === "rider" ? "primary-btn" : "secondary-btn"} type="button" onDone={() => setThread("rider")}>Rider thread</CommandButton>
        <CommandButton command="admin.tabs.select" className={thread === "driver" ? "primary-btn" : "secondary-btn"} type="button" onDone={() => setThread("driver")}>Driver thread</CommandButton>
      </div>
      <article className="panel" aria-label={`${thread} thread`}>
        <ul>
          {visible.map((line) => <li key={line.id}>{line.who}: {line.text}</li>)}
        </ul>
        <p className="state-line">Notes on this thread: {lines.filter((line) => line.kind === "note").length}. Hidden from the app.</p>
      </article>
      <label>
        Message
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <div className="actions">
        <CommandButton command="admin.support.reply" className="primary-btn" type="button" onDone={() => push("reply")}>Send reply</CommandButton>
        <CommandButton command="admin.support.note" className="secondary-btn" type="button" onDone={() => push("note")}>Private note</CommandButton>
      </div>
    </>
  );
}
