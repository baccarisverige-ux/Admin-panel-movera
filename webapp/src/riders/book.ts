export type PrivacyState = "none" | "new" | "processing" | "done";

export type Rider = {
  id: string;
  name: string;
  phone: string;
  tripIds: string[];
  blocked: boolean;
  privacy: PrivacyState;
  sessions: number;
  walletOre: number;
};

export const RIDERS: Rider[] = [
  { id: "R4821", name: "Emma Rider", phone: "+46 70 111 22 33", tripIds: ["T1001"], blocked: false, privacy: "none", sessions: 2, walletOre: 10000 },
  { id: "R4822", name: "Omar Haddad", phone: "+46 73 222 33 44", tripIds: ["T1002"], blocked: false, privacy: "new", sessions: 1, walletOre: 0 },
];

export const WALLET_CREDIT_LIMIT_ORE = 50_000;

export function findRiders(riders: readonly Rider[], query: string): Rider[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...riders];
  return riders.filter((rider) =>
    [rider.id, rider.name, rider.phone, ...rider.tripIds].some((value) => value.toLowerCase().includes(needle)),
  );
}

export function blockRider(rider: Rider, blocked: boolean, reason: string): { rider: Rider; error?: string } {
  if (!reason.trim()) return { rider, error: "A reason is required." };
  return { rider: { ...rider, blocked } };
}

export function advancePrivacy(rider: Rider): Rider {
  const next: PrivacyState = rider.privacy === "none" || rider.privacy === "new" ? "processing" : rider.privacy === "processing" ? "done" : "done";
  return { ...rider, privacy: next };
}

export function creditWallet(rider: Rider, ore: number): { rider: Rider; error?: string } {
  if (ore <= 0 || ore > WALLET_CREDIT_LIMIT_ORE) return { rider, error: "Credit must be between 1 öre and 500 kr." };
  return { rider: { ...rider, walletOre: rider.walletOre + ore } };
}

export function signOutRider(rider: Rider): Rider {
  return { ...rider, sessions: 0 };
}
