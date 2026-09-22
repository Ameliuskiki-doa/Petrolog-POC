import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Camera, X, RotateCcw, Crosshair, Zap, Eraser, PenLine } from 'lucide-react'
import { cx } from '@/components/ui'
import type { Geo } from '@/data/mobile'
import { clock, fmtGeo } from './store'

// ─── Overlay host (full-screen layers inside the phone screen) ─────────────

const OverlayCtx = createContext<HTMLElement | null>(null)
export const OverlayProvider = OverlayCtx.Provider
export function PhoneOverlay({ children }: { children: ReactNode }) {
  const host = useContext(OverlayCtx)
  if (!host) return null
  return createPortal(children, host)
}

// ─── Simulated camera ───────────────────────────────────────────────────────

export type SceneKind = 'cargo' | 'pump' | 'hazard' | 'receipt'

function rand(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/** Paints a plausible photo for the demo and burns in timestamp + GPS, as the real app does. */
export function drawScene(kind: SceneKind, opts: { label: string; geo: Geo; time: string; value?: number; seed?: number }): string {
  const W = 480
  const H = 360
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return ''
  const r = rand(opts.seed ?? Math.floor(Math.random() * 100000) + 1)

  if (kind === 'cargo' || kind === 'hazard') {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.45)
    sky.addColorStop(0, '#8fb8d8')
    sky.addColorStop(1, '#dfe9ee')
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)
    // tree line
    g.fillStyle = '#3f5d3a'
    g.beginPath()
    g.moveTo(0, H * 0.45)
    for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.4 - r() * 22)
    g.lineTo(W, H * 0.47)
    g.closePath()
    g.fill()
    const ground = g.createLinearGradient(0, H * 0.45, 0, H)
    ground.addColorStop(0, '#a47d57')
    ground.addColorStop(1, '#6f4f33')
    g.fillStyle = ground
    g.fillRect(0, H * 0.45, W, H)
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(40,25,10,${r() * 0.25})`
      g.fillRect(r() * W, H * 0.45 + r() * H * 0.55, 2, 2)
    }
  }

  if (kind === 'cargo') {
    // dump body
    g.fillStyle = '#c8a21c'
    g.beginPath()
    g.moveTo(60, 170)
    g.lineTo(420, 170)
    g.lineTo(395, 300)
    g.lineTo(85, 300)
    g.closePath()
    g.fill()
    g.strokeStyle = '#8a6d0c'
    g.lineWidth = 4
    g.stroke()
    // coal heap
    g.fillStyle = '#1b1b1d'
    g.beginPath()
    g.moveTo(66, 176)
    for (let x = 66; x <= 414; x += 12) g.lineTo(x, 150 - Math.sin((x - 66) / 110) * 55 - r() * 14)
    g.lineTo(414, 176)
    g.closePath()
    g.fill()
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(120,120,130,${r() * 0.5})`
      g.fillRect(80 + r() * 320, 105 + r() * 70, 3, 2)
    }
    g.fillStyle = '#222'
    g.beginPath()
    g.arc(130, 312, 26, 0, Math.PI * 2)
    g.arc(350, 312, 26, 0, Math.PI * 2)
    g.fill()
  }

  if (kind === 'hazard') {
    g.fillStyle = '#3b2a1c'
    g.beginPath()
    g.ellipse(250, 270, 110, 34, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(120,150,170,0.55)'
    g.beginPath()
    g.ellipse(250, 272, 88, 22, 0, 0, Math.PI * 2)
    g.fill()
    for (const [x, y] of [
      [110, 250],
      [390, 245],
    ]) {
      g.fillStyle = '#f97316'
      g.beginPath()
      g.moveTo(x, y - 60)
      g.lineTo(x - 24, y)
      g.lineTo(x + 24, y)
      g.closePath()
      g.fill()
      g.fillStyle = '#fff'
      g.fillRect(x - 13, y - 34, 26, 8)
    }
  }

  if (kind === 'pump') {
    g.fillStyle = '#1f2937'
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#9ca3af'
    g.fillRect(70, 30, 340, 300)
    g.fillStyle = '#6b7280'
    g.fillRect(90, 50, 300, 190)
    g.fillStyle = '#0f2a12'
    g.fillRect(105, 70, 270, 70)
    g.fillRect(105, 155, 270, 60)
    g.fillStyle = '#6cff7a'
    g.font = 'bold 44px ui-monospace, Menlo, monospace'
    g.textAlign = 'right'
    g.fillText((opts.value ?? 0).toFixed(2), 360, 122)
    g.font = 'bold 30px ui-monospace, Menlo, monospace'
    g.fillText(Math.round((opts.value ?? 0) * 6800).toLocaleString('en-US'), 360, 197)
    g.fillStyle = '#d1d5db'
    g.textAlign = 'left'
    g.font = 'bold 13px sans-serif'
    g.fillText('LITRES', 112, 88)
    g.fillText('RUPIAH', 112, 172)
    g.fillStyle = '#dc2626'
    g.fillRect(110, 262, 260, 44)
    g.fillStyle = '#fff'
    g.font = 'bold 20px sans-serif'
    g.fillText('HSD / SOLAR  B40', 150, 291)
  }

  if (kind === 'receipt') {
    g.fillStyle = '#2b2f36'
    g.fillRect(0, 0, W, H)
    g.save()
    g.translate(240, 180)
    g.rotate(-0.06)
    g.fillStyle = '#fbfaf5'
    g.fillRect(-120, -160, 240, 320)
    g.fillStyle = '#222'
    g.textAlign = 'center'
    g.font = 'bold 15px ui-monospace, monospace'
    g.fillText('E-TOLL RECEIPT', 0, -125)
    g.font = '12px ui-monospace, monospace'
    const lines = ['GT SAMARINDA', 'GOL. IV', `10-03-2028 ${opts.time.slice(0, 5)}`, '-----------------------', `TARIF  Rp ${(opts.value ?? 0).toLocaleString('en-US')}`, '-----------------------', 'TERIMA KASIH']
    lines.forEach((l, i) => g.fillText(l, 0, -90 + i * 26))
    g.restore()
  }

  // burned-in evidence band
  g.fillStyle = 'rgba(0,0,0,0.62)'
  g.fillRect(0, H - 52, W, 52)
  g.fillStyle = '#fff'
  g.textAlign = 'left'
  g.font = 'bold 14px ui-monospace, Menlo, monospace'
  g.fillText(`10 Mar 2028 ${opts.time}  ${opts.label}`, 12, H - 30)
  g.font = '13px ui-monospace, Menlo, monospace'
  g.fillStyle = '#fcd34d'
  g.fillText(`GPS ${fmtGeo(opts.geo)} ±4 m  DT-01`, 12, H - 11)
  return c.toDataURL('image/jpeg', 0.72)
}

