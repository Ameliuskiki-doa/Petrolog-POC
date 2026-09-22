import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, FileDigit, Landmark, FolderUp, Tags, ClipboardCheck, CheckCircle2, XCircle, Loader2, Paperclip, ArrowLeft, ArrowRight, Send, PartyPopper, Info } from 'lucide-react'
import { Card, CardHeader, Button, Input, Select, FormField, Callout, Mono, Timeline, cx } from '@/components/ui'
import { date } from '@/lib/format'
import { vendors } from '@/data/core'
import { vendorCategories, regions, banks, requiredRegistrationDocs } from '@/data/portal'
import { useToast } from '@/lib/app-state'
import { demoIso, wib } from '../store'

const steps = [
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'tax', label: 'Tax (NPWP)', icon: FileDigit },
  { key: 'bank', label: 'Bank account', icon: Landmark },
  { key: 'docs', label: 'Legal documents', icon: FolderUp },
  { key: 'cat', label: 'Categories', icon: Tags },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
] as const

const digits = (s: string) => s.replace(/\D/g, '')
function fmtNpwp(s: string) {
  const d = digits(s).slice(0, 16)
  if (d.length === 16) return d
  const p = [2, 3, 3, 1, 3, 3]
  let out = ''
  let i = 0
  p.forEach((n, k) => {
    const part = d.slice(i, i + n)
    if (!part) return
    out += (k === 0 ? '' : k === 3 ? '.' : k === 4 ? '-' : '.') + part
    i += n
  })
  return out
}

interface DocUp {
  file?: string
  expiry?: string
  number?: string
}

