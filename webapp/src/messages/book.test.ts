import { advance, testSend } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const people = [
  { id: "R1", app: "rider" as const, zone: "Norrmalm" },
  { id: "R2", app: "rider" as const, zone: "Solna" },
  { id: "D1", app: "driver" as const, zone: "Norrmalm" },
];
assert(testSend({ app: "rider", zone: "Norrmalm" }, people).join() === "R1", "only the chosen audience");
const message = advance({ id: "M1", audience: { app: "rider", zone: "Norrmalm" }, body: "Hello", status: "accepted" }, "sent");
assert(message.status === "sent", "sent is separate from accepted");
assert(advance(message, "delivered").status === "delivered", "delivered");
assert(advance(message, "failed").status === "failed", "failed");

console.log("messages ok");
