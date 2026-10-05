import { fillTemplate } from "./template.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const template = { id: "late", name: "Late trip", body: "Hi {{name}}, trip {{trip}} is late." };
assert(fillTemplate(template, { name: "Sara" }).error?.includes("trip"), "missing value is refused");
assert(fillTemplate(template, { name: "Sara", trip: "T1002" }).body === "Hi Sara, trip T1002 is late.", "placeholders filled");

console.log("templates ok");
