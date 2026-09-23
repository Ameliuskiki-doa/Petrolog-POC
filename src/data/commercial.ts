/**
 * Commercial data — M1 Business Development & CRM, M2 Contract Management.
 * IDs line up with core.ts: won opportunities point at contracts & project codes that exist there.
 */
import type { BusinessLine } from './core'

// ─── Opportunities ────────────────────────────────────────────────────────────
export type OppStage = 'Lead' | 'Qualified' | 'Review' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
export const oppStages: OppStage[] = ['Lead', 'Qualified', 'Review', 'Proposal', 'Negotiation', 'Won', 'Lost']
export const defaultProbability: Record<OppStage, number> = { Lead: 10, Qualified: 25, Review: 40, Proposal: 55, Negotiation: 70, Won: 100, Lost: 0 }

export type ReviewTrack = 'Legal' | 'Commercial' | 'Technical'
export type ReviewStatus = 'Not started' | 'In Review' | 'Approved' | 'Approved with conditions' | 'Rejected'

export interface TrackReview {
  track: ReviewTrack
  reviewerId: string
  slaDays: number
  startedAt?: string
  completedAt?: string
  status: ReviewStatus
  checklist: { item: string; done: boolean }[]
  comments: { by: string; at: string; text: string }[]
}

export interface ProposalVersion {
  version: string
  date: string
  status: 'Draft' | 'Submitted' | 'Clarification' | 'Superseded' | 'Accepted'
  ownerId: string
  deadline: string
  note: string
  file: string
}

export interface Opportunity {
  id: string
  title: string
  customerId: string
  businessLine: BusinessLine
  stage: OppStage
  value: number
  probability: number
  ownerId: string
  source: 'Tender invitation' | 'Direct negotiation' | 'Existing client extension' | 'Referral'
  created: string
  stageSince: string
  expectedClose: string
  tenderId?: string
  contractId?: string
  projectCode?: string
  lossReason?: string
  competitors?: string[]
  /** Project codes used as the historical basis for the cost estimate */
  comparables: string[]
  reviews: TrackReview[]
  proposals: ProposalVersion[]
}

export const checklistItems: Record<ReviewTrack, string[]> = {
  Legal: ['Contract form & liability cap reviewed', 'Indemnity and liquidated damages acceptable', 'Insurance requirements achievable', 'Bid bond / performance bond wording checked'],
  Commercial: ['Payment terms & retention reviewed', 'Margin at or above business-line threshold', 'Cash-flow profile & working capital', 'Price escalation / FX exposure'],
  Technical: ['Scope & method statement feasible', 'Fleet & equipment availability confirmed', 'Manpower & SIO / licence coverage', 'HSE requirements (SMK3, CSMS) met'],
}

const reviewers: Record<ReviewTrack, string> = { Legal: 'EMP-0028', Commercial: 'EMP-0002', Technical: 'EMP-0003' }
const sla: Record<ReviewTrack, number> = { Legal: 5, Commercial: 3, Technical: 5 }

function doneReviews(start: string, end: string, techReviewer = 'EMP-0003', conditions?: Partial<Record<ReviewTrack, string>>): TrackReview[] {
  return (['Legal', 'Commercial', 'Technical'] as ReviewTrack[]).map((t) => ({
    track: t,
    reviewerId: t === 'Technical' ? techReviewer : reviewers[t],
    slaDays: sla[t],
    startedAt: start,
    completedAt: end,
    status: conditions?.[t] ? 'Approved with conditions' : 'Approved',
    checklist: checklistItems[t].map((item) => ({ item, done: true })),
    comments: conditions?.[t] ? [{ by: t === 'Technical' ? techReviewer : reviewers[t], at: end + 'T15:20', text: conditions[t]! }] : [],
  }))
}

function pendingReviews(): TrackReview[] {
  return (['Legal', 'Commercial', 'Technical'] as ReviewTrack[]).map((t) => ({
    track: t,
    reviewerId: reviewers[t],
    slaDays: sla[t],
    status: 'Not started',
    checklist: checklistItems[t].map((item) => ({ item, done: false })),
    comments: [],
  }))
}

