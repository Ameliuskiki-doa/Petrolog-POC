import { useState } from 'react'
import { Plug, Activity, Inbox, Smartphone, RotateCcw, FileCode2, ExternalLink, AlertTriangle, CheckCircle2, CircleSlash, PauseCircle } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, Mono, PageHeader, Stat, Tabs, cx } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { dateTime, num } from '@/lib/format'
import { ChartTooltip, GRID, SERIES, axisProps } from '@/lib/chart'
import { connectors, mobileDevices, outboxEvents, type Connector, type OutboxEvent } from '@/data/platform'

type TabKey = 'connectors' | 'outbox' | 'dlq' | 'mobile' | 'api'

const statusIcon = {
  Healthy: <CheckCircle2 size={14} className="text-emerald-600" />,
  Degraded: <AlertTriangle size={14} className="text-amber-600" />,
  Down: <CircleSlash size={14} className="text-red-600" />,
  Standby: <PauseCircle size={14} className="text-slate-400" />,
}
const statusTone = { Healthy: 'green', Degraded: 'amber', Down: 'red', Standby: 'slate' } as const
const evTone = { Delivered: 'green', Pending: 'slate', Retrying: 'amber', 'Dead-letter': 'red' } as const

const throughput = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, '0')}:00`,
  events: Math.round(2600 + 1900 * Math.sin(((h - 6) / 24) * Math.PI * 2) ** 2 + (h >= 6 && h <= 18 ? 2400 : 0) + ((h * 37) % 300)),
}))

export default function Integrations() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('connectors')
  const [events, setEvents] = useState<OutboxEvent[]>(outboxEvents)
  const [conns, setConns] = useState<Connector[]>(connectors)

  const dlq = events.filter((e) => e.status === 'Dead-letter')
  const retry = (e: OutboxEvent) => {
    setEvents((l) => l.map((x) => (x.id === e.id ? { ...x, status: e.error?.includes('SFTP') ? 'Retrying' : 'Delivered', attempts: x.attempts + 1 } : x)))
    toast(e.error?.includes('SFTP') ? `${e.id} re-queued — will deliver once the BNI host key is rotated` : `${e.id} redelivered to ${e.consumer} (idempotency key prevented a duplicate)`, e.error?.includes('SFTP') ? 'warning' : 'success')
  }

  return (
    <>
      <PageHeader
        module="Platform · Integration Layer & API Gateway"
        title="Integrations"
        subtitle="Connectors to external systems, the transactional outbox for inter-module events (ADR-03), dead-letter handling, mobile sync queue health and the API gateway."
        actions={<Button icon={<FileCode2 size={15} />} onClick={() => setTab('api')}>API documentation</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Connectors healthy" value={`${conns.filter((c) => c.status === 'Healthy').length}/${conns.filter((c) => c.status !== 'Standby').length}`} sub={`${conns.filter((c) => c.status === 'Down').length} down · ${conns.filter((c) => c.status === 'Degraded').length} degraded`} tone={conns.some((c) => c.status === 'Down') ? 'bad' : 'good'} icon={<Plug size={16} />} />
        <Stat label="Events (24 h)" value={num(throughput.reduce((a, t) => a + t.events, 0))} sub="Outbox → consumers · p95 latency 240 ms" icon={<Activity size={16} />} />
        <Stat label="Dead-letter queue" value={dlq.length} sub="Manual handling — no event lost" tone={dlq.length ? 'warn' : 'good'} icon={<Inbox size={16} />} />
        <Stat label="Mobile items pending sync" value={mobileDevices.reduce((a, d) => a + d.pending, 0)} sub={`${mobileDevices.filter((d) => d.status === 'Offline').length} devices offline · data held encrypted on device`} icon={<Smartphone size={16} />} />
      </Grid>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'connectors', label: 'Connectors', count: conns.length },
          { key: 'outbox', label: 'Outbox / event queue', count: events.length },
          { key: 'dlq', label: 'Dead-letter queue', count: dlq.length },
          { key: 'mobile', label: 'Mobile sync', count: mobileDevices.length },
          { key: 'api', label: 'API gateway' },
        ]}
      />

      {tab === 'connectors' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {conns.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">{statusIcon[c.status]}{c.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{c.system}</div>
                </div>
                <Badge tone={statusTone[c.status]} dot>{c.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2"><div className="num text-sm font-semibold">{num(c.throughput24h)}</div><div className="text-[10px] text-slate-500">msgs 24 h</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className={cx('num text-sm font-semibold', c.errors24h > 50 ? 'text-red-600' : c.errors24h ? 'text-amber-700' : '')}>{num(c.errors24h)}</div><div className="text-[10px] text-slate-500">errors</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="num text-sm font-semibold">{c.latencyMs ? `${num(c.latencyMs)} ms` : '—'}</div><div className="text-[10px] text-slate-500">latency</div></div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div><span className="text-slate-400">Direction</span> {c.direction} · {c.mechanism}</div>
                <div><span className="text-slate-400">Last sync</span> {dateTime(c.lastSync)} · <span className="text-slate-400">since</span> {c.since}</div>
                <div className="text-slate-500">{c.notes}</div>
              </div>
              {c.status !== 'Standby' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" icon={<RotateCcw size={13} />} onClick={() => { setConns((l) => l.map((x) => (x.id === c.id ? { ...x, lastSync: '2028-03-10T09:00' } : x))); toast(`${c.name}: manual sync triggered`, 'info') }}>Sync now</Button>
                  {c.status === 'Down' && <Button size="sm" variant="danger" onClick={() => toast('Incident opened with bank — on-call engineer paged', 'warning')}>Open incident</Button>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'outbox' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Event throughput — last 24 h" subtitle="Outbox rows committed in the same transaction as the business change, then relayed to consumers" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={throughput}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="hour" {...axisProps} interval={3} />
                <YAxis {...axisProps} width={44} />
                <Tooltip content={<ChartTooltip format={(v) => num(v)} />} />
                <Area type="monotone" dataKey="events" name="Events / hour" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card padded={false}>
            <EventTable rows={events} onRetry={retry} />
          </Card>
        </div>
      )}

      {tab === 'dlq' && (
        <div className="space-y-3">
          <Callout tone="amber" title="Dead-letter queue">Events that failed 8 attempts with exponential backoff are parked here for manual handling. Retrying is safe: consumers are idempotent on the event's idempotency key, so a redelivery never creates a duplicate transaction.</Callout>
          <Card padded={false}><EventTable rows={dlq} onRetry={retry} showError /></Card>
        </div>
      )}

      {tab === 'mobile' && (
        <div className="space-y-3">
          <Callout tone="blue">The mobile app works fully offline. Records are queued in encrypted local storage and delivered with retry until acknowledged — eventual consistency with a no-data-loss guarantee. Photos upload deferred when bandwidth allows.</Callout>
          <Card padded={false}>
            <DataTable
              rows={mobileDevices}
              rowKey={(d) => d.id}
              columns={[
                { key: 'd', header: 'Device', render: (d) => <Mono>{d.id}</Mono> },
                { key: 'u', header: 'User', render: (d) => <div><div className="text-sm">{d.user}</div><div className="text-xs text-slate-500">{d.site}</div></div> },
                { key: 'v', header: 'App', render: (d) => <Badge tone={d.appVersion === '2.8.1' ? 'slate' : 'amber'}>v{d.appVersion}</Badge> },
                { key: 'l', header: 'Last sync', render: (d) => <span className="text-xs">{dateTime(d.lastSync)}</span> },
                { key: 'p', header: 'Pending records', align: 'right', render: (d) => <span className={d.pending > 5 ? 'font-semibold text-amber-700' : ''}>{d.pending}</span> },
                { key: 'm', header: 'Pending media', align: 'right', render: (d) => d.pendingMedia },
                { key: 'b', header: 'Battery', align: 'right', render: (d) => <span className={d.battery < 25 ? 'text-red-600' : ''}>{d.battery}%</span> },
                { key: 's', header: 'Status', render: (d) => <Badge dot tone={d.status === 'Online' ? 'green' : d.status === 'Syncing' ? 'sky' : 'slate'}>{d.status}</Badge> },
                { key: 'x', header: '', render: (d) => d.status === 'Offline' && d.pending > 0 ? <Button size="sm" onClick={() => toast(`Push sent to ${d.user}: open app when in signal range`, 'info')}>Nudge</Button> : null },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'api' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="API gateway" subtitle="API-first: every function is exposed through versioned APIs" />
            <div className="space-y-3 text-sm">
              {[
                { t: 'REST', d: 'Transactional operations', url: 'https://api.petrolog.co.id/v1', spec: 'OpenAPI 3.1 — 412 operations' },
                { t: 'GraphQL', d: 'Aggregate queries & mobile consumption', url: 'https://api.petrolog.co.id/graphql', spec: 'Schema with 96 types, persisted queries' },
              ].map((a) => (
                <div key={a.t} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between"><span className="font-semibold">{a.t}</span><Badge tone="green" dot>Operational</Badge></div>
                  <div className="text-xs text-slate-500">{a.d}</div>
                  <div className="mt-1 font-mono text-[12px] text-slate-700">{a.url}</div>
                  <div className="mt-1 flex items-center justify-between text-xs"><span className="text-slate-500">{a.spec}</span>
                    <button className="flex items-center gap-1 text-brand-700 hover:underline" onClick={() => toast(`${a.t} documentation opened in developer portal`, 'info')}>Docs <ExternalLink size={11} /></button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">GraphSQL in the RFP is read as GraphQL (Deviation Register D-03).</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Policies" />
            <DataTable
              dense
              rows={[
                { k: 'Authentication', v: 'OAuth 2.0 client credentials (service) · OIDC (user)' },
                { k: 'Rate limit', v: '600 req/min per client · burst 100' },
                { k: 'Versioning', v: 'URI major version · 12-month deprecation notice' },
                { k: 'Idempotency', v: 'Idempotency-Key header on all POST' },
                { k: 'Input validation', v: 'Schema validation at gateway' },
                { k: 'Mobile', v: 'Certificate pinning · device-bound tokens' },
              ]}
              rowKey={(r) => r.k}
              columns={[{ key: 'k', header: 'Policy', render: (r) => <span className="text-sm font-medium">{r.k}</span> }, { key: 'v', header: 'Setting', render: (r) => <span className="text-xs text-slate-600">{r.v}</span> }]}
            />
            <pre className="scrollbar-thin mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{`GET /v1/projects/HL-2027-014/cost-lines?kind=ACTUAL&period=2028-02
