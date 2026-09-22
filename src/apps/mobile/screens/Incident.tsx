import { useMemo, useState } from 'react'
import { Send, PhoneCall, MapPin, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { cx } from '@/components/ui'
import { getEmployee } from '@/data/core'
import { useMobile, useSaved, gpsFix, fmtGeo, stamp, clock } from '../store'
import { MHeader, Section, Panel, BigButton, MLabel, Choice, Locked } from '../kit'
import { CameraCapture } from '../media'
import { useDefaultJob } from '../helpers'

const kinds = ['Near miss', 'Hazard observation', 'Injury', 'Property damage', 'Spill / environmental', 'Vehicle incident'] as const
const severities = ['Low', 'Medium', 'High'] as const

export default function Incident() {
  const { incidents, update, record } = useMobile()
  const saved = useSaved()
  const [, , a] = useDefaultJob()
  const [kind, setKind] = useState<(typeof kinds)[number]>('Near miss')
  const [sev, setSev] = useState<(typeof severities)[number]>('Medium')
  const [desc, setDesc] = useState('')
  const [action, setAction] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [done, setDone] = useState<string>()
  const geo = useMemo(() => gpsFix({ lat: -0.4722, lng: 117.0621 }), [])
  const hse = getEmployee('EMP-0010')
  const ready = desc.trim().length >= 10
  const projectCode = a?.job.projectCode ?? 'HL-2027-014.01'

  function submit() {
    if (!ready) return
    const ref = `HSE-M-0310-${String(Math.floor(Math.random() * 9000) + 1000)}`
    update((s) => ({ ...s, incidents: [{ ref, at: stamp(), kind, severity: sev, description: desc, jobId: a?.job.id, projectCode }, ...s.incidents] }))
    record({ kind: 'incident', jobId: a?.job.id, projectCode, title: `${kind} report — ${sev}`, detail: `${ref} · ${desc.slice(0, 48)}${desc.length > 48 ? '…' : ''}`, sizeKb: 20 + photos.length * 150 })
    saved(`${kind} report saved`)
    setDone(ref)
  }

  if (done) {
    return (
      <div className="pb-8">
        <MHeader back="/mobile" title="Report saved" />
        <Section>
          <div className="rounded-2xl bg-emerald-50 p-5 text-center ring-2 ring-emerald-200">
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
            <div className="mt-2 text-[20px] font-extrabold">Thank you, Eko</div>
            <div className="mt-1 font-mono text-[14px] font-bold">{done}</div>
            <p className="mt-2 text-[13px] text-slate-700">
              Temporary device reference. HSE receives the report with photos and coordinates when it syncs and assigns the incident number. {hse?.name} (HSE Manager) is notified
              automatically.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <BigButton
              variant="light"
              onClick={() => {
                setDone(undefined)
                setDesc('')
                setAction('')
                setPhotos([])
              }}
            >
              Report another
            </BigButton>
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <MHeader back title="Report hazard / incident" sub="Quick report · works offline" />
      <Section>
        <a href="tel:+625417720911" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-[17px] font-extrabold text-white active:bg-red-700">
          <PhoneCall size={22} /> Emergency — call site ERT
        </a>
      </Section>
      <Section title="What happened?">
        <Choice options={kinds} value={kind} onChange={setKind} />
      </Section>
      <Section title="Severity">
        <Choice options={severities} value={sev} onChange={setSev} cols={3} />
        {sev === 'High' && (
          <div className="mt-2 flex gap-2 rounded-xl bg-red-100 px-3 py-2 text-[13px] font-bold text-red-900">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" /> Stop work if unsafe. High severity is escalated to the HSE Manager and site leader on sync.
          </div>
        )}
      </Section>
      <Section title="Where & when">
        <div className="grid grid-cols-1 gap-2">
          <Locked label="Location (GPS)" value={<span className="flex items-center gap-1.5 text-[14px]"><MapPin size={15} />{fmtGeo(geo)}</span>} note={`Haul road KM 9 · captured ${clock()}`} />
          <Locked label="Project code" value={projectCode} note={a ? `From ${a.job.id}` : 'Default for your unit'} />
        </div>
      </Section>
      <Section title="Details">
        <Panel className="space-y-4">
          <div>
            <MLabel hint="min. 10 characters">Description</MLabel>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="e.g. Deep pothole on haul road KM 9 southbound, nearly lost traction when loaded."
              className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-[16px] font-medium outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <MLabel hint="optional">Immediate action taken</MLabel>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={2}
              placeholder="e.g. Placed cones, warned other drivers on ch. 4"
              className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-[16px] font-medium outline-none focus:border-brand-500"
            />
          </div>
        </Panel>
      </Section>
      <Section title="Photo">
        <CameraCapture kind="hazard" label={kind} geo={geo} photos={photos} onChange={setPhotos} cta="Photograph the hazard" />
      </Section>
      <Section>
        <BigButton variant="danger" onClick={submit} disabled={!ready} icon={<Send />}>
          Send report
        </BigButton>
      </Section>
      {incidents.length > 0 && (
        <Section title="My reports">
          <div className="space-y-2">
            {incidents.map((i) => (
              <Panel key={i.ref} className="py-3">
                <div className="flex justify-between text-[14px] font-bold">
                  <span>{i.kind}</span>
                  <span className={cx(i.severity === 'High' ? 'text-red-600' : i.severity === 'Medium' ? 'text-amber-700' : 'text-emerald-700')}>{i.severity}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {i.ref} · {i.at.slice(11, 16)}
                </div>
              </Panel>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