export const opportunities: Opportunity[] = [
  {
    id: 'OPP-2028-017', title: 'Coal Hauling Extension — Pit 4 Ramp & Overburden', customerId: 'CUS-001', businessLine: 'HL', stage: 'Won', value: 11_400_000_000, probability: 100,
    ownerId: 'EMP-0011', source: 'Existing client extension', created: '2028-01-09', stageSince: '2028-03-05', expectedClose: '2028-03-05',
    competitors: ['PT Borneo Haul Perkasa'], comparables: ['HL-2027-014'],
    reviews: doneReviews('2028-02-12', '2028-02-16', 'EMP-0003', { Commercial: 'Rate must follow the fuel-price clause used in CTR-2027-011; review quarterly.' }),
    proposals: [
      { version: 'v1', date: '2028-02-20', status: 'Superseded', ownerId: 'EMP-0011', deadline: '2028-02-22', note: 'Hauling Pit 4 ramp + overburden, IDR 12.1 bn over 14 months', file: 'Pit4-Haul_Proposal_v1.pdf' },
      { version: 'v2 (BAFO)', date: '2028-03-01', status: 'Accepted', ownerId: 'EMP-0011', deadline: '2028-03-03', note: 'Best and final offer IDR 11.4 bn — tonnage rate IDR 51,200, 30-day term', file: 'Pit4-Haul_BAFO_v2.pdf' },
    ],
  },
  {
    id: 'OPP-2027-044', title: 'Produced Water Treatment Skid — Design & Build', customerId: 'CUS-004', businessLine: 'GS', stage: 'Won', value: 16_900_000_000, probability: 100,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2027-08-14', stageSince: '2028-02-22', expectedClose: '2028-02-22', tenderId: 'TDR-2027-019',
    contractId: 'CTR-2028-004', projectCode: 'GS-2028-001', competitors: ['PT Tirta Rekayasa Nusantara', 'PT Envirotek Solusi'], comparables: ['GS-2027-008'],
    reviews: doneReviews('2027-10-02', '2027-10-06', 'EMP-0005', { Commercial: 'Accept 60-day term only with 30% down payment on equipment milestone.' }),
    proposals: [
      { version: 'v1', date: '2027-10-20', status: 'Superseded', ownerId: 'EMP-0011', deadline: '2027-10-23', note: 'Technical & commercial proposal, IDR 17.8 bn', file: 'PWT-Skid_Proposal_v1.pdf' },
      { version: 'v2', date: '2027-12-08', status: 'Superseded', ownerId: 'EMP-0011', deadline: '2027-12-10', note: 'Revised after clarification round — membrane vendor alternative', file: 'PWT-Skid_Proposal_v2.pdf' },
      { version: 'v3 (BAFO)', date: '2028-01-26', status: 'Accepted', ownerId: 'EMP-0011', deadline: '2028-01-29', note: 'Best and final offer IDR 16.9 bn, 60-day term with 10% retention', file: 'PWT-Skid_BAFO_v3.pdf' },
    ],
  },
  {
    id: 'OPP-2027-038', title: 'Rig Move & Equipment Mobilisation — Well Pad K-7', customerId: 'CUS-005', businessLine: 'HL', stage: 'Won', value: 7_200_000_000, probability: 100,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2027-07-03', stageSince: '2028-01-18', expectedClose: '2028-01-18', tenderId: 'TDR-2027-015',
    contractId: 'CTR-2028-002', projectCode: 'HL-2028-002', competitors: ['PT Geo Logistik Pratama'], comparables: ['HL-2027-021', 'HL-2027-014'],
    reviews: doneReviews('2027-09-11', '2027-09-15'),
    proposals: [
      { version: 'v1', date: '2027-10-05', status: 'Superseded', ownerId: 'EMP-0011', deadline: '2027-10-06', note: 'Lump-sum rig move + per-trip lowbed', file: 'K7-RigMove_Proposal_v1.pdf' },
      { version: 'v2', date: '2027-12-14', status: 'Accepted', ownerId: 'EMP-0011', deadline: '2027-12-15', note: 'Negotiated lowbed rate IDR 22.5 m per trip', file: 'K7-RigMove_Proposal_v2.pdf' },
    ],
  },
  {
    id: 'OPP-2028-003', title: 'Catalyst Change-out — Hydrocracker Turnaround 2028', customerId: 'CUS-002', businessLine: 'PS', stage: 'Negotiation', value: 18_400_000_000, probability: 70,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2027-11-20', stageSince: '2028-02-28', expectedClose: '2028-04-10', tenderId: 'TDR-2028-004',
    competitors: ['PT Katalis Nusantara Jaya', 'Eurocat Services Asia'], comparables: ['PS-2028-003', 'PS-2027-017'],
    reviews: doneReviews('2028-01-08', '2028-01-12', 'EMP-0004', { Legal: 'LD cap at 10% of contract value agreed; client form accepted.' }),
    proposals: [
      { version: 'v1', date: '2028-02-19', status: 'Superseded', ownerId: 'EMP-0011', deadline: '2028-02-20', note: 'Technical & price proposal IDR 19.2 bn', file: 'HCU-TA_Proposal_v1.pdf' },
      { version: 'v2', date: '2028-03-07', status: 'Clarification', ownerId: 'EMP-0011', deadline: '2028-03-14', note: 'Revised price IDR 18.4 bn after negotiation round 1; clarification on N2 standby', file: 'HCU-TA_Proposal_v2.pdf' },
    ],
  },
  {
    id: 'OPP-2028-005', title: 'Coal Hauling Extension — Kutai Pit 4', customerId: 'CUS-001', businessLine: 'HL', stage: 'Proposal', value: 42_000_000_000, probability: 55,
    ownerId: 'EMP-0011', source: 'Existing client extension', created: '2028-01-09', stageSince: '2028-02-19', expectedClose: '2028-05-15',
    competitors: ['PT Borneo Haul Sejahtera'], comparables: ['HL-2027-014', 'HL-2027-014.01'],
    reviews: doneReviews('2028-02-05', '2028-02-09', 'EMP-0003', { Technical: 'Requires 6 additional DT 40T — fleet plan to confirm rental vs purchase.' }),
    proposals: [
      { version: 'v1', date: '2028-03-04', status: 'Submitted', ownerId: 'EMP-0011', deadline: '2028-03-06', note: 'Rate IDR 49,800 per tonne, 18-month term, 2.4 Mt volume', file: 'Pit4-Hauling_Proposal_v1.pdf' },
    ],
  },
  {
    id: 'OPP-2028-007', title: 'Heavy Lift & Transport — Ammonia Plant Revamp', customerId: 'CUS-006', businessLine: 'HL', stage: 'Review', value: 11_600_000_000, probability: 40,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2028-02-06', stageSince: '2028-03-03', expectedClose: '2028-05-30', tenderId: 'TDR-2028-006',
    competitors: ['PT Mammoet Indonesia', 'PT Angkat Berat Nusantara'], comparables: ['HL-2027-021', 'HL-2027-014.02'],
    reviews: [
      {
        track: 'Legal', reviewerId: 'EMP-0028', slaDays: 5, startedAt: '2028-03-03', completedAt: '2028-03-06', status: 'Approved',
        checklist: checklistItems.Legal.map((item) => ({ item, done: true })),
        comments: [{ by: 'EMP-0028', at: '2028-03-06T10:42', text: 'Client GTC acceptable. Consequential loss excluded; liability cap 100% of contract value.' }],
      },
      {
        track: 'Commercial', reviewerId: 'EMP-0002', slaDays: 3, startedAt: '2028-03-08', status: 'In Review',
        checklist: checklistItems.Commercial.map((item, i) => ({ item, done: i < 2 })),
        comments: [{ by: 'EMP-0002', at: '2028-03-09T16:05', text: 'Margin 21.4% on draft estimate is fine; waiting for crane rental quote before confirming cash-flow.' }],
      },
      {
        track: 'Technical', reviewerId: 'EMP-0003', slaDays: 5, startedAt: '2028-03-03', status: 'In Review',
        checklist: checklistItems.Technical.map((item, i) => ({ item, done: i === 0 || i === 3 })),
        comments: [
          { by: 'EMP-0003', at: '2028-03-05T09:10', text: 'Lift plan for 420T reformer needs a 600T crawler — not in our fleet. Rental options requested.' },
          { by: 'EMP-0010', at: '2028-03-07T14:30', text: 'Client CSMS requires SMK3 gold certificate — ours valid to Nov 2028. OK.' },
        ],
      },
    ],
    proposals: [
      { version: 'v0 (draft)', date: '2028-03-08', status: 'Draft', ownerId: 'EMP-0011', deadline: '2028-03-24', note: 'Method statement & lift plan in preparation', file: 'Ammonia-HL_Proposal_draft.docx' },
    ],
  },
  {
    id: 'OPP-2028-015', title: 'Catalyst Screening & Sock Loading — Reformer', customerId: 'CUS-006', businessLine: 'PS', stage: 'Review', value: 5_600_000_000, probability: 35,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2028-02-20', stageSince: '2028-03-07', expectedClose: '2028-05-05', tenderId: 'TDR-2028-009',
    competitors: ['PT Katalis Prima Service'], comparables: ['PS-2028-003'],
    reviews: [
      { track: 'Legal', reviewerId: 'EMP-0028', slaDays: 5, startedAt: '2028-03-07', status: 'In Review', checklist: checklistItems.Legal.map((item, i) => ({ item, done: i < 1 })), comments: [] },
      { track: 'Commercial', reviewerId: 'EMP-0002', slaDays: 3, startedAt: '2028-03-07', completedAt: '2028-03-09', status: 'Approved', checklist: checklistItems.Commercial.map((item) => ({ item, done: true })), comments: [{ by: 'EMP-0002', at: '2028-03-09T11:00', text: 'Fits PS margin threshold; 45-day terms consistent with client history.' }] },
      { track: 'Technical', reviewerId: 'EMP-0004', slaDays: 5, startedAt: '2028-03-07', status: 'In Review', checklist: checklistItems.Technical.map((item, i) => ({ item, done: i < 2 })), comments: [] },
    ],
    proposals: [{ version: 'v0 (draft)', date: '2028-03-09', status: 'Draft', ownerId: 'EMP-0011', deadline: '2028-04-02', note: 'Scope clarification pending', file: 'Reformer-Sock_Proposal_draft.docx' }],
  },
  {
    id: 'OPP-2028-009', title: 'Wastewater ZLD Feasibility & FEED', customerId: 'CUS-007', businessLine: 'GS', stage: 'Qualified', value: 4_800_000_000, probability: 25,
    ownerId: 'EMP-0005', source: 'Direct negotiation', created: '2028-01-24', stageSince: '2028-02-12', expectedClose: '2028-06-30', comparables: ['GS-2027-008'],
    reviews: pendingReviews(), proposals: [],
  },
  {
    id: 'OPP-2028-011', title: 'Boiler Tube Replacement — Units 1 & 2', customerId: 'CUS-007', businessLine: 'PS', stage: 'Qualified', value: 9_300_000_000, probability: 25,
    ownerId: 'EMP-0004', source: 'Referral', created: '2027-12-18', stageSince: '2028-01-15', expectedClose: '2028-06-15', comparables: ['PS-2027-017'],
    reviews: pendingReviews(), proposals: [],
  },
  {
    id: 'OPP-2028-012', title: 'Geothermal Well Pad Civil & Rig Move Support', customerId: 'CUS-005', businessLine: 'HL', stage: 'Lead', value: 6_500_000_000, probability: 10,
    ownerId: 'EMP-0011', source: 'Existing client extension', created: '2028-02-27', stageSince: '2028-02-27', expectedClose: '2028-08-31', comparables: ['HL-2028-002'],
    reviews: pendingReviews(), proposals: [],
  },
  {
    id: 'OPP-2028-014', title: 'Sulfur Recovery Unit — Catalyst Handling', customerId: 'CUS-003', businessLine: 'PS', stage: 'Lead', value: 3_900_000_000, probability: 10,
    ownerId: 'EMP-0004', source: 'Tender invitation', created: '2028-03-01', stageSince: '2028-03-01', expectedClose: '2028-07-20', tenderId: 'TDR-2028-008', comparables: ['PS-2028-003'],
    reviews: pendingReviews(), proposals: [],
  },
  {
    id: 'OPP-2027-041', title: 'Cooling Water Chemical Treatment — 3-year Service', customerId: 'CUS-004', businessLine: 'GS', stage: 'Lost', value: 8_700_000_000, probability: 0,
    ownerId: 'EMP-0005', source: 'Tender invitation', created: '2027-09-02', stageSince: '2028-01-30', expectedClose: '2028-01-30', tenderId: 'TDR-2027-022',
    competitors: ['PT Kimia Tirta Utama'], comparables: ['GS-2027-008'],
    lossReason: 'Price — our offer was 11.8% above the winning bid (PT Kimia Tirta Utama). Client weighting 70% price / 30% technical; our technical score ranked first.',
    reviews: doneReviews('2027-10-11', '2027-10-16', 'EMP-0005'),
    proposals: [
      { version: 'v1', date: '2027-11-14', status: 'Submitted', ownerId: 'EMP-0005', deadline: '2027-11-15', note: 'IDR 8.7 bn, 36 months', file: 'CW-Chem_Proposal_v1.pdf' },
    ],
  },
  {
    id: 'OPP-2027-036', title: 'Module Transport — LNG Train Refurbishment', customerId: 'CUS-003', businessLine: 'HL', stage: 'Lost', value: 14_200_000_000, probability: 0,
    ownerId: 'EMP-0011', source: 'Tender invitation', created: '2027-06-19', stageSince: '2027-12-15', expectedClose: '2027-12-15', tenderId: 'TDR-2027-017',
    competitors: ['PT Mammoet Indonesia'], comparables: ['HL-2027-021'],
    lossReason: 'Technical — client required a 24-axle SPMT line in one lift; our 6-axle lines needed coupling and a second mobilisation. Consider a rental partnership for future bids.',
    reviews: doneReviews('2027-08-20', '2027-08-26', 'EMP-0003', { Technical: 'SPMT capacity marginal — propose coupled lines with third-party engineering check.' }),
    proposals: [
      { version: 'v1', date: '2027-10-02', status: 'Submitted', ownerId: 'EMP-0011', deadline: '2027-10-03', note: 'Coupled 6-axle SPMT solution', file: 'LNG-Module_Proposal_v1.pdf' },
    ],
  },
]

