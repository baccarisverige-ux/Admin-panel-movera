import type { MarketId } from "../markets/markets.ts";

/**
 * Cities Movera runs in, per country, with a simple outline and districts.
 * Points are [lat, lng]. The outlines are simple demo shapes; real borders
 * come with the map data later.
 */

export type District = { id: string; name: string; code: string; ring: [number, number][] };

export type City = {
  id: string;
  country: MarketId;
  name: string;
  code: string;
  center: [number, number];
  outline: [number, number][];
  districts: District[];
};

export function rect(south: number, west: number, north: number, east: number): [number, number][] {
  return [
    [south, west],
    [south, east],
    [north, east],
    [north, west],
  ];
}

/** An eight-sided outline around a centre, radius in km. */
function octagon(lat: number, lng: number, km: number): [number, number][] {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI / 4) * index + Math.PI / 8;
    return [Number((lat + Math.sin(angle) * dLat).toFixed(6)), Number((lng + Math.cos(angle) * dLng).toFixed(6))] as [number, number];
  });
}

function district(id: string, name: string, code: string, ring: [number, number][]): District {
  return { id, name, code, ring };
}

export const CITIES: readonly City[] = [
  {
    id: "stockholm",
    country: "SE",
    name: "Stockholm",
    code: "STO",
    center: [59.334, 18.06],
    outline: rect(59.21, 17.82, 59.51, 18.26),
    districts: [
      district("d-norrmalm", "Norrmalm", "NRM", rect(59.325, 18.06, 59.35, 18.11)),
      district("d-sodermalm", "Södermalm", "SOD", rect(59.255, 18.008, 59.318, 18.145)),
      district("d-ostermalm", "Östermalm", "OST", rect(59.325, 18.118, 59.39, 18.185)),
      district("d-kungsholmen", "Kungsholmen", "KUN", rect(59.322, 18.008, 59.355, 18.055)),
      district("d-vasastan", "Vasastan", "VAS", rect(59.358, 18.015, 59.395, 18.1)),
      district("d-bromma", "Bromma", "BRO", rect(59.3, 17.9, 59.345, 18)),
      district("d-solna", "Solna", "SOL", rect(59.4, 17.99, 59.445, 18.055)),
      district("d-kista", "Kista", "KIS", rect(59.4, 17.85, 59.455, 17.97)),
      district("d-danderyd", "Danderyd", "DAN", rect(59.395, 18.055, 59.45, 18.13)),
      district("d-lidingo", "Lidingö", "LID", rect(59.34, 18.19, 59.39, 18.25)),
      district("d-hagersten", "Hägersten", "HAG", rect(59.26, 17.93, 59.298, 18.0)),
      district("d-spanga", "Spånga", "SPA", rect(59.35, 17.89, 59.398, 17.985)),
    ],
  },
  {
    id: "sodertalje",
    country: "SE",
    name: "Södertälje",
    code: "SDT",
    center: [59.195, 17.628],
    outline: rect(59.15, 17.48, 59.25, 17.74),
    districts: [
      district("d-sodertalje-c", "Södertälje Centrum", "CEN", rect(59.17, 17.52, 59.23, 17.7)),
    ],
  },
  { id: "goteborg", country: "SE", name: "Göteborg", code: "GOT", center: [57.7089, 11.9746], outline: octagon(57.7089, 11.9746, 9), districts: [
    district("d-got-centrum", "Centrum", "CEN", rect(57.695, 11.95, 57.715, 11.99)),
    district("d-got-hisingen", "Hisingen", "HIS", rect(57.716, 11.9, 57.76, 11.99)),
    district("d-got-majorna", "Majorna", "MAJ", rect(57.68, 11.9, 57.694, 11.95)),
  ] },
  { id: "malmo", country: "SE", name: "Malmö", code: "MMA", center: [55.605, 13.0038], outline: octagon(55.605, 13.0038, 8), districts: [
    district("d-mma-centrum", "Centrum", "CEN", rect(55.598, 12.99, 55.612, 13.02)),
    district("d-mma-vastra", "Västra hamnen", "VHA", rect(55.612, 12.96, 55.625, 12.99)),
  ] },
  {
    id: "paris",
    country: "FR",
    name: "Paris",
    code: "PAR",
    center: [48.8566, 2.3522],
    outline: rect(48.8, 2.2, 48.96, 2.46),
    districts: [
      district("d-paris-centre", "Paris Centre", "PC", rect(48.85, 2.33, 48.868, 2.362)),
      district("d-rive-gauche", "Rive Gauche", "RG", rect(48.83, 2.29, 48.8495, 2.329)),
      district("d-opera", "Opéra–Champs-Élysées", "OCE", rect(48.8685, 2.29, 48.882, 2.345)),
      district("d-montmartre", "Montmartre–Nord", "MN", rect(48.8825, 2.33, 48.9, 2.375)),
      district("d-bastille", "Bastille–Est", "BE", rect(48.84, 2.3625, 48.868, 2.41)),
      district("d-defense", "La Défense", "LD", rect(48.882, 2.215, 48.902, 2.26)),
      district("d-saint-denis", "Saint-Denis", "SD", rect(48.922, 2.33, 48.95, 2.385)),
      district("d-boulogne", "Boulogne-Billancourt", "BB", rect(48.825, 2.22, 48.848, 2.26)),
      district("d-batignolles", "Batignolles", "BAT", rect(48.8825, 2.29, 48.9, 2.33)),
      district("d-montparnasse", "Montparnasse", "MTP", rect(48.828, 2.329, 48.85, 2.3625)),
      district("d-vincennes", "Vincennes", "VIN", rect(48.835, 2.41, 48.86, 2.45)),
    ],
  },
  { id: "lyon", country: "FR", name: "Lyon", code: "LYS", center: [45.764, 4.8357], outline: octagon(45.764, 4.8357, 8), districts: [
    district("d-lyon-presquile", "Presqu'île", "PRE", rect(45.755, 4.825, 45.772, 4.84)),
    district("d-lyon-partdieu", "Part-Dieu", "PDI", rect(45.755, 4.845, 45.772, 4.87)),
  ] },
  { id: "nice", country: "FR", name: "Nice", code: "NCE", center: [43.7102, 7.262], outline: octagon(43.7102, 7.262, 7), districts: [
    district("d-nice-centre", "Nice Centre", "CEN", rect(43.695, 7.255, 43.71, 7.28)),
    district("d-nice-port", "Port", "POR", rect(43.693, 7.28, 43.705, 7.3)),
  ] },
  {
    id: "tunis",
    country: "TN",
    name: "Tunis",
    code: "TUN",
    center: [36.8065, 10.1815],
    outline: rect(36.72, 10.1, 36.91, 10.37),
    districts: [
      district("d-tunis-centre", "Tunis Centre", "TC", rect(36.785, 10.155, 36.815, 10.2)),
      district("d-lac", "Les Berges du Lac", "LAC", rect(36.822, 10.215, 36.845, 10.26)),
      district("d-marsa", "La Marsa", "LM", rect(36.872, 10.31, 36.895, 10.345)),
      district("d-carthage", "Carthage", "CAR", rect(36.84, 10.305, 36.8635, 10.335)),
      district("d-sbs", "Sidi Bou Saïd", "SBS", rect(36.8636, 10.336, 36.8719, 10.355)),
      district("d-goulette", "La Goulette", "LG", rect(36.805, 10.285, 36.8395, 10.32)),
      district("d-ariana", "Ariana", "AR", rect(36.85, 10.17, 36.885, 10.2049)),
      district("d-ben-arous", "Ben Arous", "BA", rect(36.735, 10.2, 36.77, 10.25)),
      district("d-menzah", "El Menzah", "MEN", rect(36.815, 10.15, 36.85, 10.2)),
      district("d-bardo", "Le Bardo", "BAR", rect(36.795, 10.11, 36.825, 10.15)),
    ],
  },
  { id: "sousse", country: "TN", name: "Sousse", code: "SOU", center: [35.8256, 10.6411], outline: octagon(35.8256, 10.6411, 7), districts: [
    district("d-sousse-medina", "Médina", "MED", rect(35.82, 10.63, 35.832, 10.645)),
    district("d-sousse-kantaoui", "Port El Kantaoui", "KAN", rect(35.88, 10.585, 35.9, 10.61)),
  ] },
  { id: "sfax", country: "TN", name: "Sfax", code: "SFA", center: [34.7406, 10.7603], outline: octagon(34.7406, 10.7603, 7), districts: [
    district("d-sfax-medina", "Médina", "MED", rect(34.734, 10.755, 34.746, 10.768)),
  ] },
];

