export type Delivery = "accepted" | "sent" | "delivered" | "failed";

export type Audience = { app: "rider" | "driver"; zone: string };

export type Outbound = { id: string; audience: Audience; body: string; status: Delivery };

export function testSend(audience: Audience, people: { id: string; app: "rider" | "driver"; zone: string }[]): string[] {
  return people.filter((person) => person.app === audience.app && person.zone === audience.zone).map((person) => person.id);
}

export function advance(message: Outbound, next: Delivery): Outbound {
  return { ...message, status: next };
}