// ─── Tenders & bid bonds ──────────────────────────────────────────────────────
export type TenderStatus = 'Announced' | 'Prequalification' | 'Open' | 'Submitted' | 'Evaluation' | 'Won' | 'Lost' | 'Cancelled'

export interface Tender {
  id: string
  title: string
  customerId: string
  businessLine: BusinessLine
  opportunityId?: string
  status: TenderStatus
  clientRef: string
  schedule: { label: string; date: string }[]
  submission: string
  documents: { name: string; version: string; date: string; kind: 'RFP' | 'Addendum' | 'Our submission' | 'Clarification' | 'Result' }[]
  outcome?: string
}

export const tenders: Tender[] = [
  {
    id: 'TDR-2027-019', title: 'Produced Water Treatment Skid — Design & Build', customerId: 'CUS-004', businessLine: 'GS', opportunityId: 'OPP-2027-044', status: 'Won', clientRef: 'SPC/PROC/2027/0931',
    schedule: [{ label: 'Announcement', date: '2027-09-18' }, { label: 'Pre-bid clarification', date: '2027-10-04' }, { label: 'Submission', date: '2027-10-23' }, { label: 'Opening', date: '2027-10-24' }, { label: 'BAFO', date: '2028-01-29' }, { label: 'Award', date: '2028-02-22' }],
    submission: '2027-10-23',
    documents: [
      { name: 'RFP & ITB package', version: 'Rev 0', date: '2027-09-18', kind: 'RFP' },
      { name: 'Addendum 1 — membrane specification', version: 'Rev 1', date: '2027-10-09', kind: 'Addendum' },
      { name: 'Technical & commercial proposal', version: 'v3 BAFO', date: '2028-01-26', kind: 'Our submission' },
      { name: 'Letter of award', version: '—', date: '2028-02-22', kind: 'Result' },
    ],
    outcome: 'Awarded at IDR 16.9 bn — contract CTR-2028-004 registered',
  },
  {
    id: 'TDR-2027-015', title: 'Rig Move & Equipment Mobilisation — Well Pad K-7', customerId: 'CUS-005', businessLine: 'HL', opportunityId: 'OPP-2027-038', status: 'Won', clientRef: 'JGE/SCM/T-2027-114',
    schedule: [{ label: 'Announcement', date: '2027-08-21' }, { label: 'Pre-bid clarification', date: '2027-09-05' }, { label: 'Submission', date: '2027-10-06' }, { label: 'Opening', date: '2027-10-06' }, { label: 'Award', date: '2028-01-18' }],
    submission: '2027-10-06',
    documents: [
      { name: 'Tender document', version: 'Rev 0', date: '2027-08-21', kind: 'RFP' },
      { name: 'Technical & price proposal', version: 'v2', date: '2027-12-14', kind: 'Our submission' },
      { name: 'Letter of award', version: '—', date: '2028-01-18', kind: 'Result' },
    ],
    outcome: 'Awarded at IDR 7.2 bn — contract CTR-2028-002',
  },
  {
    id: 'TDR-2027-017', title: 'Module Transport — LNG Train Refurbishment', customerId: 'CUS-003', businessLine: 'HL', opportunityId: 'OPP-2027-036', status: 'Lost', clientRef: 'MGP/CT/2027/0412',
    schedule: [{ label: 'Announcement', date: '2027-07-10' }, { label: 'Pre-bid clarification', date: '2027-07-28' }, { label: 'Submission', date: '2027-10-03' }, { label: 'Opening', date: '2027-10-04' }, { label: 'Award', date: '2027-12-15' }],
    submission: '2027-10-03',
    documents: [
      { name: 'Tender document', version: 'Rev 0', date: '2027-07-10', kind: 'RFP' },
      { name: 'Technical & price proposal', version: 'v1', date: '2027-10-02', kind: 'Our submission' },
      { name: 'Tender result notice', version: '—', date: '2027-12-15', kind: 'Result' },
    ],
    outcome: 'Lost on technical grounds (SPMT capacity)',
  },
  {
    id: 'TDR-2027-022', title: 'Cooling Water Chemical Treatment — 3-year Service', customerId: 'CUS-004', businessLine: 'GS', opportunityId: 'OPP-2027-041', status: 'Lost', clientRef: 'SPC/PROC/2027/1107',
    schedule: [{ label: 'Announcement', date: '2027-10-02' }, { label: 'Pre-bid clarification', date: '2027-10-18' }, { label: 'Submission', date: '2027-11-15' }, { label: 'Opening', date: '2027-11-16' }, { label: 'Award', date: '2028-01-30' }],
    submission: '2027-11-15',
    documents: [
      { name: 'RFP package', version: 'Rev 0', date: '2027-10-02', kind: 'RFP' },
      { name: 'Price & technical proposal', version: 'v1', date: '2027-11-14', kind: 'Our submission' },
      { name: 'Tender result notice', version: '—', date: '2028-01-30', kind: 'Result' },
    ],
    outcome: 'Lost on price (11.8% above winner)',
  },
  {
    id: 'TDR-2028-004', title: 'Catalyst Change-out — Hydrocracker Turnaround 2028', customerId: 'CUS-002', businessLine: 'PS', opportunityId: 'OPP-2028-003', status: 'Evaluation', clientRef: 'PRU/CLP/TA-HCU/2028',
    schedule: [{ label: 'Announcement', date: '2027-12-04' }, { label: 'Pre-bid clarification', date: '2027-12-19' }, { label: 'Submission', date: '2028-02-20' }, { label: 'Opening', date: '2028-02-21' }, { label: 'Negotiation', date: '2028-03-14' }, { label: 'Award (planned)', date: '2028-04-10' }],
    submission: '2028-02-20',
    documents: [
      { name: 'Tender document', version: 'Rev 0', date: '2027-12-04', kind: 'RFP' },
      { name: 'Addendum 1 — N2 purge scope', version: 'Rev 1', date: '2028-01-11', kind: 'Addendum' },
      { name: 'Technical & price proposal', version: 'v1', date: '2028-02-19', kind: 'Our submission' },
      { name: 'Clarification response — N2 standby', version: 'v2', date: '2028-03-07', kind: 'Clarification' },
    ],
  },
  {
    id: 'TDR-2028-006', title: 'Heavy Lift & Transport — Ammonia Plant Revamp', customerId: 'CUS-006', businessLine: 'HL', opportunityId: 'OPP-2028-007', status: 'Open', clientRef: 'NFZ/TND/2028/019',
    schedule: [{ label: 'Announcement', date: '2028-02-06' }, { label: 'Pre-bid clarification', date: '2028-02-21' }, { label: 'Submission', date: '2028-03-24' }, { label: 'Opening', date: '2028-03-25' }, { label: 'Award (planned)', date: '2028-05-30' }],
    submission: '2028-03-24',
    documents: [
      { name: 'Tender document', version: 'Rev 0', date: '2028-02-06', kind: 'RFP' },
      { name: 'Pre-bid minutes', version: '—', date: '2028-02-21', kind: 'Clarification' },
      { name: 'Addendum 1 — reformer weight 420T', version: 'Rev 1', date: '2028-02-28', kind: 'Addendum' },
    ],
  },
  {
    id: 'TDR-2028-009', title: 'Catalyst Screening & Sock Loading — Reformer', customerId: 'CUS-006', businessLine: 'PS', opportunityId: 'OPP-2028-015', status: 'Open', clientRef: 'NFZ/TND/2028/024',
    schedule: [{ label: 'Announcement', date: '2028-02-20' }, { label: 'Pre-bid clarification', date: '2028-03-06' }, { label: 'Submission', date: '2028-04-02' }, { label: 'Opening', date: '2028-04-03' }],
    submission: '2028-04-02',
    documents: [{ name: 'Tender document', version: 'Rev 0', date: '2028-02-20', kind: 'RFP' }, { name: 'Pre-bid minutes', version: '—', date: '2028-03-06', kind: 'Clarification' }],
  },
  {
    id: 'TDR-2028-008', title: 'Sulfur Recovery Unit — Catalyst Handling', customerId: 'CUS-003', businessLine: 'PS', opportunityId: 'OPP-2028-014', status: 'Prequalification', clientRef: 'MGP/CT/2028/0077',
    schedule: [{ label: 'Announcement', date: '2028-03-01' }, { label: 'Prequalification due', date: '2028-03-18' }, { label: 'Submission (tentative)', date: '2028-05-08' }],
    submission: '2028-05-08',
    documents: [{ name: 'Prequalification questionnaire', version: 'Rev 0', date: '2028-03-01', kind: 'RFP' }],
  },
]

