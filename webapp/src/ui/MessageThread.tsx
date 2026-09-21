import { useState } from "react";
import type { ChatThread } from "../data/catalog";

type MessageThreadProps = {
  thread: ChatThread;
};

export function MessageThread({ thread }: MessageThreadProps) {
  const [messages, setMessages] = useState(thread.messages);
  const [draft, setDraft] = useState("");

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "admin", text }]);
    setDraft("");
  }

  return (
    <div className="message-window">
      <div className="message-head">{thread.heading}</div>
      <div className="messages">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
            {message.text}
          </div>
        ))}
      </div>
      <div className="message-compose">
        <input
          placeholder="Write a message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
          }}
        />
        <button className="primary-btn" type="button" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
