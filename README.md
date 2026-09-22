# Petrolog ERP — Clickable Prototype

Clickable prototype of the integrated operations platform proposed in the Package A Technical Bid
(RFP-IT-PI-072026/001, PT Petrolog Indah). Dummy data only, no backend.

- **Back office**: `/` — role-based dashboards (switch role top-right), 16 modules + platform components
- **Field mobile app**: `/mobile` — offline-first driver app in a phone frame
- **Vendor portal**: `/portal`

The demo is staged on **10 March 2028**: Stage 1A modules live since Q2 2027, Stage 1B finance cut-over
completed on 1 January 2028 (SAP Business One read-only). The dashboard's *Guided demo* card walks one
project code (HL-2027-014) through every domain.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

Framework preset **Vite** (auto-detected). Build command `npm run build`, output `dist`.
`vercel.json` rewrites all paths to `index.html` so deep links such as `/projects/HL-2027-014` work.

```bash
npx vercel        # preview
npx vercel --prod # production
```

## Structure

| Path | Content |
|---|---|
| `src/data/core.ts` | Shared master data (project codes, contracts, units, vendors, jobs, POs) |
| `src/components/ui.tsx` | Design system |
| `src/pages/<domain>/` | Back-office screens per domain |
| `src/apps/mobile`, `src/apps/portal` | Mobile app and vendor portal |
| `src/nav.ts` | Sidebar menu |