export function citiesOf(country: MarketId): City[] {
  return CITIES.filter((city) => city.country === country);
}

export function cityById(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

/** Places to search on the map or to build a circle around, per city. */
export const PLACES: { city: string; name: string; lat: number; lng: number }[] = [
  { city: "stockholm", name: "Östermalm, Stockholm", lat: 59.341, lng: 18.095 },
  { city: "stockholm", name: "Norrmalm, Stockholm", lat: 59.335, lng: 18.062 },
  { city: "stockholm", name: "Södermalm, Stockholm", lat: 59.312, lng: 18.07 },
  { city: "stockholm", name: "Arlanda Airport", lat: 59.649, lng: 17.923 },
  { city: "stockholm", name: "Bromma Airport", lat: 59.358, lng: 17.855 },
  { city: "stockholm", name: "Stockholm Central Station", lat: 59.3303, lng: 18.0586 },
  { city: "stockholm", name: "Mall of Scandinavia", lat: 59.3703, lng: 18.0043 },
  { city: "stockholm", name: "Kista", lat: 59.41, lng: 17.94 },
  { city: "sodertalje", name: "Södertälje", lat: 59.195, lng: 17.628 },
  { city: "goteborg", name: "Göteborg Central Station", lat: 57.7089, lng: 11.9733 },
  { city: "goteborg", name: "Landvetter Airport", lat: 57.6688, lng: 12.2923 },
  { city: "malmo", name: "Malmö Central Station", lat: 55.6091, lng: 13.0007 },
  { city: "paris", name: "Gare du Nord, Paris", lat: 48.8809, lng: 2.3553 },
  { city: "paris", name: "Tour Eiffel, Paris", lat: 48.8584, lng: 2.2945 },
  { city: "paris", name: "Charles de Gaulle Airport", lat: 49.0097, lng: 2.5479 },
  { city: "paris", name: "Orly Airport", lat: 48.7262, lng: 2.3652 },
  { city: "paris", name: "Stade de France", lat: 48.9245, lng: 2.3602 },
  { city: "lyon", name: "Lyon Part-Dieu", lat: 45.7606, lng: 4.8594 },
  { city: "nice", name: "Nice Côte d'Azur Airport", lat: 43.6584, lng: 7.2159 },
  { city: "tunis", name: "Tunis-Carthage Airport", lat: 36.851, lng: 10.227 },
  { city: "tunis", name: "Avenue Habib Bourguiba, Tunis", lat: 36.7995, lng: 10.1855 },
  { city: "tunis", name: "La Marsa Plage", lat: 36.8826, lng: 10.3305 },
  { city: "tunis", name: "Tunisia Mall, Lac 2", lat: 36.8455, lng: 10.2724 },
  { city: "sousse", name: "Sousse Médina", lat: 35.8265, lng: 10.6377 },
  { city: "sfax", name: "Sfax Médina", lat: 34.7398, lng: 10.7603 },
];
