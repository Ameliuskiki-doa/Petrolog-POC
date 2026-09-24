import { useState } from 'react'
import { UserCog, ShieldCheck, KeyRound, Fingerprint, Plus, X, ShieldAlert, Link2 } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, Drawer, FormField, Grid, Mono, PageHeader, SearchInput, Select, Stat, StatusBadge, Tabs, cx,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { dateTime } from '@/lib/format'
import { businessLines, getEmployee, locations } from '@/data/core'
import { allRoles, appUsers, sodConflict, sodRules, type AppUser } from '@/data/platform'

type TabKey = 'users' | 'sod' | 'sso'

export default function Users() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('users')
  const [users, setUsers] = useState<AppUser[]>(appUsers)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<AppUser | null>(null)
  const [rejections, setRejections] = useState(3)

  const rows = users.filter((u) => !q || `${getEmployee(u.empId)?.name} ${u.email} ${u.roles.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const privileged = users.filter((u) => u.privileged)

  const update = (u: AppUser) => {
    setUsers((l) => l.map((x) => (x.id === u.id ? u : x)))
    setSel(u)
  }

  // Matrix roles: those that appear in any SoD rule
  const matrixRoles = [...new Set(sodRules.flatMap((r) => [r.a, r.b]))]

  return (
    <>
      <PageHeader
        module="Platform · Identity & Access Management"
        title="Users & Access"
        subtitle="Single sign-on through the central identity provider (OIDC), role-based access with data scoping by business line and location, MFA on privileged roles, and Segregation of Duties enforced at role assignment."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => toast('Users are created from the personnel master — a new joiner gets access once their role is assigned', 'info')}>Invite user</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Active users" value={users.filter((u) => u.status === 'Active').length + 118} sub="Back office 46 · field mobile 87" icon={<UserCog size={16} />} />
        <Stat label="Privileged users with MFA" value={`${privileged.filter((u) => u.mfa === 'Enforced').length}/${privileged.length}`} sub="Enforced for finance, admin, approvals" tone="good" icon={<Fingerprint size={16} />} />
        <Stat label="SSO coverage" value="100%" sub="Web, mobile app & vendor portal via one IdP" tone="good" icon={<KeyRound size={16} />} />
        <Stat label="SoD rejections (30 d)" value={rejections} sub={`${sodRules.length} conflict rules active`} tone="warn" icon={<ShieldAlert size={16} />} />
      </Grid>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[{ key: 'users', label: 'Users', count: users.length }, { key: 'sod', label: 'Segregation of Duties', count: sodRules.length }, { key: 'sso', label: 'SSO & MFA policy' }]}
      />

      {tab === 'users' && (
        <>
          <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Search name, e-mail, role…" className="w-full sm:w-80" /></div>
          <Card padded={false}>
            <DataTable
              rows={rows}
              rowKey={(u) => u.id}
              onRowClick={setSel}
              columns={[
                { key: 'n', header: 'User', render: (u) => <div className="min-w-[200px]"><div className="text-sm font-medium">{getEmployee(u.empId)?.name}</div><div className="text-xs text-slate-500">{u.email}</div></div> },
                { key: 'r', header: 'Roles', render: (u) => <div className="flex max-w-[320px] flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="blue">{r}</Badge>)}</div> },
                { key: 'bl', header: 'Business line scope', render: (u) => <span className="text-xs">{u.scopeBL.join(', ')}</span> },
                { key: 'loc', header: 'Location scope', render: (u) => <span className="block max-w-[180px] truncate text-xs" title={u.scopeLoc.join(', ')}>{u.scopeLoc.join(', ')}</span> },
                { key: 'mfa', header: 'MFA', render: (u) => <Badge tone={u.mfa === 'Enforced' ? 'green' : u.mfa === 'Enrolled' ? 'sky' : 'slate'}>{u.mfa}</Badge> },
                { key: 'sso', header: 'SSO', render: (u) => (u.sso ? <Badge tone="green">OIDC</Badge> : <Badge>Local</Badge>) },
                { key: 'l', header: 'Last login', render: (u) => <span className="text-xs text-slate-500">{dateTime(u.lastLogin)}</span> },
                { key: 's', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
              ]}
            />
          </Card>
        </>
      )}

      {tab === 'sod' && (
        <div className="space-y-4">
          <Callout tone="blue" icon={<ShieldCheck size={16} />} title="Rejected at the point of role assignment, not at transaction time">
            A user cannot hold two roles in a conflicting pair. Assigning the second role is refused and the attempt is written to the audit trail. Try it: open Maya Anggraini and add “Payment Approver”.
          </Callout>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card padded={false}>
              <div className="p-4 pb-2"><CardHeader title="Conflict rules" /></div>
              <DataTable
                dense
                rows={sodRules}
                rowKey={(r) => r.a + r.b}
                columns={[
                  { key: 'a', header: 'Role A', render: (r) => <Badge tone="blue">{r.a}</Badge> },
                  { key: 'x', header: '', render: () => <X size={13} className="text-red-500" /> },
                  { key: 'b', header: 'Role B', render: (r) => <Badge tone="blue">{r.b}</Badge> },
                  { key: 'r', header: 'Risk', render: (r) => <span className="text-xs text-slate-600">{r.risk}</span> },
                ]}
              />
            </Card>
            <Card>
              <CardHeader title="SoD matrix" subtitle="Red cell = combination prohibited" />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="text-[10px]">
                  <thead>
                    <tr>
                      <th />
                      {matrixRoles.map((r) => <th key={r} className="h-32 w-6 align-bottom"><div className="w-6 origin-bottom-left translate-x-3 -rotate-60 whitespace-nowrap text-left font-medium text-slate-500">{r}</div></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRoles.map((r) => (
                      <tr key={r}>
                        <td className="pr-2 text-right whitespace-nowrap text-slate-600">{r}</td>
                        {matrixRoles.map((c) => {
                          const bad = sodRules.some((x) => (x.a === r && x.b === c) || (x.b === r && x.a === c))
                          return <td key={c} className={cx('h-6 w-6 border border-white', r === c ? 'bg-slate-200' : bad ? 'bg-red-500' : 'bg-slate-50')} title={bad ? `${r} × ${c}: prohibited` : undefined} />
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'sso' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Identity provider" subtitle="One login across the platform, the field mobile app and the vendor portal" />
            <DescList cols={2} items={[
              { label: 'Protocol', value: 'OpenID Connect (authorization code + PKCE)' },
              { label: 'Provisioning', value: 'From the personnel master (MDM)' },
              { label: 'Issuer', value: <Mono>https://id.petrolog.co.id/realms/erp</Mono> },
              { label: 'Clients', value: 'erp-web · erp-mobile · vendor-portal (separate realm)' },
              { label: 'Account lifecycle', value: 'Follows employment status — leavers disabled the same day' },
              { label: 'Session', value: 'Web 8 h idle 30 min · mobile 14 days offline token' },
            ]} />
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><Link2 size={15} /> One company identity: the same sign-in covers the web platform, the field mobile app and the vendor portal.</div>
          </Card>
          <Card>
            <CardHeader title="MFA policy" />
            <DataTable
              dense
              rows={[
                { g: 'Privileged — finance, approvers above IDR 100 m, admins', m: 'Enforced (TOTP / push)', s: 'Every login + step-up on payment release' },
                { g: 'Back office — standard', m: 'Enrolled, risk-based', s: 'New device / new location' },
                { g: 'Field mobile (drivers, operators)', m: 'Device binding + PIN', s: 'Device registered by site admin' },
                { g: 'Vendor portal', m: 'E-mail OTP', s: 'Every login' },
              ]}
              rowKey={(r) => r.g}
              columns={[
                { key: 'g', header: 'User group', render: (r) => <span className="text-sm">{r.g}</span> },
                { key: 'm', header: 'Factor', render: (r) => <span className="text-xs">{r.m}</span> },
                { key: 's', header: 'Challenge', render: (r) => <span className="text-xs text-slate-600">{r.s}</span> },
              ]}
            />
          </Card>
        </div>
      )}

      <UserDrawer user={sel} onClose={() => setSel(null)} onChange={update} onReject={() => setRejections((n) => n + 1)} />
    </>
  )
}

function UserDrawer({ user, onClose, onChange, onReject }: { user: AppUser | null; onClose: () => void; onChange: (u: AppUser) => void; onReject: () => void }) {
  const toast = useToast()
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!user) return null
  const e = getEmployee(user.empId)
  const assign = () => {
    if (!role) return
    const c = sodConflict(user.roles, role)
    if (c) {
      const held = c.a === role ? c.b : c.a
      const msg = `Rejected: “${role}” conflicts with “${held}” already held by ${e?.name} (${c.risk}).`
      setError(msg)
      onReject()
      toast('Role assignment rejected — Segregation of Duties conflict', 'error')
      return
    }
    setError(null)
    onChange({ ...user, roles: [...user.roles, role] })
    setRole('')
    toast(`${role} assigned to ${e?.name} — change audit-logged`, 'success')
  }
  const toggleScope = (field: 'scopeBL' | 'scopeLoc', v: string) => {
    const cur = user[field]
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur.filter((x) => x !== 'All'), v]
    onChange({ ...user, [field]: next.length ? next : ['All'] })
  }
  return (
    <Drawer open onClose={() => { setError(null); onClose() }} title={e?.name ?? user.id} width="max-w-2xl">
      <DescList cols={2} items={[
        { label: 'E-mail', value: user.email },
        { label: 'Position', value: `${e?.position} · ${e?.location}` },
        { label: 'Status', value: <StatusBadge status={user.status} /> },
        { label: 'MFA', value: `${user.mfa}${user.privileged ? ' (privileged)' : ''}` },
      ]} />
      {user.status === 'Suspended' && <div className="mt-3"><Callout tone="orange" title="Mobile access suspended">Driving licence expired 20 Feb 2028 — access restored automatically when the renewal is recorded in Certifications.</Callout></div>}

      <h4 className="mt-5 mb-2 text-sm font-semibold">Roles</h4>
      <div className="flex flex-wrap gap-1.5">
        {user.roles.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 ring-1 ring-blue-200">
            {r}
            <button onClick={() => { onChange({ ...user, roles: user.roles.filter((x) => x !== r) }); toast(`${r} removed`, 'info') }} className="hover:text-blue-900"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <FormField label="Assign role">
          <Select value={role} onChange={(ev) => { setRole(ev.target.value); setError(null) }} className="w-64">
            <option value="">— select role —</option>
            {allRoles.filter((r) => !user.roles.includes(r)).map((r) => <option key={r}>{r}{sodConflict(user.roles, r) ? ' ⚠' : ''}</option>)}
          </Select>
        </FormField>
        <Button variant="primary" onClick={assign} disabled={!role}>Assign</Button>
      </div>
      {error && <div className="mt-3"><Callout tone="red" icon={<ShieldAlert size={16} />} title="Segregation of Duties violation">{error}</Callout></div>}

      <h4 className="mt-5 mb-2 text-sm font-semibold">Data scope — business line</h4>
      <div className="flex flex-wrap gap-1.5">
        {(['All', 'HL', 'PS', 'GS', 'CORP'] as const).map((b) => (
          <button key={b} onClick={() => (b === 'All' ? onChange({ ...user, scopeBL: ['All'] }) : toggleScope('scopeBL', b))} className={cx('rounded-md px-2 py-1 text-xs ring-1 ring-inset', user.scopeBL.includes(b) ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-slate-600 ring-slate-300')}>
            {b === 'All' ? 'All' : businessLines[b].short}
          </button>
        ))}
      </div>
      <h4 className="mt-4 mb-2 text-sm font-semibold">Data scope — location</h4>
      <div className="flex flex-wrap gap-1.5">
        {['All', ...locations].map((l) => (
          <button key={l} onClick={() => (l === 'All' ? onChange({ ...user, scopeLoc: ['All'] }) : toggleScope('scopeLoc', l))} className={cx('rounded-md px-2 py-1 text-xs ring-1 ring-inset', user.scopeLoc.includes(l) ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-slate-600 ring-slate-300')}>
            {l}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Scope is enforced by row-level security in the database — the same filter applies to screens, exports, BI and the SQL console.</p>
    </Drawer>
  )
}
