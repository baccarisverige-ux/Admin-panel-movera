import { fleetStatus, type FleetCar } from "../vehicles/fleet";
import { DataTable } from "../ui/DataTable";

const CARS: FleetCar[] = [
  { id: "V1", plate: "ABC 123", driverName: "Erik Lind", year: 2022, seats: 4, fuel: "electric", category: "electric" },
  { id: "V2", plate: "OLD 14", driverName: "Sara Berg", year: 2012, seats: 4, fuel: "petrol", category: "economy" },
  { id: "V3", plate: "XL 001", driverName: "Noah Ek", year: 2021, seats: 4, fuel: "petrol", category: "xl" },
];

export function FleetPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Vehicles</h2>
          <p>The same rules as driver activation. An ineligible car cannot be offered.</p>
        </div>
      </div>
      <DataTable
        head={["Plate", "Driver", "Category", "Eligible"]}
        rows={CARS.map((car) => {
          const status = fleetStatus(car);
          return [car.plate, car.driverName, car.category, status.eligible ? "yes" : status.reason];
        })}
      />
    </>
  );
}