export function CameraCapture({
  kind,
  label,
  geo,
  value,
  photos,
  onChange,
  max = 3,
  cta = 'Take photo',
}: {
  kind: SceneKind
  label: string
  geo: Geo
  value?: number
  photos: string[]
  onChange: (p: string[]) => void
  max?: number
  cta?: string
}) {
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState(false)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000) + 1)
  const preview = open ? drawScene(kind, { label, geo, time: clock(true), value, seed }) : ''

  function shoot() {
    setFlash(true)
    const img = drawScene(kind, { label, geo, time: clock(true), value, seed })
    window.setTimeout(() => {
      setFlash(false)
      setOpen(false)
      onChange([...photos, img].slice(-max))
      setSeed(Math.floor(Math.random() * 100000) + 1)
    }, 260)
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-xl ring-2 ring-slate-200">
            <img src={p} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(photos.filter((_, k) => k !== i))}
              className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cx(
              'flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 text-slate-700 active:bg-slate-100',
              photos.length === 0 && 'col-span-3 aspect-auto py-6',
            )}
          >
            <Camera size={photos.length === 0 ? 30 : 22} />
            <span className="text-[13px] font-bold">{photos.length === 0 ? cta : 'Add'}</span>
          </button>
        )}
      </div>
      {open && (
        <PhoneOverlay>
          <div className="absolute inset-0 z-[60] flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <button aria-label="Close camera" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <X size={22} />
              </button>
              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold">
                <Crosshair size={14} className="text-emerald-400" /> GPS lock ±4 m
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <Zap size={18} className="text-brand-300" />
              </div>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-2">
              <div className="relative w-full overflow-hidden rounded-lg">
                <img src={preview} alt="Viewfinder" className="w-full" />
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/15" />
                  ))}
                </div>
                {flash && <div className="absolute inset-0 animate-pulse bg-white" />}
              </div>
            </div>
            <div className="px-4 pb-2 text-center text-[12px] text-slate-300">{label} · timestamp & coordinates are burned into the image</div>
            <div className="flex items-center justify-around px-6 pt-2 pb-6">
              <button aria-label="Reframe" onClick={() => setSeed(Math.floor(Math.random() * 100000) + 1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <RotateCcw size={20} />
              </button>
              <button aria-label="Shutter" onClick={shoot} className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white">
                <span className="h-[60px] w-[60px] rounded-full bg-white active:bg-slate-300" />
              </button>
              <div className="h-12 w-12" />
            </div>
          </div>
        </PhoneOverlay>
      )}
    </div>
  )
}

// ─── Signature pad (real pointer drawing) ──────────────────────────────────

export function SignaturePad({ onChange, name }: { onChange: (dataUrl: string | null) => void; name?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * ratio
    c.height = rect.height * ratio
    const g = c.getContext('2d')
    if (!g) return
    g.scale(ratio, ratio)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.strokeStyle = '#0b1f4d'
    g.lineWidth = 2.6
  }, [])

  function pos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function down(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = pos(e)
    const g = e.currentTarget.getContext('2d')
    if (g && last.current) {
      g.beginPath()
      g.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2)
      g.fillStyle = '#0b1f4d'
      g.fill()
    }
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const g = e.currentTarget.getContext('2d')
    const p = pos(e)
    if (g && last.current) {
      const pressure = e.pressure && e.pressure !== 0.5 ? e.pressure : 0.6
      g.lineWidth = 1.6 + pressure * 2
      g.beginPath()
      g.moveTo(last.current.x, last.current.y)
      g.lineTo(p.x, p.y)
      g.stroke()
    }
    last.current = p
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    setEmpty(false)
    onChange(ref.current?.toDataURL('image/png') ?? null)
  }
  function clear() {
    const c = ref.current
    const g = c?.getContext('2d')
    if (c && g) {
      g.save()
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, c.width, c.height)
      g.restore()
    }
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 bg-white">
        <canvas
          ref={ref}
          className="block h-44 w-full cursor-crosshair touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        <div className="pointer-events-none absolute right-4 bottom-9 left-4 border-b-2 border-dashed border-slate-300" />
        <div className="pointer-events-none absolute bottom-2 left-4 text-[11px] font-semibold text-slate-400">{name ? `Signed by ${name}` : 'Recipient signature'}</div>
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-[14px] font-semibold text-slate-400">
            <PenLine size={18} /> Hand the phone to the recipient to sign here
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-end">
        <button type="button" onClick={clear} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold text-slate-600 active:bg-slate-100">
          <Eraser size={15} /> Clear
        </button>
      </div>
    </div>
  )
}