export type BondStatus = 'In issuance' | 'Active' | 'Release requested' | 'Released' | 'Converted'

export interface BidBond {
  id: string
  tenderId: string
  bank: string
  bondNo: string
  amount: number
  issued: string
  validUntil: string
  status: BondStatus
  releasedAt?: string
  note?: string
}

export const bidBonds: BidBond[] = [
  { id: 'BB-2027-008', tenderId: 'TDR-2027-015', bank: 'Bank Mandiri', bondNo: 'MDR/BG/2027/08814', amount: 360_000_000, issued: '2027-10-02', validUntil: '2028-02-02', status: 'Released', releasedAt: '2028-01-26', note: 'Replaced by performance bond on award' },
  { id: 'BB-2027-009', tenderId: 'TDR-2027-017', bank: 'Bank Rakyat Indonesia', bondNo: 'BRI/GB/27/33019', amount: 710_000_000, issued: '2027-09-28', validUntil: '2028-01-31', status: 'Released', releasedAt: '2028-01-05' },
  { id: 'BB-2027-011', tenderId: 'TDR-2027-019', bank: 'Bank Mandiri', bondNo: 'MDR/BG/2027/09305', amount: 845_000_000, issued: '2027-10-18', validUntil: '2028-04-30', status: 'Converted', releasedAt: '2028-03-02', note: 'Returned on issue of performance bond PB-2028-004' },
  { id: 'BB-2027-014', tenderId: 'TDR-2027-022', bank: 'Bank Negara Indonesia', bondNo: 'BNI/BG/2027/51277', amount: 435_000_000, issued: '2027-11-10', validUntil: '2028-04-30', status: 'Active', note: 'Tender concluded 30 Jan 2028 — bond not yet returned by client' },
  { id: 'BB-2028-002', tenderId: 'TDR-2028-004', bank: 'Bank Mandiri', bondNo: 'MDR/BG/2028/00917', amount: 920_000_000, issued: '2028-02-14', validUntil: '2028-05-20', status: 'Active' },
  { id: 'BB-2028-004', tenderId: 'TDR-2028-006', bank: 'Bank Central Asia', bondNo: 'BCA/SBG/2028/1204', amount: 580_000_000, issued: '2028-03-09', validUntil: '2028-07-24', status: 'In issuance', note: 'Bank draft received, awaiting original' },
]