export default function Register() {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [tried, setTried] = useState(false)
  const [c, setC] = useState({ name: '', form: 'PT', address: '', city: '', province: 'Kalimantan Timur', contact: '', role: '', email: '', phone: '' })
  const [npwp, setNpwp] = useState('')
  const [pkp, setPkp] = useState<'yes' | 'no'>('yes')
  const [npwpCheck, setNpwpCheck] = useState<'idle' | 'checking' | 'ok' | 'dup'>('idle')
  const [bank, setBank] = useState({ bank: banks[0] as string, account: '', holder: '', branch: '' })
  const [docs, setDocs] = useState<Record<string, DocUp>>({})
  const [cats, setCats] = useState<string[]>([])
  const [regs, setRegs] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const [done, setDone] = useState<{ ref: string; at: string }>()

  const dup = vendors.find((v) => digits(v.npwp) === digits(npwp).slice(0, 15) && digits(npwp).length >= 15)
  const npwpValid = digits(npwp).length === 15 || digits(npwp).length === 16
  const legal = `${c.form} ${c.name}`.trim().toUpperCase()
  const holderMismatch = bank.holder.trim() !== '' && c.name.trim() !== '' && !bank.holder.toUpperCase().includes(c.name.trim().toUpperCase())

  function runCheck() {
    if (!npwpValid) return
    setNpwpCheck('checking')
    window.setTimeout(() => setNpwpCheck(dup ? 'dup' : 'ok'), 700)
  }

  const valid: Record<string, boolean> = {
    company: c.name.trim().length >= 3 && c.address.trim().length >= 8 && c.city.trim() !== '' && c.contact.trim() !== '' && /^\S+@\S+\.\S+$/.test(c.email) && digits(c.phone).length >= 9,
    tax: npwpValid && npwpCheck === 'ok',
    bank: bank.account.replace(/\D/g, '').length >= 8 && bank.holder.trim().length >= 3 && !holderMismatch,
    docs: requiredRegistrationDocs.every((d) => docs[d.key]?.file && (!d.expires || (docs[d.key]?.expiry ?? '') > '2028-03-10')),
    cat: cats.length > 0 && regs.length > 0,
    review: agree,
  }
  const key = steps[step].key

  function next() {
    setTried(true)
    if (!valid[key]) {
      toast('Please complete the highlighted fields', 'warning')
      return
    }
    setTried(false)
    if (step < steps.length - 1) setStep(step + 1)
    else {
      setDone({ ref: `REG-2028-${String(147 + Math.floor(Math.random() * 20)).padStart(4, '0')}`, at: demoIso() })
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <PartyPopper size={40} className="mx-auto text-brand-600" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Registration submitted</h1>
        <p className="mt-1 text-sm text-slate-600">
          {legal} · registration reference <Mono className="font-semibold">{done.ref}</Mono> · {wib(done.at)}
        </p>
        <div className="mx-auto mt-5 max-w-md rounded-xl bg-brand-50 p-4 text-sm text-brand-700 ring-1 ring-brand-200 ring-inset">
          <b>Vendor code will be assigned automatically after qualification.</b> Your status is <b>Prospective</b> until Petrolog procurement verifies your documents.
        </div>
        <div className="mx-auto mt-6 max-w-md text-left">
          <Timeline
            items={[
              { time: wib(done.at), title: 'Registration received', body: 'Confirmation sent to ' + c.email, tone: 'green' },
              { time: 'Within 3 working days', title: 'Document verification by procurement', body: 'NPWP, NIB, licences and bank account are checked', tone: 'blue' },
              { time: 'On approval', title: 'Qualification & vendor code', body: 'Code issued in the VND-00000 series; duplicate check on NPWP', tone: 'slate' },
              { time: 'After activation', title: 'RFQ invitations in your categories', body: 'Expired documents automatically pause invitations', tone: 'slate' },
            ]}
          />
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/portal">
            <Button variant="primary">Go to vendor portal</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const err = (ok: boolean) => (tried && !ok ? 'border-red-400' : '')

  return (
    <div>
      <div className="mb-5">
        <div className="text-[11px] font-semibold tracking-wider text-brand-700 uppercase">Vendor self-registration · PROC-02 · PROC-03</div>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Register your company as a Petrolog vendor</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Enter your data once and upload documents directly — no forms by email. Takes about 10 minutes; you can come back to it on this device.</p>
      </div>

      <ol className="scrollbar-thin mb-5 flex gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <li key={s.key}>
            <button
              onClick={() => i < step && setStep(i)}
              className={cx(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                i < step && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                i === step && 'bg-ink-900 text-white',
                i > step && 'bg-white text-slate-400 ring-1 ring-slate-200',
              )}
            >
              {i < step ? <CheckCircle2 size={14} /> : <s.icon size={14} />}
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        {key === 'company' && (
          <>
            <CardHeader title="Company data" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Legal form">
                <Select className="w-full" value={c.form} onChange={(e) => setC({ ...c, form: e.target.value })}>
                  {['PT', 'CV', 'Koperasi', 'UD', 'Firma'].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Company name (as in deed)">
                  <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Mahakam Ban Sejahtera" className={err(c.name.trim().length >= 3)} />
                </FormField>
              </div>
              <div className="sm:col-span-3">
                <FormField label="Registered address">
                  <Input value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} placeholder="Jl. Jend. Sudirman No. 12" className={err(c.address.trim().length >= 8)} />
                </FormField>
              </div>
              <FormField label="City">
                <Input value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} placeholder="Balikpapan" className={err(c.city.trim() !== '')} />
              </FormField>
              <FormField label="Province">
                <Select className="w-full" value={c.province} onChange={(e) => setC({ ...c, province: e.target.value })}>
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </FormField>
              <div />
              <FormField label="Contact person">
                <Input value={c.contact} onChange={(e) => setC({ ...c, contact: e.target.value })} className={err(c.contact.trim() !== '')} />
              </FormField>
              <FormField label="Position">
                <Input value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="Director" />
              </FormField>
              <div />
              <FormField label="Company email" hint="Used for portal login and notifications">
                <Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="finance@company.co.id" className={err(/^\S+@\S+\.\S+$/.test(c.email))} />
              </FormField>
              <FormField label="Phone">
                <Input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="+62 542 000 000" className={err(digits(c.phone).length >= 9)} />
              </FormField>
            </div>
          </>
        )}

        {key === 'tax' && (
          <>
            <CardHeader title="Tax identity" subtitle="NPWP is the key for duplicate detection — one vendor record per taxpayer" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="NPWP (15 digits, or 16-digit NIK-based NPWP)">
                <div className="flex gap-2">
                  <Input
                    value={npwp}
                    onChange={(e) => {
                      setNpwp(fmtNpwp(e.target.value))
                      setNpwpCheck('idle')
                    }}
                    onBlur={runCheck}
                    placeholder="00.000.000.0-000.000"
                    className={cx('font-mono', err(npwpValid))}
                  />
                  <Button onClick={runCheck} disabled={!npwpValid || npwpCheck === 'checking'}>
                    Check
                  </Button>
                </div>
              </FormField>
              <FormField label="PKP (VAT-registered)?">
                <Select className="w-full" value={pkp} onChange={(e) => setPkp(e.target.value as 'yes' | 'no')}>
                  <option value="yes">Yes — we issue faktur pajak</option>
                  <option value="no">No</option>
                </Select>
              </FormField>
            </div>
            <div className="mt-4">
              {npwpCheck === 'checking' && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 size={16} className="animate-spin" /> Checking against the Petrolog vendor master…
                </div>
              )}
              {npwpCheck === 'ok' && (
                <Callout tone="green" icon={<CheckCircle2 size={18} />} title="NPWP not yet registered">
                  No existing vendor uses this NPWP. You can continue.
                </Callout>
              )}
              {npwpCheck === 'dup' && dup && (
                <Callout tone="red" icon={<XCircle size={18} />} title="This NPWP is already registered">
                  It belongs to <b>{dup.name}</b> ({dup.id}). A second vendor record for the same taxpayer is not allowed. If you work for this company, ask your administrator for portal access, or contact
                  vendor.support@petrolog.co.id.
                </Callout>
              )}
              {npwpCheck === 'idle' && (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Info size={13} /> Try <Mono>71.234.001.1-722.000</Mono> to see the duplicate check.
                </p>
              )}
            </div>
          </>
        )}

        {key === 'bank' && (
          <>
            <CardHeader title="Bank account for payments" subtitle="Account holder must match the company name; verified with a bank reference letter" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Bank">
                <Select className="w-full" value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })}>
                  {banks.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Branch">
                <Input value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })} placeholder="KCU Balikpapan" />
              </FormField>
              <FormField label="Account number">
                <Input value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value.replace(/[^\d-]/g, '') })} className={cx('font-mono', err(bank.account.replace(/\D/g, '').length >= 8))} />
              </FormField>
              <FormField label="Account holder name" hint={legal ? `Expected: ${legal}` : undefined}>
                <Input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value.toUpperCase() })} className={err(bank.holder.trim().length >= 3 && !holderMismatch)} />
              </FormField>
            </div>
            {holderMismatch && (
              <div className="mt-3">
                <Callout tone="red" title="Account holder does not match the company name">
                  Payments are only made to an account in the registered company's name.
                </Callout>
              </div>
            )}
          </>
        )}

        {key === 'docs' && (
          <>
            <CardHeader title="Legal documents" subtitle="Upload each document; enter the expiry date where the document expires. You are reminded 60 days before expiry." />
            <div className="divide-y divide-slate-100">
              {requiredRegistrationDocs.map((d) => {
                const u = docs[d.key] ?? {}
                const ok = !!u.file && (!d.expires || (u.expiry ?? '') > '2028-03-10')
                return (
                  <div key={d.key} className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-[1fr_auto_auto]">
                    <div className="flex items-center gap-2 text-sm">
                      {ok ? <CheckCircle2 size={17} className="text-emerald-600" /> : <span className={cx('h-4 w-4 rounded-full border-2', tried ? 'border-red-400' : 'border-slate-300')} />}
                      <span className="text-slate-800">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.expires ? (
                        <Input type="date" min="2028-03-11" value={u.expiry ?? ''} onChange={(e) => setDocs({ ...docs, [d.key]: { ...u, expiry: e.target.value } })} className={cx('w-40', err((u.expiry ?? '') > '2028-03-10'))} aria-label={`${d.name} expiry`} />
                      ) : (
                        <span className="w-40 text-xs text-slate-400">No expiry</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.file && <span className="max-w-[180px] truncate text-xs text-slate-600">{u.file}</span>}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Paperclip size={13} /> {u.file ? 'Replace' : 'Upload'}
                        <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && setDocs({ ...docs, [d.key]: { ...u, file: e.target.files[0].name } })} />
                      </label>
                      {!u.file && (
                        <button className="text-xs text-slate-500 underline" onClick={() => setDocs({ ...docs, [d.key]: { ...u, file: `${d.key.toUpperCase()}_${(c.name || 'company').replace(/\s+/g, '_')}.pdf`, expiry: d.expires ? u.expiry || '2029-12-31' : undefined } })}>
                          sample
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {key === 'cat' && (
          <>
            <CardHeader title="What do you supply, and where?" subtitle="RFQ invitations are matched to these categories and regions" />
            <div className="text-xs font-medium text-slate-600">Categories</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {vendorCategories.map((k) => (
                <button key={k} onClick={() => setCats((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} className={cx('rounded-full px-3 py-1.5 text-sm ring-1 ring-inset', cats.includes(k) ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}>
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-5 text-xs font-medium text-slate-600">Regions served</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {regions.map((k) => (
                <button key={k} onClick={() => setRegs((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} className={cx('rounded-full px-3 py-1.5 text-sm ring-1 ring-inset', regs.includes(k) ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}>
                  {k}
                </button>
              ))}
            </div>
            {tried && !valid.cat && <p className="mt-3 text-sm text-red-600">Choose at least one category and one region.</p>}
          </>
        )}

        {key === 'review' && (
          <>
            <CardHeader title="Review & submit" />
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Company</div>
                <div className="font-medium">{legal}</div>
                <div className="text-slate-600">
                  {c.address}, {c.city}, {c.province}
                </div>
                <div className="text-slate-600">
                  {c.contact} {c.role && `(${c.role})`} · {c.email} · {c.phone}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Tax & bank</div>
                <div>
                  NPWP <Mono>{npwp}</Mono> · {pkp === 'yes' ? 'PKP' : 'non-PKP'}
                </div>
                <div>
                  {bank.bank} <Mono>{bank.account}</Mono>
                </div>
                <div className="text-slate-600">{bank.holder}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Documents</div>
                {requiredRegistrationDocs.map((d) => (
                  <div key={d.key} className="flex justify-between gap-2">
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{docs[d.key]?.expiry ? `until ${date(docs[d.key]!.expiry!)}` : 'no expiry'}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Categories & regions</div>
                <div>{cats.join(', ')}</div>
                <div className="text-slate-600">{regs.join(', ')}</div>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
              I confirm the data and documents are true and complete, and agree to the Petrolog vendor code of conduct and anti-bribery policy.
            </label>
            {tried && !agree && <p className="mt-2 text-sm text-red-600">Please confirm the declaration.</p>}
          </>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <Button variant="ghost" icon={<ArrowLeft size={15} />} disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <span className="text-xs text-slate-400">
            Step {step + 1} of {steps.length}
          </span>
          <Button variant="primary" icon={step === steps.length - 1 ? <Send size={15} /> : undefined} onClick={next}>
            {step === steps.length - 1 ? 'Submit registration' : 'Continue'}
            {step < steps.length - 1 && <ArrowRight size={15} />}
          </Button>
        </div>
      </Card>
    </div>
  )
}
