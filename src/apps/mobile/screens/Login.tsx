import { useState } from 'react'
import { Truck, Fingerprint, Loader2, ShieldCheck, CloudOff, KeyRound, ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { DRIVER_EMAIL } from '@/data/mobile'
import { BigButton } from '../kit'
import { useMobile } from '../store'

export default function Login() {
  const { signIn, conn } = useMobile()
  const [step, setStep] = useState<'start' | 'redirect' | 'idp' | 'verify'>('start')

  function begin() {
    setStep('redirect')
    window.setTimeout(() => setStep('idp'), conn === 'weak' ? 1200 : 650)
  }
  function verify() {
    setStep('verify')
    window.setTimeout(() => signIn(), 900)
  }

  if (step === 'idp' || step === 'verify') {
    return (
      <div className="flex min-h-full flex-col bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-3">
          <button aria-label="Back" onClick={() => setStep('start')} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-slate-100">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900 text-[13px] font-black text-brand-400">P</span>
            <span className="text-[15px] font-bold">Petrolog ID</span>
          </div>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={13} /> sso.petrolog.co.id
          </span>
        </div>
        <div className="flex-1 px-5 pt-6">
          <h1 className="text-[22px] font-extrabold">Choose your account</h1>
          <p className="mt-1 text-[14px] text-slate-600">One company identity for the field app, HRIS and back office. No separate app password.</p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-ink-900 bg-slate-50 p-4">
            <Avatar name="Eko Prasetya" size={48} />
            <div className="min-w-0">
              <div className="text-[17px] font-bold">Eko Prasetya</div>
              <div className="truncate text-[13px] text-slate-600">{DRIVER_EMAIL}</div>
              <div className="font-mono text-[12px] text-slate-500">EMP-0015 · Operations · Kutai</div>
            </div>
          </div>
          {conn === 'offline' && (
            <div className="mt-4 flex gap-2 rounded-xl bg-amber-100 px-3 py-2.5 text-[13px] font-semibold text-amber-900">
              <CloudOff size={17} className="mt-0.5 shrink-0" />
              No signal: unlocking the cached session on this device (last verified online 09 Mar 2028, 22:14). Session policy allows 12 h offline.
            </div>
          )}
          <div className="mt-6">
            <BigButton variant="dark" onClick={verify} disabled={step === 'verify'} icon={step === 'verify' ? <Loader2 className="animate-spin" /> : <Fingerprint />}>
              {step === 'verify' ? 'Verifying…' : 'Continue with fingerprint'}
            </BigButton>
            <button onClick={verify} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-slate-700 active:bg-slate-100">
              <KeyRound size={17} /> Use device PIN instead
            </button>
          </div>
        </div>
        <p className="px-5 pb-6 text-center text-[11px] text-slate-500">OIDC single sign-on · remote wipe enabled on this device · session valid 12 h</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-ink-900 px-6 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-400 text-ink-900 shadow-lg shadow-brand-400/20">
          <Truck size={42} strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 text-[28px] font-extrabold tracking-tight">Petrolog Field</h1>
        <p className="mt-2 max-w-[260px] text-[15px] text-slate-300">Assignments, proof of delivery, timesheet and fuel — works without signal.</p>
      </div>
      <div className="pb-8">
        <BigButton onClick={begin} disabled={step === 'redirect'} icon={step === 'redirect' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}>
          {step === 'redirect' ? 'Opening Petrolog ID…' : 'Sign in with Petrolog ID'}
        </BigButton>
        <p className="mt-4 text-center text-[12px] text-slate-400">Use your company account. Lost phone? Call IT (ext. 2270) — the device can be wiped remotely.</p>
        <p className="mt-6 text-center text-[11px] text-slate-500">v2.4.1 (318) · PT Petrolog Indah</p>
      </div>
    </div>
  )
}