// ─── Correspondence ───────────────────────────────────────────────────────────
export interface Correspondence {
  id: string
  kind: 'Inbound letter' | 'Outbound letter' | 'Meeting minutes' | 'Email record'
  date: string
  ref: string
  subject: string
  counterparty: string
  authorId: string
  bound: { type: 'opportunity' | 'contract'; id: string }
  attachments: number
  summary: string
}

export const correspondence: Correspondence[] = [
  { id: 'COR-2028-0214', kind: 'Inbound letter', date: '2028-03-09', ref: 'NFZ/TND/2028/019-A2', subject: 'Clarification No. 2 — lift envelope for reformer R-1101', counterparty: 'Nusantara Fertilizer', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2028-007' }, attachments: 2, summary: 'Client confirms 420T lift weight and restricts crane pad to north side of unit.' },
  { id: 'COR-2028-0211', kind: 'Meeting minutes', date: '2028-03-07', ref: 'MOM/PI/2028/033', subject: 'Negotiation round 1 — HCU turnaround price', counterparty: 'Pertiwi Refinery Unit', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2028-003' }, attachments: 1, summary: 'Price reduced to IDR 18.4 bn; N2 standby rate to be clarified by 14 Mar.' },
  { id: 'COR-2028-0209', kind: 'Outbound letter', date: '2028-03-07', ref: 'PI/BD/OUT/2028/0118', subject: 'Response to clarification — nitrogen purge standby', counterparty: 'Pertiwi Refinery Unit', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2028-003' }, attachments: 1, summary: 'Standby charged at IDR 1.45 m per hour, capped at 72 hours.' },
  { id: 'COR-2028-0203', kind: 'Outbound letter', date: '2028-03-04', ref: 'PI/BD/OUT/2028/0112', subject: 'Proposal submission — Pit 4 hauling extension', counterparty: 'Borneo Coal Mining', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2028-005' }, attachments: 3, summary: 'Proposal v1 submitted at IDR 49,800 per tonne.' },
  { id: 'COR-2028-0198', kind: 'Inbound letter', date: '2028-03-02', ref: 'SPC/LGL/2028/0071', subject: 'Contract execution copy — PWT skid', counterparty: 'Sumatra Petrochem', authorId: 'EMP-0011', bound: { type: 'contract', id: 'CTR-2028-004' }, attachments: 2, summary: 'Signed contract received; performance bond PB-2028-004 accepted.' },
  { id: 'COR-2028-0192', kind: 'Meeting minutes', date: '2028-02-28', ref: 'MOM/PI/2028/029', subject: 'Kick-off meeting — PWT skid design & build', counterparty: 'Sumatra Petrochem', authorId: 'EMP-0005', bound: { type: 'contract', id: 'CTR-2028-004' }, attachments: 1, summary: 'Design basis agreed; site access from 1 Apr 2028.' },
  { id: 'COR-2028-0187', kind: 'Inbound letter', date: '2028-02-22', ref: 'SPC/PROC/2028/0180', subject: 'Letter of award — PWT skid', counterparty: 'Sumatra Petrochem', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2027-044' }, attachments: 1, summary: 'Award at IDR 16.9 bn. Contract to be signed within 14 days.' },
  { id: 'COR-2028-0175', kind: 'Outbound letter', date: '2028-02-15', ref: 'PI/BD/OUT/2028/0087', subject: 'Request for return of bid bond BNI/BG/2027/51277', counterparty: 'Sumatra Petrochem', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2027-041' }, attachments: 0, summary: 'Follow-up on bid bond release for concluded cooling-water tender.' },
  { id: 'COR-2028-0161', kind: 'Inbound letter', date: '2028-01-30', ref: 'SPC/PROC/2028/0094', subject: 'Tender result — cooling water chemical treatment', counterparty: 'Sumatra Petrochem', authorId: 'EMP-0005', bound: { type: 'opportunity', id: 'OPP-2027-041' }, attachments: 1, summary: 'Notice of non-award; winner PT Kimia Tirta Utama.' },
  { id: 'COR-2028-0149', kind: 'Outbound letter', date: '2028-01-12', ref: 'PI/OPS/OUT/2028/0021', subject: 'Notice of rate adjustment effective 1 Jan 2028 (Amendment 02)', counterparty: 'Borneo Coal Mining', authorId: 'EMP-0003', bound: { type: 'contract', id: 'CTR-2027-011' }, attachments: 2, summary: 'Hauling rate IDR 48,500 per tonne from 1 Jan 2028 per fuel-price clause.' },
  { id: 'COR-2028-0140', kind: 'Meeting minutes', date: '2028-01-08', ref: 'MOM/PI/2028/004', subject: 'Monthly progress review — Kutai Pit 3', counterparty: 'Borneo Coal Mining', authorId: 'EMP-0003', bound: { type: 'contract', id: 'CTR-2027-011' }, attachments: 1, summary: 'December volume 71,400 t; Pit 4 extension discussed informally.' },
  { id: 'COR-2028-0133', kind: 'Inbound letter', date: '2028-01-18', ref: 'JGE/SCM/2028/0033', subject: 'Letter of award — Well Pad K-7 rig move', counterparty: 'Java Geothermal Energy', authorId: 'EMP-0011', bound: { type: 'opportunity', id: 'OPP-2027-038' }, attachments: 1, summary: 'Award at IDR 7.2 bn.' },
  { id: 'COR-2028-0126', kind: 'Email record', date: '2028-03-06', ref: 'EML/2028/0412', subject: 'Crane 600T rental availability — Ammonia revamp', counterparty: 'PT Sarana Crane Sewa', authorId: 'EMP-0003', bound: { type: 'opportunity', id: 'OPP-2028-007' }, attachments: 1, summary: 'Rental quote pending; vendor currently suspended in VMS — alternative sourced.' },
  { id: 'COR-2028-0120', kind: 'Inbound letter', date: '2028-02-26', ref: 'MGP/CT/2028/0061', subject: 'Request for demobilisation plan — Train 2', counterparty: 'Mahakam Gas Processing', authorId: 'EMP-0003', bound: { type: 'contract', id: 'CTR-2027-016' }, attachments: 0, summary: 'Client requests demob plan ahead of 31 Mar contract end.' },
  { id: 'COR-2028-0117', kind: 'Outbound letter', date: '2028-02-12', ref: 'PI/PS/OUT/2028/0041', subject: 'Variation order request — additional technicians', counterparty: 'Pertiwi Refinery Unit', authorId: 'EMP-0004', bound: { type: 'contract', id: 'CTR-2027-019' }, attachments: 2, summary: '14 additional man-days at IDR 3.2 m per man-day.' },
  { id: 'COR-2028-0102', kind: 'Meeting minutes', date: '2028-02-19', ref: 'MOM/PI/2028/021', subject: 'Site visit — Pit 4 haul road survey', counterparty: 'Borneo Coal Mining', authorId: 'EMP-0006', bound: { type: 'opportunity', id: 'OPP-2028-005' }, attachments: 4, summary: 'Haul distance 47 km; road upgrade by client before start.' },
]

// ─── Contract extensions (versions, payment terms, critical dates) ───────────
export interface ContractVersion {
  version: number
  label: string
  signed: string
  effective: string
  summary: string
  valueAfter: number
}

export interface PaymentMilestone {
  name: string
  pct: number
  due: string
  status: 'Billed' | 'Paid' | 'Scheduled' | 'Due'
}

export interface CriticalDate {
  label: string
  date: string
  kind: 'Start' | 'Expiry' | 'Renewal option' | 'Guarantee' | 'Insurance' | 'Retention release'
}

export interface ContractExtra {
  signedBy: string
  versions: ContractVersion[]
  billing: 'Monthly on verified volume' | 'Milestone' | 'Lump sum + unit rates'
  milestones: PaymentMilestone[]
  retentionRelease: string
  criticalDates: CriticalDate[]
  guarantees: { kind: string; bank: string; number: string; amount: number; validUntil: string }[]
  /** Billing periods to illustrate rate-card effective dating */
  billingHistory?: { period: string; qty: number; rate: number; invoice: string }[]
  approvals?: { step: string; by: string; at?: string; status: 'Approved' | 'Pending' }[]
}

export const contractExtras: Record<string, ContractExtra> = {
  'CTR-2027-011': {
    signedBy: 'Putri Maharani', billing: 'Monthly on verified volume', retentionRelease: 'Released 90 days after final hand-over, against clean site certificate',
    versions: [
      { version: 1, label: 'Original contract', signed: '2027-06-20', effective: '2027-07-01', summary: 'Coal hauling pit to port, 18 months, IDR 46,000 per tonne', valueAfter: 34_000_000_000 },
      { version: 2, label: 'Amendment 01', signed: '2027-09-28', effective: '2027-10-01', summary: 'Added heavy equipment mobilisation & crane lifting scope (project code HL-2027-014.02)', valueAfter: 36_200_000_000 },
      { version: 3, label: 'Amendment 02', signed: '2027-12-18', effective: '2028-01-01', summary: 'Hauling rate adjusted to IDR 48,500 per tonne under fuel-price clause 14.3', valueAfter: 38_500_000_000 },
    ],
    milestones: [
      { name: 'Monthly progress invoice (verified tonnage)', pct: 95, due: 'Monthly, 30 days', status: 'Billed' },
      { name: 'Retention release', pct: 5, due: '2029-03-31', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2027-07-01', kind: 'Start' },
      { label: 'Performance bond validity', date: '2029-03-31', kind: 'Guarantee' },
      { label: 'Renewal option — notice deadline', date: '2028-09-30', kind: 'Renewal option' },
      { label: 'Contract expiry', date: '2028-12-31', kind: 'Expiry' },
      { label: 'CAR / third-party liability policy', date: '2028-06-30', kind: 'Insurance' },
    ],
    guarantees: [{ kind: 'Performance bond (5%)', bank: 'Bank Mandiri', number: 'MDR/PB/2027/04411', amount: 1_925_000_000, validUntil: '2029-03-31' }],
    billingHistory: [
      { period: '2027-11', qty: 68_900, rate: 46_000, invoice: 'INV-2027-1123' },
      { period: '2027-12', qty: 71_400, rate: 46_000, invoice: 'INV-2027-1219' },
      { period: '2028-01', qty: 70_150, rate: 48_500, invoice: 'INV-2028-0131' },
      { period: '2028-02', qty: 66_820, rate: 48_500, invoice: 'INV-2028-0229' },
    ],
  },
  'CTR-2027-019': {
    signedBy: 'Putri Maharani', billing: 'Lump sum + unit rates', retentionRelease: 'Released on acceptance of mechanical completion certificate',
    versions: [{ version: 1, label: 'Original contract', signed: '2028-01-08', effective: '2028-01-15', summary: 'Catalyst change-out lump sum with unit rates for extras', valueAfter: 12_800_000_000 }],
    milestones: [
      { name: 'Mobilisation', pct: 20, due: '2028-01-31', status: 'Paid' },
      { name: 'Unloading complete', pct: 30, due: '2028-02-29', status: 'Billed' },
      { name: 'Loading & box-up complete', pct: 40, due: '2028-04-05', status: 'Scheduled' },
      { name: 'Retention release', pct: 10, due: '2028-07-15', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2028-01-15', kind: 'Start' },
      { label: 'Contract expiry', date: '2028-04-15', kind: 'Expiry' },
      { label: 'Performance bond validity', date: '2028-04-30', kind: 'Guarantee' },
      { label: 'Retention release', date: '2028-07-15', kind: 'Retention release' },
    ],
    guarantees: [{ kind: 'Performance bond (5%)', bank: 'Bank Negara Indonesia', number: 'BNI/PB/2028/00318', amount: 640_000_000, validUntil: '2028-04-30' }],
  },
  'CTR-2027-014': {
    signedBy: 'Agus Salim', billing: 'Milestone', retentionRelease: 'Released at end of 12-month defects liability period',
    versions: [
      { version: 1, label: 'Original contract', signed: '2027-08-22', effective: '2027-09-01', summary: 'EPC water treatment package, 3 milestones', valueAfter: 21_400_000_000 },
      { version: 2, label: 'Amendment 01', signed: '2027-12-05', effective: '2027-12-05', summary: 'Milestone re-sequencing: equipment supply split into UF and RO deliveries', valueAfter: 21_400_000_000 },
    ],
    milestones: [
      { name: 'Engineering & design', pct: 10, due: '2027-11-30', status: 'Paid' },
      { name: 'UF skid delivered', pct: 30, due: '2028-02-15', status: 'Billed' },
      { name: 'RO train delivered', pct: 30, due: '2028-04-30', status: 'Scheduled' },
      { name: 'Installation & commissioning', pct: 20, due: '2028-08-15', status: 'Scheduled' },
      { name: 'Retention release', pct: 10, due: '2029-08-31', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2027-09-01', kind: 'Start' },
      { label: 'Advance payment bond validity', date: '2028-03-31', kind: 'Guarantee' },
      { label: 'Contract expiry', date: '2028-08-31', kind: 'Expiry' },
      { label: 'Performance bond validity', date: '2029-08-31', kind: 'Guarantee' },
    ],
    guarantees: [
      { kind: 'Advance payment bond', bank: 'Bank Mandiri', number: 'MDR/APB/2027/1021', amount: 2_140_000_000, validUntil: '2028-03-31' },
      { kind: 'Performance bond (5%)', bank: 'Bank Mandiri', number: 'MDR/PB/2027/1022', amount: 1_070_000_000, validUntil: '2029-08-31' },
    ],
  },
  'CTR-2027-016': {
    signedBy: 'Putri Maharani', billing: 'Lump sum + unit rates', retentionRelease: 'Released on demobilisation and final account',
    versions: [{ version: 1, label: 'Original contract', signed: '2027-09-20', effective: '2027-10-01', summary: 'Crane hire per hour and SPMT per module move', valueAfter: 9_600_000_000 }],
    milestones: [
      { name: 'Monthly progress invoice', pct: 95, due: 'Monthly, 30 days', status: 'Billed' },
      { name: 'Retention release', pct: 5, due: '2028-06-30', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2027-10-01', kind: 'Start' },
      { label: 'Contract expiry', date: '2028-03-31', kind: 'Expiry' },
      { label: 'Performance bond validity', date: '2028-04-30', kind: 'Guarantee' },
      { label: 'Retention release', date: '2028-06-30', kind: 'Retention release' },
    ],
    guarantees: [{ kind: 'Performance bond (5%)', bank: 'Bank Rakyat Indonesia', number: 'BRI/PB/27/22871', amount: 480_000_000, validUntil: '2028-04-30' }],
  },
  'CTR-2027-009': {
    signedBy: 'Dewi Kartika', billing: 'Milestone', retentionRelease: 'Released 90 days after hand-over (maintenance period)',
    versions: [{ version: 1, label: 'Original contract', signed: '2027-10-02', effective: '2027-10-10', summary: 'Lump-sum boiler overhaul', valueAfter: 6_350_000_000 }],
    milestones: [
      { name: 'Mobilisation', pct: 20, due: '2027-10-20', status: 'Paid' },
      { name: 'Mechanical completion', pct: 75, due: '2027-12-20', status: 'Paid' },
      { name: 'Retention release', pct: 5, due: '2028-03-20', status: 'Due' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2027-10-10', kind: 'Start' },
      { label: 'Contract expiry', date: '2027-12-20', kind: 'Expiry' },
      { label: 'Retention release', date: '2028-03-20', kind: 'Retention release' },
    ],
    guarantees: [],
  },
  'CTR-2028-002': {
    signedBy: 'Putri Maharani', billing: 'Lump sum + unit rates', retentionRelease: 'Released on completion of rig-up acceptance',
    versions: [{ version: 1, label: 'Original contract', signed: '2028-01-25', effective: '2028-02-01', summary: 'Lump-sum rig move plus per-trip lowbed', valueAfter: 7_200_000_000 }],
    milestones: [
      { name: 'Mobilisation', pct: 15, due: '2028-02-15', status: 'Paid' },
      { name: 'Rig move 50% loads', pct: 35, due: '2028-04-15', status: 'Scheduled' },
      { name: 'Rig-up acceptance', pct: 45, due: '2028-06-15', status: 'Scheduled' },
      { name: 'Retention release', pct: 5, due: '2028-09-30', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2028-02-01', kind: 'Start' },
      { label: 'Performance bond validity', date: '2028-03-25', kind: 'Guarantee' },
      { label: 'CAR policy expiry', date: '2028-04-20', kind: 'Insurance' },
      { label: 'Contract expiry', date: '2028-06-30', kind: 'Expiry' },
    ],
    guarantees: [{ kind: 'Performance bond (5%)', bank: 'Bank Mandiri', number: 'MDR/PB/2028/00144', amount: 360_000_000, validUntil: '2028-03-25' }],
  },
  'CTR-2028-004': {
    signedBy: 'Putri Maharani', billing: 'Milestone', retentionRelease: 'Released at end of 12-month defects liability period',
    versions: [{ version: 1, label: 'Original contract', signed: '2028-03-02', effective: '2028-04-01', summary: 'Design, supply & commissioning of produced water treatment skid', valueAfter: 16_900_000_000 }],
    milestones: [
      { name: 'Down payment', pct: 30, due: '2028-04-15', status: 'Scheduled' },
      { name: 'Design approval', pct: 10, due: '2028-06-15', status: 'Scheduled' },
      { name: 'Skid delivered to site', pct: 35, due: '2028-10-31', status: 'Scheduled' },
      { name: 'Commissioning & performance test', pct: 15, due: '2029-01-31', status: 'Scheduled' },
      { name: 'Retention release', pct: 10, due: '2030-01-31', status: 'Scheduled' },
    ],
    criticalDates: [
      { label: 'Contract start', date: '2028-04-01', kind: 'Start' },
      { label: 'Advance payment bond validity', date: '2028-10-31', kind: 'Guarantee' },
      { label: 'Contract expiry', date: '2029-01-31', kind: 'Expiry' },
      { label: 'Performance bond validity', date: '2030-01-31', kind: 'Guarantee' },
    ],
    guarantees: [{ kind: 'Performance bond (5%)', bank: 'Bank Mandiri', number: 'PB-2028-004', amount: 845_000_000, validUntil: '2030-01-31' }],
    approvals: [
      { step: 'Contract registered from won opportunity OPP-2027-044', by: 'EMP-0011', at: '2028-03-02T10:15', status: 'Approved' },
      { step: 'Legal review of signed contract', by: 'EMP-0028', at: '2028-03-03T14:40', status: 'Approved' },
      { step: 'Rate card & payment terms verified', by: 'EMP-0022', at: '2028-03-06T09:05', status: 'Approved' },
      { step: 'Finance Director approval → project code issue', by: 'EMP-0002', status: 'Pending' },
    ],
  },
}

export const oppById = (id?: string) => opportunities.find((o) => o.id === id)
export const tenderById = (id?: string) => tenders.find((t) => t.id === id)
