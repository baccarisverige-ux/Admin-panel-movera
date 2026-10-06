import {
  approveRequiredDocuments,
  driverActivationIssue,
  driverOps,
  emptyDriverOpsBook,
  requestDriverInfo,
  reviewDriverDocument,
  setBankReview,
  setDriverCategory,
  setDriverNote,
  updateVehicleOps,
  vehicleOps,
} from "./ops.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const independent = { id: "D0005", name: "Maja Holm", fleetId: null };
const fleet = { id: "D0001", name: "Erik Lind", fleetId: "F1" };
const vehicleSeed = {
  id: "V0005",
  status: "eligible",
  year: 2022,
  seats: 4,
  fuel: "electric",
  category: "electric",
  fleetId: null,
};

let book = emptyDriverOpsBook();
assert(book.draftRev === 1, "driver operations starts at revision one");

book = reviewDriverDocument(book, independent, "driver_license", "rejected", "ida", "Unreadable image");
assert(driverOps(book, independent).documents.driver_license.status === "rejected", "document rejection persists");
assert(driverOps(book, independent).documents.driver_license.note === "Unreadable image", "review note persists");

book = requestDriverInfo(book, independent, "driver_license", "ida", "Upload both sides");
assert(driverOps(book, independent).documents.driver_license.status === "needed", "request info returns document to needed");
assert(driverOps(book, independent).documents.driver_license.note === "Upload both sides", "request info stores the requested detail");

book = approveRequiredDocuments(book, independent, "ida");
assert(
  Object.values(driverOps(book, independent).documents).every((item) => item.status === "approved" || item.status === "expiring"),
  "independent driver requires all documents",
);

let fleetBook = approveRequiredDocuments(emptyDriverOpsBook(), fleet, "ida");
assert(driverOps(fleetBook, fleet).documents.company_registration.status === "needed", "fleet driver keeps company registration exempt");

book = setBankReview(book, independent, "approved", "ida", "Matched holder");
assert(driverOps(book, independent).bank.status === "approved", "bank approval persists");

let car = vehicleOps(book, vehicleSeed);
assert(car.category === "electric" && car.fuel === "electric", "vehicle profile uses fixture attributes");
book = updateVehicleOps(book, vehicleSeed, { registrationStatus: "approved" });
car = vehicleOps(book, vehicleSeed);
assert(driverActivationIssue(book, independent, car) === null, "approved documents bank and eligible vehicle can activate");

book = setDriverCategory(book, independent, "premium", true, "lena");
assert(driverOps(book, independent).categories.premium, "category eligibility can be enabled");
book = setDriverNote(book, independent, "Call after 14:00", "lena");
assert(driverOps(book, independent).note === "Call after 14:00", "private note persists");

const badVehicleBook = updateVehicleOps(book, vehicleSeed, { category: "xl", seats: 4 });
assert(driverActivationIssue(badVehicleBook, independent, vehicleOps(badVehicleBook, vehicleSeed))?.includes("6 seats"), "vehicle rule blocks activation");

console.log("driver ops ok");
