import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play, Radio } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Grid, PageHeader, Stat, cx, type Column } from '@/components/ui'
import { getUnit } from '@/data/core'
import { deviceStatus, geofences, haulRoad, personName, pitAccess, trackedUnits, workshopSpur, type DeviceStatus } from '@/data/operations'
import { dateTime } from '@/lib/format'
import { useJobs } from './store'
import { FLEET_MODULE, UnitLink } from './shared'

type Pt = [number, number]
const routes: Record<string, Pt[]> = { haul: haulRoad, pit: pitAccess, workshop: [...workshopSpur].reverse().concat(haulRoad.slice(1, 3)) }

function lengthOf(path: Pt[]) {
  let L = 0
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
  return L
}
function pointAt(path: Pt[], t: number): Pt {
  const total = lengthOf(path)
  let d = t * total
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
    if (d <= seg) {
      const f = seg ? d / seg : 0
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f]
    }
    d -= seg
  }
  return path[path.length - 1]
}
const poly = (p: Pt[]) => p.map((x) => x.join(',')).join(' ')
const BASE = new Date('2028-03-10T09:00:00').getTime()
const clock = (tick: number) => {
  const d = new Date(BASE + tick * 30_000)
  return `2028-03-10T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

interface LogRow {
  id: number
  time: string
  unitId: string
  geofence: string
  event: 'Arrival' | 'Departure'
}

const seedLog: LogRow[] = [
  { id: -1, time: '2028-03-10T08:52:30', unitId: 'DT-05', geofence: 'Tanjung Jetty', event: 'Arrival' },
  { id: -2, time: '2028-03-10T08:47:00', unitId: 'DT-02', geofence: 'Haul road km 27 checkpoint', event: 'Departure' },
  { id: -3, time: '2028-03-10T08:41:30', unitId: 'DT-01', geofence: 'Pit 3 ROM', event: 'Departure' },
  { id: -4, time: '2028-03-10T08:30:00', unitId: 'LV-07', geofence: 'Pit 3 Workshop', event: 'Arrival' },
]

export default function LiveTracking() {
  const jobs = useJobs()
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(true)
  const [sel, setSel] = useState('DT-03')
  const [log, setLog] = useState<LogRow[]>(seedLog)
  const inside = useRef<Record<string, string | undefined>>({})

  useEffect(() => {
    if (!running) return
    const h = setInterval(() => setTick((t) => t + 1), 900)
    return () => clearInterval(h)
  }, [running])

  const positions = useMemo(
    () =>
      trackedUnits.map((u) => {
        const ph = (u.phase + u.speed * tick) % 2
        const t = ph <= 1 ? ph : 2 - ph
        const [x, y] = pointAt(routes[u.route], t)
        const prevPh = (u.phase + u.speed * Math.max(0, tick - 1)) % 2
        const tp = prevPh <= 1 ? prevPh : 2 - prevPh
        const [px, py] = pointAt(routes[u.route], tp)
        const speed = u.speed ? Math.round(Math.hypot(x - px, y - py) * 3.1) : 0
        return { ...u, x, y, speed, loaded: u.route === 'haul' ? ph <= 1 : false }
      }),
    [tick],
  )

  // geofence arrival / departure detection
  useEffect(() => {
    const events: LogRow[] = []
    for (const p of positions) {
      const gf = geofences.find((g) => Math.hypot(g.x - p.x, g.y - p.y) <= g.r)?.name
      const prev = inside.current[p.unitId]
      if (tick > 0 && gf !== prev) {
        if (prev) events.push({ id: tick * 100 + events.length, time: clock(tick), unitId: p.unitId, geofence: prev, event: 'Departure' })
        if (gf) events.push({ id: tick * 100 + events.length + 50, time: clock(tick), unitId: p.unitId, geofence: gf, event: 'Arrival' })
      }
      inside.current[p.unitId] = gf
    }
    if (events.length) setLog((l) => [...events.reverse(), ...l].slice(0, 40))
  }, [positions, tick])

  const s = positions.find((p) => p.unitId === sel)
  const su = getUnit(sel)
  const sJob = jobs.find((j) => j.unitIds.includes(sel) && (j.status === 'In Progress' || j.status === 'Dispatched'))

  const devCols: Column<DeviceStatus>[] = [
    { key: 'u', header: 'Unit', render: (d) => <UnitLink id={d.unitId} /> },
    { key: 't', header: 'Type', render: (d) => <span className="text-slate-600">{getUnit(d.unitId)?.type}</span> },
    ...(['gps', 'dashcam', 'fuelStick'] as const).map((k) => ({
      key: k,
      header: k === 'gps' ? 'GPS' : k === 'dashcam' ? 'Dashcam' : 'Fuel stick',
      render: (d: DeviceStatus) => (d[k] === 'n/a' ? <span className="text-xs text-slate-300">—</span> : <Badge dot tone={d[k] === 'Online' ? 'green' : d[k] === 'Delayed' ? 'amber' : 'red'}>{d[k]}</Badge>),
    })),
    { key: 'p', header: 'Last ping', render: (d) => <span className="whitespace-nowrap text-xs text-slate-500">{dateTime(d.lastPing)}</span> },
    { key: 'a', header: 'Adapter', render: (d) => <span className="text-xs text-slate-500">{d.adapter}</span> },
  ]
  const online = deviceStatus.filter((d) => d.gps === 'Online').length
  const gpsFitted = deviceStatus.filter((d) => d.gps !== 'n/a').length

  return (
    <>
      <PageHeader
        module={FLEET_MODULE}
        title="Live Tracking"
        subtitle="Unit position and route with client site geofences. Entering or leaving a geofence stamps arrival and departure automatically, feeding the job's field check-in timeline."
        crumbs={[{ label: 'Operations' }, { label: 'Live Tracking' }]}
        actions={
          <Button icon={running ? <Pause size={15} /> : <Play size={15} />} onClick={() => setRunning(!running)}>
            {running ? 'Pause feed' : 'Resume feed'}
          </Button>
        }
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Units on map (Kutai)" value={positions.length} sub={`${positions.filter((p) => p.speed > 0).length} moving`} />
        <Stat label="GPS devices online" value={`${online}/${gpsFitted}`} sub="Across all sites" tone={online / gpsFitted > 0.8 ? 'good' : 'warn'} />
        <Stat label="Geofence events today" value={log.length + 38} sub="Arrival & departure stamps" />
        <Stat label="Client site geofences" value={geofences.filter((g) => g.kind === 'Client site').length} sub="Pit 3, Pit 4, Crusher, Jetty" />
      </Grid>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card padded={false} className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <div className="text-sm font-semibold text-slate-800">Kutai Kartanegara — Pit 3 haul road</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Radio size={13} className={cx(running ? 'animate-pulse text-emerald-600' : 'text-slate-400')} />
              {running ? 'Live' : 'Paused'} · {clock(tick).slice(11)} WITA
            </div>
          </div>
          <div className="scrollbar-thin overflow-x-auto">
            <svg viewBox="0 0 820 500" className="block w-full min-w-[640px] bg-[#eef3e8]">
              <defs>
                <pattern id="pitHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                  <rect width="8" height="8" fill="#d6c7a8" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#c4b28d" strokeWidth="3" />
                </pattern>
              </defs>
              {/* contour lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M -20 ${420 - i * 70} C 200 ${380 - i * 60}, 400 ${470 - i * 80}, 840 ${360 - i * 70}`} fill="none" stroke="#dbe5cf" strokeWidth="1.2" />
              ))}
              {/* Mahakam river */}
              <path d="M 560 -10 C 620 60, 700 60, 760 40 S 830 90, 840 120 L 840 -10 Z" fill="#bfdbfe" />
              <path d="M 600 -10 C 650 50, 720 45, 780 30 S 830 70, 840 90" fill="none" stroke="#93c5fd" strokeWidth="2" />
              <text x="770" y="22" fontSize="11" fill="#1d4ed8" fontStyle="italic">
                Mahakam River
              </text>
              {/* pits */}
              <path d="M 90 330 Q 110 300 160 305 Q 215 320 205 370 Q 190 410 140 405 Q 85 395 90 330 Z" fill="url(#pitHatch)" stroke="#a8916a" />
              <path d="M 60 170 Q 80 150 115 160 Q 135 185 120 215 Q 90 230 65 210 Z" fill="url(#pitHatch)" stroke="#a8916a" />
              {/* jetty */}
              <rect x="720" y="95" width="70" height="46" rx="4" fill="#cbd5e1" stroke="#94a3b8" />
              <rect x="770" y="60" width="12" height="40" fill="#94a3b8" />
              <rect x="782" y="58" width="36" height="16" rx="3" fill="#475569" />
              {/* workshop */}
              <rect x="232" y="425" width="38" height="26" rx="2" fill="#e2e8f0" stroke="#94a3b8" />
              <path d="M 232 425 L 251 412 L 270 425" fill="#cbd5e1" stroke="#94a3b8" />
              {/* crusher */}
              <rect x="275" y="289" width="20" height="20" fill="#e5e7eb" stroke="#6b7280" />
              {/* roads */}
              <polyline points={poly(haulRoad)} fill="none" stroke="#a8a29e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={poly(haulRoad)} fill="none" stroke="#f5f5f4" strokeWidth="1.5" strokeDasharray="6 6" />
              <polyline points={poly(pitAccess)} fill="none" stroke="#a8a29e" strokeWidth="7" strokeLinecap="round" />
              <polyline points={poly(workshopSpur)} fill="none" stroke="#a8a29e" strokeWidth="6" strokeLinecap="round" />
              {[
                [350, 292, 'km 12'],
                [470, 250, 'km 20'],
                [630, 170, 'km 35'],
              ].map(([x, y, l]) => (
                <text key={l as string} x={(x as number) + 6} y={(y as number) + 18} fontSize="9" fill="#78716c">
                  {l}
                </text>
              ))}
              {/* geofences */}
              {geofences.map((g) => (
                <g key={g.id}>
                  <circle cx={g.x} cy={g.y} r={g.r} fill={g.kind === 'Client site' ? 'rgba(245,158,11,0.10)' : g.kind === 'Own site' ? 'rgba(42,120,214,0.10)' : 'rgba(100,116,139,0.08)'} stroke={g.kind === 'Client site' ? '#d97706' : g.kind === 'Own site' ? '#2a78d6' : '#64748b'} strokeDasharray="5 4" strokeWidth="1.3" />
                  <text x={g.x} y={g.y - g.r - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#334155">
                    {g.name}
                  </text>
                </g>
              ))}
              {/* units */}
              {positions.map((p) => {
                const active = p.unitId === sel
                return (
                  <g key={p.unitId} transform={`translate(${p.x},${p.y})`} onClick={() => setSel(p.unitId)} className="cursor-pointer" style={{ transition: 'transform 0.9s linear' }}>
                    {active && <circle r="15" fill="rgba(15,23,42,0.12)" />}
                    <circle r="8" fill={p.speed === 0 ? '#64748b' : p.loaded ? '#eb6834' : '#2a78d6'} stroke="#fff" strokeWidth="2" />
                    <text y="-12" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                      {p.unitId}
                    </text>
                  </g>
                )
              })}
              {/* legend */}
              <g transform="translate(14,470)">
                <rect width="380" height="22" rx="4" fill="rgba(255,255,255,0.85)" />
                <circle cx="12" cy="11" r="5" fill="#eb6834" />
                <text x="21" y="15" fontSize="10" fill="#334155">Loaded</text>
                <circle cx="72" cy="11" r="5" fill="#2a78d6" />
                <text x="81" y="15" fontSize="10" fill="#334155">Empty return</text>
                <circle cx="158" cy="11" r="5" fill="#64748b" />
                <text x="167" y="15" fontSize="10" fill="#334155">Stationary</text>
                <circle cx="236" cy="11" r="6" fill="none" stroke="#d97706" strokeDasharray="3 2" />
                <text x="246" y="15" fontSize="10" fill="#334155">Client geofence</text>
              </g>
            </svg>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Selected unit" />
            {s && su && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <UnitLink id={sel} className="text-sm font-semibold" />
                  <Badge tone={s.speed === 0 ? 'slate' : 'green'} dot>
                    {s.speed === 0 ? 'Stationary' : `${s.speed} km/h`}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  {su.type} · {su.plate ?? su.make}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver</span>
                  <span>{personName(s.driverId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">State</span>
                  <span>{s.route === 'haul' ? (s.loaded ? 'Loaded → Jetty' : 'Empty → Pit 3') : s.route === 'pit' ? 'Pit 3 ↔ Pit 4' : 'Workshop area'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Job</span>
                  {sJob ? (
                    <Link to={`/ops/jobs/${sJob.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                      {sJob.id}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {positions.map((p) => (
                <button key={p.unitId} onClick={() => setSel(p.unitId)} className={cx('rounded px-1.5 py-0.5 font-mono text-[11px]', p.unitId === sel ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
                  {p.unitId}
                </button>
              ))}
            </div>
          </Card>
          <Card padded={false}>
            <div className="px-4 pt-4">
              <CardHeader title="Geofence log" subtitle="Automatic arrival / departure stamps" />
            </div>
            <ul className="scrollbar-thin max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {log.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-1.5 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-slate-800">{l.unitId}</span> <span className="text-slate-500">{l.event === 'Arrival' ? 'entered' : 'left'}</span>{' '}
                    <span className="text-slate-700">{l.geofence}</span>
                  </div>
                  <span className="num shrink-0 text-slate-400">{l.time.slice(11, 19)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Device integration status" subtitle="Adapters to the APIs of GPS, dashcam and fuel-stick devices already in operation (OPS-20). Device supply is out of scope." actions={<Link to="/admin/integrations" className="text-xs text-brand-700 hover:underline">Integrations →</Link>} />
        </div>
        <DataTable dense columns={devCols} rows={deviceStatus} rowKey={(d) => d.unitId} />
      </Card>
    </>
  )
}
