import { useMemo, useState } from 'react'
import { Save, CreditCard, Smartphone, Satellite, Gauge } from 'lucide-react'
import { cx } from '@/components/ui'
import { num } from '@/lib/format'
import { fuelStations, sites, DRIVER_UNIT } from '@/data/mobile'
import { useMobile, useSaved, gpsFix, stamp } from '../store'
import { MHeader, Section, Panel, BigButton, MLabel, MInput, Locked, Choice } from '../kit'
import { CameraCapture } from '../media'
import { JobPicker, useDefaultJob } from '../helpers'

type Station = (typeof fuelStations)[number]

export default function FuelEntry() {
  const { fuel, update, record } = useMobile()
  const saved = useSaved()
  const [jobId, setJobId, a] = useDefaultJob()
  const [station, setStation] = useState<Station>(fuelStations[0])
  const [litres, setLitres] = useState('')
  const [odo, setOdo] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const geo = useMemo(() => gpsFix(sites['Pit 3 ROM'].geo), [])

  const last = fuel[0]
  const l = parseFloat(litres.replace(',', '.'))
  const o = parseInt(odo.replace(/\D/g, ''), 10)
  const lOk = !isNaN(l) && l > 0 && l <= 400
  const oOk = !isNaN(o) && o > last.odometer && o < last.odometer + 2000
  const km = oOk ? o - last.odometer : 0
  const kmL = oOk && lOk ? km / l : 0
  const ready = lOk && oOk && photos.length > 0 && !!a

  function save() {
    setTried(true)
    if (!ready || !a) return
    update((s) => ({ ...s, fuel: [{ at: stamp(), station, litres: l, odometer: o, projectCode: a.job.projectCode, channel: 'Mobile app' }, ...s.fuel] }))
    record({
      kind: 'fuel',
      jobId: a.job.id,
      projectCode: a.job.projectCode,
      title: `Fuel ${num(l, 1)} L — ${DRIVER_UNIT}`,
      detail: `${station} · odometer ${num(o)} km · pump photo`,
      sizeKb: 150 * photos.length + 2,
      conflict: station.includes('FS-03')
        ? `Matched fuel-card transaction FC-FS03-${String(o).slice(-4)} for the same fill (±3 min, same pump). Merged into one record — no double count; your pump photo kept as evidence.`
        : undefined,
    })
    saved(`Fuel ${num(l, 1)} L recorded`)
    setLitres('')
    setOdo('')
    setPhotos([])
    setTried(false)
  }

  const channelIcon = { 'Mobile app': Smartphone, 'Fuel card': CreditCard, 'Fuel stick (GPS)': Satellite }

  return (
    <div className="pb-8">
      <MHeader title="Fuel entry" sub={`${DRIVER_UNIT} · at the pump`} />

      <Section title="Job">
        <JobPicker value={jobId} onChange={setJobId} />
        {a && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Locked label="Project code" value={a.job.projectCode} note="From parent job" />
            <Locked label="Unit" value={DRIVER_UNIT} note="Your assigned truck" />
          </div>
        )}
      </Section>

      <Section title="Pump">
        <Choice options={fuelStations} value={station} onChange={setStation} cols={2} />
      </Section>

      <Section title="Reading">
        <Panel className="space-y-4">
          <div>
            <MLabel hint="from the pump display">Litres</MLabel>
            <div className="relative">
              <MInput value={litres} onChange={(e) => setLitres(e.target.value)} inputMode="decimal" placeholder="e.g. 210.5" className={cx('pr-10', tried && !lOk && 'border-red-500')} />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-slate-500">L</span>
            </div>
          </div>
          <div>
            <MLabel hint={`last ${num(last.odometer)} km`}>Odometer</MLabel>
            <div className="relative">
              <MInput value={odo} onChange={(e) => setOdo(e.target.value)} inputMode="numeric" placeholder={String(last.odometer + 480)} className={cx('pr-12', tried && !oOk && 'border-red-500')} />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-slate-500">km</span>
            </div>
            {tried && !oOk && <div className="mt-1 text-[12px] font-bold text-red-600">Must be higher than the last reading ({num(last.odometer)} km) and plausible for one refill.</div>}
          </div>
          {oOk && lOk && (
            <div className={cx('flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold', kmL < 1.4 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700')}>
              <Gauge size={16} />
              {num(km)} km since last fill · {kmL.toFixed(2)} km/L {kmL < 1.4 ? '— below fleet norm, will be flagged for review' : ''}
            </div>
          )}
        </Panel>
      </Section>

      <Section title="Photo of pump display">
        <CameraCapture kind="pump" label={`${DRIVER_UNIT} fuel`} geo={geo} value={lOk ? l : 0} photos={photos} onChange={setPhotos} max={2} cta="Photograph the pump display" />
        {tried && photos.length === 0 && <div className="mt-1 text-[12px] font-bold text-red-600">A photo of the pump display is required.</div>}
      </Section>

      <Section>
        <BigButton onClick={save} icon={<Save />} className={cx(!ready && 'opacity-60')}>
          Save fuel entry
        </BigButton>
        <p className="mt-2 text-center text-[11px] text-slate-500">Fuel from the app, fuel card and GPS fuel stick is de-duplicated on the server.</p>
      </Section>

      <Section title="Recent fills">
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {fuel.slice(0, 6).map((f, i) => {
            const Icon = channelIcon[f.channel]
            return (
              <div key={f.at + i} className={cx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-slate-100')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{num(f.litres, 1)} L</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {f.at.slice(8, 10)} Mar {f.at.slice(11, 16)} · {f.station.split(' (')[0]} · {num(f.odometer)} km
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-500">{f.channel}</span>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
