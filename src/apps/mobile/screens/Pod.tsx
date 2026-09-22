import { useMemo, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Radar, Save, CheckCircle2, Circle, Scale, AlertTriangle } from 'lucide-react'
import { cx } from '@/components/ui'
import { sites } from '@/data/mobile'
import { useMobile, useSaved, hhmm, gpsFix, fmtGeo, clock } from '../store'
import { MHeader, Section, Panel, BigButton, MLabel, MInput } from '../kit'
import { CameraCapture, SignaturePad } from '../media'
import { useAssignments } from '../helpers'

export default function Pod() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { updateJob, record } = useMobile()
  const saved = useSaved()
  const a = useAssignments().find((x) => x.job.id === id)
  const site = a ? sites[a.job.destination] : undefined
  const geo = useMemo(() => gpsFix(site?.geo ?? { lat: -0.526, lng: 117.145 }), [site])
  const [photos, setPhotos] = useState<string[]>([])
  const [dn, setDn] = useState('DN-TJ-280310-')
  const [ton, setTon] = useState('')
  const [recipient, setRecipient] = useState('')
  const [sig, setSig] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  if (!a) return <Navigate to="/mobile" replace />
  if (a.st.phase !== 'arrived') return <Navigate to={`/mobile/jobs/${id}`} replace />
  const tripNo = a.st.trips.length + 1

  const t = parseFloat(ton.replace(',', '.'))
  const dnOk = /^DN-[A-Z]{2}-\d{6}-\d{4}$/.test(dn.trim())
  const tonOk = !isNaN(t) && t >= 5 && t <= 45
  const checks = [
    { ok: photos.length > 0, label: 'At least one cargo photo' },
    { ok: dnOk, label: 'Delivery note number (DN-TJ-YYMMDD-0000)' },
    { ok: tonOk, label: 'Weighbridge net tonnage (5–45 t)' },
    { ok: recipient.trim().length >= 3, label: 'Recipient name' },
    { ok: !!sig, label: 'Recipient signature' },
  ]
  const ready = checks.every((c) => c.ok)

  function save() {
    setTried(true)
    if (!ready) return
    updateJob(id, (j) => ({
      ...j,
      phase: 'ready',
      trips: [
        ...j.trips,
        {
          no: tripNo,
          loadedAt: hhmm(j.checkInAt),
          arrivedAt: hhmm(j.arriveAt),
          tonnage: +t.toFixed(1),
          dn: dn.trim(),
          recipient: recipient.trim(),
          photos,
          signature: sig ?? undefined,
          geo,
          local: true,
        },
      ],
    }))
    record({
      kind: 'pod',
      jobId: id,
      projectCode: a!.job.projectCode,
      title: `POD — trip ${tripNo}`,
      detail: `${id} · trip ${tripNo} · ${t.toFixed(1)} t · ${dn.trim()} · ${photos.length} photo${photos.length > 1 ? 's' : ''} + signature`,
      sizeKb: 140 * photos.length + 18,
    })
    saved(`POD for trip ${tripNo} saved`)
    nav(`/mobile/jobs/${id}`)
  }

  return (
    <div className="pb-8">
      <MHeader back={`/mobile/jobs/${id}`} title="Proof of delivery" sub={`${id} · trip ${tripNo}`} />

      <Section>
        <div className="flex items-start gap-3 rounded-2xl bg-ink-900 p-4 text-white">
          <Radar size={22} className="mt-0.5 shrink-0 text-brand-400" />
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold">Arrived {site?.name ?? a.job.destination}</div>
            <div className="text-[12px] text-slate-300">Geofence timestamp {hhmm(a.st.arriveAt)} · loaded {hhmm(a.st.checkInAt)}</div>
            <div className="font-mono text-[11px] text-slate-400">{fmtGeo(geo)}</div>
          </div>
        </div>
      </Section>

      <Section title="1 · Cargo photo">
        <CameraCapture kind="cargo" label={`${id} T${tripNo}`} geo={geo} photos={photos} onChange={setPhotos} cta="Photograph the load" />
      </Section>

      <Section title="2 · Delivery note & weight">
        <Panel className="space-y-4">
          <div>
            <MLabel hint="printed on the jetty DN">Delivery note no.</MLabel>
            <MInput value={dn} onChange={(e) => setDn(e.target.value.toUpperCase())} className={cx('font-mono', tried && !dnOk && 'border-red-500')} inputMode="text" />
          </div>
          <div>
            <MLabel hint="weighbridge lane 2">Net tonnage</MLabel>
            <div className="relative">
              <MInput value={ton} onChange={(e) => setTon(e.target.value)} inputMode="decimal" placeholder="e.g. 38.6" className={cx('pr-12', tried && !tonOk && 'border-red-500')} />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[16px] font-bold text-slate-500">t</span>
            </div>
            {tonOk && t > 40 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-amber-700">
                <AlertTriangle size={14} /> Above the 40 t rated payload — ops admin will review
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-500">
              <Scale size={13} /> Billed per tonne at the contract rate in force today
            </div>
          </div>
        </Panel>
      </Section>

      <Section title="3 · Recipient">
        <Panel className="space-y-3">
          <div>
            <MLabel>Received by</MLabel>
            <MInput value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Name of jetty checker" className={cx(tried && recipient.trim().length < 3 && 'border-red-500')} />
            <div className="mt-2 flex flex-wrap gap-2">
              {['Samsul Arifin', 'Wawan Setiadi'].map((n) => (
                <button key={n} type="button" onClick={() => setRecipient(n)} className="h-9 rounded-full bg-slate-100 px-3 text-[13px] font-bold text-slate-700 active:bg-slate-200">
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <MLabel hint={clock()}>Signature</MLabel>
            <SignaturePad onChange={setSig} name={recipient.trim() || undefined} />
          </div>
        </Panel>
      </Section>

      <Section>
        <div className="mb-3 space-y-1.5 rounded-2xl bg-white p-4 ring-2 ring-slate-200">
          {checks.map((c) => (
            <div key={c.label} className={cx('flex items-center gap-2 text-[13px] font-semibold', c.ok ? 'text-emerald-700' : tried ? 'text-red-600' : 'text-slate-500')}>
              {c.ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {c.label}
            </div>
          ))}
        </div>
        <BigButton onClick={save} icon={<Save />} className={cx(!ready && 'opacity-60')} sub="Saved on the phone first, then synced">
          Save POD
        </BigButton>
      </Section>
    </div>
  )
}
