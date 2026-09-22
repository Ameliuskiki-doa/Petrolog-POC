import { useMemo, useState } from 'react'
import { Save, Receipt } from 'lucide-react'
import { cx } from '@/components/ui'
import { idr } from '@/lib/format'
import { chargeTypes, sites } from '@/data/mobile'
import { useMobile, useSaved, gpsFix, stamp } from '../store'
import { MHeader, Section, Panel, BigButton, MLabel, MInput, Locked, Choice } from '../kit'
import { CameraCapture } from '../media'
import { JobPicker, useDefaultJob } from '../helpers'

type ChargeType = (typeof chargeTypes)[number]

export default function Charges() {
  const { charges, update, record } = useMobile()
  const saved = useSaved()
  const [jobId, setJobId, a] = useDefaultJob()
  const [type, setType] = useState<ChargeType>('Toll')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const geo = useMemo(() => gpsFix(sites['Tanjung Jetty'].geo), [])
  const amt = parseInt(amount.replace(/\D/g, ''), 10) || 0
  const ready = amt > 0 && amt <= 5_000_000 && photos.length > 0 && !!a

  function save() {
    setTried(true)
    if (!ready || !a) return
    update((s) => ({ ...s, charges: [{ at: stamp(), type, amount: amt, jobId: a.job.id, projectCode: a.job.projectCode, note }, ...s.charges] }))
    record({ kind: 'charge', jobId: a.job.id, projectCode: a.job.projectCode, title: `${type} ${idr(amt)}`, detail: `${a.job.id} · receipt photo${note ? ` · ${note}` : ''}`, sizeKb: 120 })
    saved(`${type} recorded`)
    setAmount('')
    setNote('')
    setPhotos([])
    setTried(false)
  }

  return (
    <div className="pb-8">
      <MHeader back title="Costs & charges" sub="Outside the base rate — tolls, parking, fees" />
      <Section title="Job">
        <JobPicker value={jobId} onChange={setJobId} />
        {a && (
          <div className="mt-2">
            <Locked label="Project code" value={a.job.projectCode} note="Every charge carries the project code of its parent job" />
          </div>
        )}
      </Section>
      <Section title="Type">
        <Choice options={chargeTypes} value={type} onChange={setType} />
      </Section>
      <Section title="Amount">
        <Panel className="space-y-4">
          <div>
            <MLabel>Amount (IDR)</MLabel>
            <MInput
              value={amt ? amt.toLocaleString('en-US') : amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 87,500"
              className={cx(tried && !(amt > 0) && 'border-red-500')}
            />
          </div>
          <div>
            <MLabel hint="optional">Note</MLabel>
            <MInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Samarinda gate, return trip" className="text-[16px] font-medium" />
          </div>
        </Panel>
      </Section>
      <Section title="Receipt">
        <CameraCapture kind="receipt" label={type} geo={geo} value={amt} photos={photos} onChange={setPhotos} max={2} cta="Photograph the receipt" />
        {tried && photos.length === 0 && <div className="mt-1 text-[12px] font-bold text-red-600">Receipt photo is required for reimbursement.</div>}
      </Section>
      <Section>
        <BigButton onClick={save} icon={<Save />} className={cx(!ready && 'opacity-60')}>
          Save charge
        </BigButton>
      </Section>
      {charges.length > 0 && (
        <Section title="Recorded today">
          <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
            {charges.map((c, i) => (
              <div key={c.at + i} className={cx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-slate-100')}>
                <Receipt size={18} className="shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">
                    {c.type} · {idr(c.amount)}
                  </div>
                  <div className="truncate font-mono text-[11px] text-slate-500">
                    {c.at.slice(11, 16)} · {c.jobId} · {c.projectCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
