import { useState } from 'react'
import { CreditCard, Fuel, MapPin, Plus, Smartphone, Truck } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Drawer, FormField, Grid, Input, Mono, Select, Stat, StatusBadge } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { num } from '@/lib/format'
import { fuelPoints as seedPoints, type FuelPoint, type FuelPointKind } from '@/data/fuelPoints'
import { getWarehouse, warehouses, type Item } from '@/data/supporting'
import { Person } from './shared'

const kindTone: Record<FuelPointKind, 'amber' | 'sky' | 'violet'> = {
  'Site fuel station': 'amber',
  'Fuel truck': 'sky',
  'Public station (fuel card)': 'violet',
}

const tanks = warehouses.filter((w) => w.kind === 'Fuel tank')
const blank = { id: '', name: '', kind: 'Site fuel station' as FuelPointKind, location: 'Kutai Kartanegara', lat: '', lng: '', geofenceM: '150', sourceTankId: tanks[0]?.id ?? '', fuelCard: 'no' }

/** Inventory → Fuel points: master data the driver app uses to find the nearest pump. */
export function FuelPointsTab({ fuel }: { fuel?: Item }) {
  const toast = useToast()
  const [points, setPoints] = useState<FuelPoint[]>(seedPoints)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(blank)
  const [tried, setTried] = useState(false)

  const needsTank = f.kind !== 'Public station (fuel card)'
  const lat = parseFloat(f.lat)
  const lng = parseFloat(f.lng)
  const errors = {
    id: !f.id.trim() ? 'Required' : points.some((p) => p.id.toLowerCase() === f.id.trim().toLowerCase()) ? 'Code already used' : '',
    name: !f.name.trim() ? 'Required' : '',
    geo: isNaN(lat) || isNaN(lng) || lat < -11 || lat > 6 || lng < 95 || lng > 141 ? 'Enter coordinates inside Indonesia (e.g. -0.41901, 116.98322)' : '',
    radius: !(Number(f.geofenceM) >= 30 && Number(f.geofenceM) <= 1000) ? '30 – 1,000 m' : '',
    tank: needsTank && !f.sourceTankId ? 'Site stations and fuel trucks must dispense from a fuel tank' : '',
  }
  const valid = Object.values(errors).every((e) => !e)

  function save() {
    setTried(true)
    if (!valid) return
    const p: FuelPoint = {
      id: f.id.trim().toUpperCase(), name: f.name.trim(), kind: f.kind, location: f.location, geo: { lat, lng }, geofenceM: Number(f.geofenceM),
      sourceTankId: needsTank ? f.sourceTankId : undefined, fuelCard: f.kind === 'Public station (fuel card)' || f.fuelCard === 'yes', status: 'Active',
    }
    setPoints([...points, p])
    setOpen(false)
    setF(blank)
    setTried(false)
    toast(`Fuel point ${p.id} added — published to the driver app on next sync`, 'success')
  }

  const site = points.filter((p) => p.kind === 'Site fuel station').length
  const trucks = points.filter((p) => p.kind === 'Fuel truck').length
  const publicSt = points.filter((p) => p.kind === 'Public station (fuel card)').length

  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Site fuel stations" value={site} sub="Dispense from a site fuel tank" icon={<Fuel size={16} />} />
        <Stat label="Fuel trucks" value={trucks} sub="Position follows the truck GPS" icon={<Truck size={16} />} />
        <Stat label="Public stations (fuel card)" value={publicSt} sub="Cost via fuel-card statement" icon={<CreditCard size={16} />} />
        <Stat label="HSD in site tanks" value={`${num(tanks.reduce((a, t) => a + (fuel?.stock[t.id] ?? 0), 0))} L`} sub={`${tanks.length} tanks`} />
      </Grid>

      <Callout tone="blue" icon={<Smartphone size={16} />} title="How the driver app uses this list">
        The app sorts active fuel points by distance from the phone&apos;s GPS fix and pre-selects the point whose geofence the unit is inside — GPS needs no
        data signal, so this also works offline. A fill at a site station or fuel truck is issued from its tank to the job&apos;s project code; a fill at a public
        station is matched against the fuel-card statement. Month-end, both are reconciled in Fuel Actualisation.
      </Callout>

      <Card padded={false}>
        <div className="p-4 pb-0">
          <CardHeader
            title="Fuel points"
            subtitle="Master data for every place a unit can be refuelled"
            actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setOpen(true)}>Add fuel point</Button>}
          />
        </div>
        <DataTable
          rows={points}
          rowKey={(p) => p.id}
          columns={[
            { key: 'id', header: 'Code', render: (p) => <Mono>{p.id}</Mono> },
            { key: 'name', header: 'Name', render: (p) => <div className="min-w-[180px]"><div className="text-sm font-medium">{p.name}</div>{p.note && <div className="max-w-[280px] text-xs text-slate-500">{p.note}</div>}</div> },
            { key: 'kind', header: 'Type', render: (p) => <Badge tone={kindTone[p.kind]}>{p.kind}</Badge> },
            { key: 'loc', header: 'Location', render: (p) => <span className="text-xs">{p.location}</span> },
            {
              key: 'geo', header: 'Geofence', render: (p) => (
                <span className="flex items-center gap-1 text-xs whitespace-nowrap text-slate-600">
                  <MapPin size={12} className="text-slate-400" />
                  {p.geo.lat.toFixed(5)}, {p.geo.lng.toFixed(5)} · {p.geofenceM} m
                </span>
              ),
            },
            {
              key: 'tank', header: 'Source tank', render: (p) => {
                const t = getWarehouse(p.sourceTankId ?? '')
                return t ? <div className="text-xs"><Mono>{t.id}</Mono><div className="text-slate-500">{num(fuel?.stock[t.id] ?? 0)} L on hand</div></div> : <span className="text-xs text-slate-400">Fuel-card statement</span>
              },
            },
            { key: 'card', header: 'Card reader', align: 'center', render: (p) => (p.fuelCard ? <Badge tone="green">Yes</Badge> : <span className="text-xs text-slate-400">—</span>) },
            { key: 'att', header: 'Attendant', render: (p) => (p.attendantId ? <Person id={p.attendantId} /> : <span className="text-xs text-slate-400">—</span>) },
            { key: 'st', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add fuel point"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>Save fuel point</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Code" hint={tried && errors.id ? <span className="text-red-600">{errors.id}</span> : 'e.g. FS-07'}>
              <Input value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} placeholder="FS-07" />
            </FormField>
            <FormField label="Type">
              <Select className="w-full" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as FuelPointKind })}>
                {(Object.keys(kindTone) as FuelPointKind[]).map((k) => <option key={k}>{k}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Name" hint={tried && errors.name ? <span className="text-red-600">{errors.name}</span> : undefined}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Pit 4 fuel station" />
          </FormField>
          <FormField label="Location">
            <Select className="w-full" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })}>
              {['Kutai Kartanegara', 'Balikpapan Ops', 'Bekapai', 'Bontang', 'Cilacap', 'Dumai', 'Garut'].map((l) => <option key={l}>{l}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Latitude"><Input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} placeholder="-0.41901" /></FormField>
            <FormField label="Longitude"><Input value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} placeholder="116.98322" /></FormField>
            <FormField label="Geofence (m)"><Input value={f.geofenceM} onChange={(e) => setF({ ...f, geofenceM: e.target.value })} /></FormField>
          </div>
          {tried && (errors.geo || errors.radius) && <div className="text-xs text-red-600">{errors.geo || `Geofence radius: ${errors.radius}`}</div>}
          {needsTank ? (
            <FormField label="Source tank" hint={tried && errors.tank ? <span className="text-red-600">{errors.tank}</span> : 'Fills are issued from this tank to the job’s project code'}>
              <Select className="w-full" value={f.sourceTankId} onChange={(e) => setF({ ...f, sourceTankId: e.target.value })}>
                {tanks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}
              </Select>
            </FormField>
          ) : (
            <Callout tone="slate">Public stations have no source tank. Cost arrives on the fuel-card statement and is matched to the driver&apos;s entry.</Callout>
          )}
          {f.kind === 'Site fuel station' && (
            <FormField label="Fuel-card reader at the pump">
              <Select className="w-full" value={f.fuelCard} onChange={(e) => setF({ ...f, fuelCard: e.target.value })}>
                <option value="no">No</option>
                <option value="yes">Yes — match card transactions to driver entries</option>
              </Select>
            </FormField>
          )}
        </div>
      </Drawer>
    </div>
  )
}
