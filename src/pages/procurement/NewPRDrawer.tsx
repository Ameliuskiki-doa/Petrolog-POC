import { useState } from 'react'
import { AlertOctagon, CheckCircle2, Plus, ShieldAlert, Trash2, Wand2 } from 'lucide-react'
import { Button, Callout, Drawer, FormField, Input, Select, cx } from '@/components/ui'
import { getProject } from '@/data/core'
import { budgetCheck, chargeableProjects, costCategories, prAmount, snapExceeds, type ApprovalStep, type CostCategory, type PRLine, type PurchaseRequisition } from '@/data/procurement'
import { idr, idrShort, TODAY_ISO } from '@/lib/format'
import { useToast, useRole } from '@/lib/app-state'
import { roles } from '@/data/core'
import { BudgetCheckRows } from './shared'
import { prStore } from './store'

const blank = (): PRLine => ({ desc: '', qty: 1, uom: 'pcs', price: 0, projectCode: '', category: 'Spare Parts' })

export default function NewPRDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast()
  const { role } = useRole()
  const [title, setTitle] = useState('')
  const [neededBy, setNeededBy] = useState('2028-03-24')
  const [justification, setJustification] = useState('')
  const [lines, setLines] = useState<PRLine[]>([blank()])
  const [tried, setTried] = useState(false)

  const setLine = (i: number, patch: Partial<PRLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const missingCode = lines.map((l, i) => (!l.projectCode ? i + 1 : 0)).filter(Boolean)
  const check = budgetCheck(lines.filter((l) => l.qty > 0 && l.price > 0))
  const exceeds = check.some(snapExceeds)
  const total = prAmount({ lines })

  const example = (kind: 'ok' | 'over') => {
    if (kind === 'ok') {
      setTitle('Hydraulic hoses & fittings — Pit 3 excavator')
      setJustification('Hose failure on EX-01 boom circuit; spares for next PM')
      setLines([
        { desc: 'Hydraulic hose assembly 1" 4SH', qty: 12, uom: 'pcs', price: 1_850_000, projectCode: 'HL-2027-014.01', category: 'Spare Parts' },
        { desc: 'JIC fitting kit', qty: 4, uom: 'kit', price: 950_000, projectCode: 'HL-2027-014.01', category: 'Spare Parts' },
      ])
    } else {
      setTitle('Additional lowbed trips — rig move loads 15–22')
      setJustification('Client re-sequenced loads; extra third-party lowbeds required')
      setLines([
        { desc: 'Third-party lowbed 60T with escort', qty: 8, uom: 'trip', price: 24_500_000, projectCode: 'HL-2028-002', category: 'Subcontract' },
        { desc: 'Rigging crew support', qty: 8, uom: 'shift', price: 6_200_000, projectCode: 'HL-2028-002', category: 'Subcontract' },
      ])
    }
    setTried(false)
  }

  const reset = () => {
    setTitle('')
    setJustification('')
    setLines([blank()])
    setTried(false)
  }

  const submit = () => {
    setTried(true)
    if (missingCode.length) {
      toast(`Rejected: project code is mandatory on every line (line ${missingCode.join(', ')} missing) — PROC-06`, 'error')
      return
    }
    if (!title.trim() || lines.some((l) => !l.desc.trim() || l.qty <= 0 || l.price <= 0)) {
      toast('Complete the title and every line (description, quantity, estimated price)', 'error')
      return
    }
    const existing = prStore.get()
    const n = Math.max(...existing.filter((p) => p.id.startsWith('PR-2028')).map((p) => Number(p.id.slice(-4)))) + 1
    const id = `PR-2028-${String(n).padStart(4, '0')}`
    const requesterId = roles[role]?.userId ?? 'EMP-0007'
    const pmId = getProject(lines[0].projectCode)?.pmId ?? 'EMP-0003'
    const approvals: ApprovalStep[] = [
      { step: 'Submitted — budget check run', approverId: requesterId, status: 'Approved', at: `${TODAY_ISO}T09:20`, comment: exceeds ? 'Budget check: exceeds remaining RAB → escalation' : 'Budget check: within remaining RAB' },
      { step: 'Project Manager', approverId: pmId, status: 'Pending' },
      ...(exceeds ? [{ step: 'Finance Director (budget escalation)', approverId: 'EMP-0002', status: 'Waiting' as const }] : []),
      { step: 'Procurement acceptance', approverId: 'EMP-0008', status: 'Waiting' },
    ]
    const pr: PurchaseRequisition = { id, date: TODAY_ISO, title: title.trim(), requesterId, neededBy, status: 'Pending Approval', lines, justification, escalated: exceeds, snapshot: check, snapshotAt: `${TODAY_ISO}T09:20`, approvals }
    prStore.set((s) => [pr, ...s])
    toast(exceeds ? `${id} submitted — exceeds remaining RAB, escalated to Finance Director` : `${id} submitted — within budget, routed to Project Manager`, exceeds ? 'warning' : 'success')
    reset()
    onClose()
    onCreated(id)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-5xl"
      title="New purchase requisition"
      footer={
        <>
          <span className="mr-auto hidden text-sm text-slate-600 sm:block">Total <b className="num">{idr(total)}</b></span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={exceeds ? 'danger' : 'primary'} onClick={submit}>{exceeds ? 'Submit with escalation' : 'Submit PR'}</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Wand2 size={14} /> Demo data:
        <button className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200" onClick={() => example('ok')}>Within budget</button>
        <button className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100" onClick={() => example('over')}>Over budget (HL-2028-002)</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2"><FormField label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is being requested" /></FormField></div>
        <FormField label="Needed by"><Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} /></FormField>
        <div className="sm:col-span-3"><FormField label="Justification"><Input value={justification} onChange={(e) => setJustification(e.target.value)} /></FormField></div>
      </div>

      <div className="mt-5 mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Lines <span className="font-normal text-slate-500">— project code mandatory on every line</span></div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setLines((l) => [...l, { ...blank(), projectCode: l[l.length - 1]?.projectCode ?? '' }])}>Add line</Button>
      </div>
      <div className="scrollbar-thin overflow-x-auto rounded-lg ring-1 ring-slate-200">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Project code *</th>
              <th className="px-2 py-2">Cost category</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2">UoM</th>
              <th className="px-2 py-2 text-right">Est. unit price</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const bad = tried && !l.projectCode
              return (
                <tr key={i} className={cx('border-t border-slate-100', bad && 'bg-red-50')}>
                  <td className="px-2 py-1.5 text-xs text-slate-500">{i + 1}</td>
                  <td className="px-2 py-1.5"><Input className="h-8 min-w-[200px]" value={l.desc} onChange={(e) => setLine(i, { desc: e.target.value })} placeholder="Item or service" /></td>
                  <td className="px-2 py-1.5">
                    <Select className={cx('h-8 w-44 font-mono text-xs', bad && 'border-red-500 ring-2 ring-red-200')} value={l.projectCode} onChange={(e) => setLine(i, { projectCode: e.target.value })}>
                      <option value="">— required —</option>
                      {chargeableProjects.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <Select className="h-8 w-36 text-xs" value={l.category} onChange={(e) => setLine(i, { category: e.target.value as CostCategory })}>
                      {costCategories.map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  </td>
                  <td className="px-2 py-1.5"><Input type="number" min={0} className="h-8 w-20 text-right" value={l.qty || ''} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} /></td>
                  <td className="px-2 py-1.5"><Input className="h-8 w-20" value={l.uom} onChange={(e) => setLine(i, { uom: e.target.value })} /></td>
                  <td className="px-2 py-1.5"><Input type="number" min={0} className="h-8 w-32 text-right" value={l.price || ''} onChange={(e) => setLine(i, { price: Number(e.target.value) })} /></td>
                  <td className="num px-2 py-1.5 text-right font-medium whitespace-nowrap">{idrShort(l.qty * l.price)}</td>
                  <td className="px-2 py-1.5">
                    <button disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {tried && missingCode.length > 0 && (
        <div className="mt-2">
          <Callout tone="red" icon={<ShieldAlert size={16} />} title="Submission blocked">
            Line {missingCode.join(', ')} has no project code. Every requisition line must carry a project code (PROC-06); costs that cannot be charged directly go to GEN-HO or GEN-BPN.
          </Callout>
        </div>
      )}

      <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">Live budget check against RAB</div>
            <div className="text-xs text-slate-500">Remaining = RAB − actuals − commitments, per project code and cost category (PROC-07). Recomputed as you type.</div>
          </div>
          {check.length > 0 &&
            (exceeds ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"><AlertOctagon size={14} />Exceeds RAB → escalation</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 size={14} />Within budget</span>
            ))}
        </div>
        {check.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Pick a project code and enter quantity and price to run the check.</div>
        ) : (
          <>
            <BudgetCheckRows rows={check} compact />
            <div className="mt-3 text-xs text-slate-600">
              Approval route: <b>Project Manager</b>
              {exceeds && <> → <b className="text-red-700">Finance Director (budget escalation)</b></>} → <b>Procurement</b>.
              {exceeds && ' Overspend is stopped here, before any commitment — not discovered after invoicing.'}
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
