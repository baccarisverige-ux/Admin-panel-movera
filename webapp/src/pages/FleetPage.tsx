import { fleetStatus, type FleetCar } from "../vehicles/fleet";

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
      <table>
        <thead>
          <tr>
            <th>Plate</th>
            <th>Driver</th>
            <th>Category</th>
            <th>Eligible</th>
          </tr>
        </thead>
        <tbody>
          {CARS.map((car) => {
            const status = fleetStatus(car);
            return (
              <tr key={car.id}>
                <td>{car.plate}</td>
                <td>{car.driverName}</td>
                <td>{car.category}</td>
                <td>{status.eligible ? "yes" : status.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
