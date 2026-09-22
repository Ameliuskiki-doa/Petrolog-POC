/**
 * Fuel points — master data for every place a unit can be refuelled (M14 Inventory).
 * Site stations and fuel trucks dispense from a fuel tank (stock is issued to the job's project code);
 * public stations are paid by fuel card and reconciled against the card statement.
 * The driver app reads this list, sorts it by distance from the phone's GPS fix and pre-selects the
 * point whose geofence the unit is inside — GPS works without a data signal, so this also works offline.
 */

export type FuelPointKind = 'Site fuel station' | 'Fuel truck' | 'Public station (fuel card)'

export interface Geo {
  lat: number
  lng: number
}

export interface FuelPoint {
  id: string
  name: string
  kind: FuelPointKind
  location: string
  /** Fixed coordinates; for a fuel truck this is the last GPS position of the truck */
  geo: Geo
  geofenceM: number
  /** Fuel tank (warehouse) the point dispenses from — issues reduce this tank's stock */
  sourceTankId?: string
  /** A fuel-card reader at the pump: card transactions are matched to driver entries */
  fuelCard: boolean
  attendantId?: string
  status: 'Active' | 'Inactive'
  note?: string
}

export const fuelPoints: FuelPoint[] = [
  {
    id: 'FS-03', name: 'Pit 3 fuel station', kind: 'Site fuel station', location: 'Kutai Kartanegara',
    geo: { lat: -0.41901, lng: 116.98322 }, geofenceM: 200, sourceTankId: 'TNK-KTI-01', fuelCard: true, attendantId: 'EMP-0006', status: 'Active',
    note: 'Two dispensers next to the Pit 3 ROM stockpile; card reader on dispenser 1',
  },
  {
    id: 'FT-02', name: 'Mobile fuel truck', kind: 'Fuel truck', location: 'Kutai Kartanegara',
    geo: { lat: -0.4331, lng: 117.0012 }, geofenceM: 50, sourceTankId: 'TNK-KTI-01', fuelCard: false, attendantId: 'EMP-0006', status: 'Active',
    note: 'Refuels excavators and cranes in the pit; refilled from tank T-01. Position follows the truck GPS',
  },
  {
    id: 'FS-05', name: 'Jetty fuel point', kind: 'Site fuel station', location: 'Kutai Kartanegara',
    geo: { lat: -0.5258, lng: 117.1439 }, geofenceM: 200, sourceTankId: 'TNK-JTY-01', fuelCard: false, attendantId: 'EMP-0006', status: 'Active',
    note: 'Single dispenser at the Tanjung Jetty coal yard',
  },
  {
    id: 'SPBU-6475107', name: 'SPBU 64.751.07 Tenggarong', kind: 'Public station (fuel card)', location: 'Kutai Kartanegara',
    geo: { lat: -0.345, lng: 116.998 }, geofenceM: 150, fuelCard: true, status: 'Active',
    note: 'Light vehicles and fallback for haul trucks; cost via fuel-card statement',
  },
  {
    id: 'FS-01', name: 'Balikpapan yard fuel station', kind: 'Site fuel station', location: 'Balikpapan Ops',
    geo: { lat: -1.2379, lng: 116.8529 }, geofenceM: 150, sourceTankId: 'TNK-BPN-01', fuelCard: false, attendantId: 'EMP-0024', status: 'Active',
  },
  {
    id: 'SPBU-3444112', name: 'SPBU 34.441.12 Garut', kind: 'Public station (fuel card)', location: 'Garut',
    geo: { lat: -7.2279, lng: 107.9087 }, geofenceM: 150, fuelCard: true, status: 'Active',
    note: 'Prime movers on the Well Pad K-7 rig move (HL-2028-002)',
  },
]

/** Label used on fuel entries, e.g. "Pit 3 fuel station (FS-03)" */
export const fuelPointLabel = (p: FuelPoint) => `${p.name} (${p.id})`

/** Great-circle distance in metres */
export function distanceM(a: Geo, b: Geo): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface NearbyFuelPoint extends FuelPoint {
  distanceM: number
  inside: boolean
}

/** Active fuel points within `radiusKm` of a position, nearest first */
export function nearbyFuelPoints(pos: Geo, radiusKm = 50): NearbyFuelPoint[] {
  return fuelPoints
    .filter((p) => p.status === 'Active')
    .map((p) => {
      const d = distanceM(pos, p.geo)
      return { ...p, distanceM: d, inside: d <= p.geofenceM }
    })
    .filter((p) => p.distanceM <= radiusKm * 1000)
    .sort((a, b) => a.distanceM - b.distanceM)
}
