import { accountOk, bicOk, clearingBank, ibanOk, paymentTimeline, refundRows } from "./ledger.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(clearingBank("5000") === "SEB", "clearing finds the bank");
assert(clearingBank("1111") === null, "unknown clearing");
assert(accountOk("123456") && accountOk("1234567890") && !accountOk("12345"), "account length");
assert(bicOk("ESSESESS") && bicOk("ESSESESSXXX") && !bicOk("ESS"), "bic length");
assert(ibanOk("SE4550000000058398257466"), "iban mod 97");
assert(!ibanOk("SE4550000000058398257467"), "bad iban");
assert(paymentTimeline("refunded").join(",") === "Pending,Authorized,Captured,Refunded", "refund timeline");
const rows = [
  { id: "PAY0002", status: "refunded" },
  { id: "PAY0002", status: "captured" },
  { id: "PAY0003", status: "refunded" },
];
assert(refundRows(rows, "PAY0002").length === 1, "one refund row for the payment");

console.log("ledger ok");
