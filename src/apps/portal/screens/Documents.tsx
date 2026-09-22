import { useState } from 'react'
import { RefreshCw, ShieldAlert, Paperclip, Building2 } from 'lucide-react'
import { PageHeader, Card, CardHeader, DataTable, Button, Modal, FormField, Input, Callout, Mono, DescList, Progress } from '@/components/ui'
import { date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { portalVendor } from '@/data/portal'
import { usePortal, docState } from '../store'
import { PStatus, FileChip } from '../bits'

export default function Documents() {
  const toast = useToast()
  const { docs, vendorId, renew } = usePortal()
  const v = portalVendor(vendorId)
  const [target, setTarget] = useState<string>()
  const [expiry, setExpiry] = useState('')
  const [number, setNumber] = useState('')
  const [file, setFile] = useState<string>()
  const doc = docs.find((d) => d.id === target)
  const rows = docs.map((d) => ({ ...d, st: docState(d.renewal?.expiry ?? d.expiry, !!d.renewal) }))
  const expired = rows.filter((r) => r.st.label === 'Expired')
  const valid = rows.filter((r) => r.st.label === 'Valid' || r.st.label === 'No expiry' || r.st.label === 'Under review').length

  function openRenew(id: string) {
    const d = docs.find((x) => x.id === id)
    setTarget(id)
    setNumber(d?.number ?? '')
    setExpiry('')
    setFile(undefined)
  }
  function submit() {
    if (!doc || !file || !expiry || expiry <= '2028-03-10') {
      toast('Attach the renewed document and a future expiry date', 'warning')
      return
    }
    renew(doc.id, expiry, file)
    toast(`${doc.name} submitted — procurement verifies it within 2 working days`, 'success')
    setTarget(undefined)
  }

  return (
    <div>
      <PageHeader module="Vendor Portal · PROC-04 qualification" title="Company & qualification documents" subtitle="Keep your legal and compliance documents current. You are reminded 60 days before anything expires." crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Documents' }]} />

      {expired.length > 0 && (
        <div className="mb-4">
          <Callout tone="red" icon={<ShieldAlert size={18} />} title={`${expired.length} document${expired.length > 1 ? 's' : ''} expired`}>
            While a qualification document is expired, your company is automatically excluded from new RFQ invitations. Existing POs and payments are not affected.
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-4 pb-0">
            <CardHeader title="Documents" subtitle={`${valid} of ${rows.length} valid`} />
          </div>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            rowClassName={(r) => (r.st.label === 'Expired' ? 'bg-red-50/40' : undefined)}
            columns={[
              {
                key: 'n',
                header: 'Document',
                render: (r) => (
                  <div className="min-w-[220px]">
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.group} · <Mono className="text-[11px]">{r.number}</Mono>
                    </div>
                  </div>
                ),
              },
              { key: 'i', header: 'Issuer', render: (r) => <span className="text-xs text-slate-600">{r.issuer}</span> },
              {
                key: 'e',
                header: 'Valid until',
                render: (r) =>
                  r.renewal ? (
                    <span className="text-xs whitespace-nowrap">
                      {date(r.renewal.expiry)} <span className="text-slate-400">(new)</span>
                    </span>
                  ) : r.expiry ? (
                    <span className="text-xs whitespace-nowrap">
                      {date(r.expiry)}
                      {r.st.days !== undefined && <span className={r.st.days < 0 ? 'text-red-600' : r.st.days <= 60 ? 'text-amber-700' : 'text-slate-400'}> · {r.st.days < 0 ? `${-r.st.days} d ago` : `${r.st.days} d`}</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No expiry</span>
                  ),
              },
              { key: 's', header: 'Status', render: (r) => <PStatus s={r.st.label} /> },
              {
                key: 'a',
                header: '',
                render: (r) =>
                  r.expiry && !r.renewal ? (
                    <Button size="sm" variant={r.st.label === 'Expired' || r.st.label === 'Expiring soon' ? 'primary' : 'ghost'} icon={<RefreshCw size={13} />} onClick={() => openRenew(r.id)}>
                      Renew
                    </Button>
                  ) : r.renewal ? (
                    <FileChip name={r.renewal.file} />
                  ) : null,
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Company profile" actions={<Building2 size={16} className="text-slate-400" />} />
          <DescList
            cols={2}
            items={[
              { label: 'Vendor code', value: <Mono>{v.id}</Mono> },
              { label: 'Status', value: <PStatus s={v.status === 'Active' ? 'Valid' : v.status} /> },
              { label: 'NPWP', value: <Mono>{v.npwp}</Mono> },
              { label: 'PKP', value: v.pkp ? 'Yes' : 'No' },
              { label: 'Legal form', value: v.legalForm },
              { label: 'Registered since', value: date(v.since) },
            ]}
          />
          <div className="mt-4 text-xs text-slate-500">Address</div>
          <div className="text-sm text-slate-800">{v.address}</div>
          <div className="mt-3 text-xs text-slate-500">Bank account (verified)</div>
          <div className="text-sm text-slate-800">
            {v.bank.bank} · <Mono>{v.bank.account}</Mono>
            <div className="text-xs text-slate-500">{v.bank.holder}</div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Categories</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {v.categories.map((c) => (
              <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                {c}
              </span>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Vendor score (timeliness, quality, documents)</span>
              <span className="font-semibold">{v.score}/100</span>
            </div>
            <Progress value={v.score} tone={v.score >= 80 ? 'green' : 'amber'} className="mt-1.5" />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">To change bank details, upload a new bank reference letter — changes are verified by Petrolog finance before the next payment run.</p>
        </Card>
      </div>

      <Modal
        open={!!doc}
        onClose={() => setTarget(undefined)}
        title={`Renew — ${doc?.name ?? ''}`}
        footer={
          <>
            <Button onClick={() => setTarget(undefined)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>
              Submit for verification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Document number">
            <Input value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono" />
          </FormField>
          <FormField label="New expiry date" hint="Must be later than today (10 Mar 2028)">
            <Input type="date" min="2028-03-11" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </FormField>
          <FormField label="Scanned document (PDF)">
            <div className="flex flex-wrap items-center gap-2">
              {file && <FileChip name={file} />}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                <Paperclip size={14} /> Choose file
                <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0].name)} />
              </label>
              {!file && (
                <button className="text-xs text-slate-500 underline" onClick={() => setFile(`${doc?.file.replace('.pdf', '')}_renewed_2028.pdf`)}>
                  use sample
                </button>
              )}
            </div>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