Authorization: Bearer eyJhbGciOi…
→ 200 OK  { "items": [ … 1,284 lines ], "next": "…" }`}</pre>
          </Card>
        </div>
      )}
    </>
  )
}

function EventTable({ rows, onRetry, showError }: { rows: OutboxEvent[]; onRetry: (e: OutboxEvent) => void; showError?: boolean }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(e) => e.id}
      empty="Queue empty"
      columns={[
        { key: 'id', header: 'Event', render: (e) => <div><Mono>{e.id}</Mono><div className="text-xs text-slate-500">{dateTime(e.created)}</div></div> },
        { key: 't', header: 'Topic', render: (e) => <Mono className="text-slate-700">{e.topic}</Mono> },
        { key: 'a', header: 'Aggregate', render: (e) => <Mono>{e.aggregate}</Mono> },
        { key: 'c', header: 'Consumer', render: (e) => <span className="text-xs">{e.consumer}</span> },
        { key: 'n', header: 'Attempts', align: 'right', render: (e) => e.attempts },
        ...(showError ? [{ key: 'err', header: 'Last error', render: (e: OutboxEvent) => <span className="block max-w-[280px] text-xs text-red-700">{e.error}</span> }] : []),
        { key: 's', header: 'Status', render: (e) => <Badge dot tone={evTone[e.status]}>{e.status}</Badge> },
        { key: 'x', header: '', render: (e) => (e.status === 'Dead-letter' || e.status === 'Retrying' ? <Button size="sm" icon={<RotateCcw size={13} />} onClick={() => onRetry(e)}>Retry</Button> : null) },
      ]}
    />
  )
}
