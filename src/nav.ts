import {
  LayoutDashboard, CheckSquare, Target, Gavel, FileSignature, ClipboardList, CalendarRange, Truck, Fuel, Gauge, MapPinned, Clock, Users,
  ShoppingCart, FileSearch, PackageCheck, Building2, FolderKanban, Split, Droplets, History, FileLock, BookOpen, ListTree, CalendarCheck,
  Inbox, GitCompare, Receipt, FileCheck2, HandCoins, Factory, Landmark, Banknote, Boxes, Wrench, BadgeCheck, ShieldAlert, FileBadge, Recycle,
  Database, FolderOpen, BarChart3, UserCog, Plug, ScrollText, Settings2, Smartphone, Store, Mail,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  stage?: '1A' | '1B'
}

export interface NavGroup {
  label: string
  /** Module codes covered by the group, shown as a hint */
  modules?: string
  items: NavItem[]
}

export const nav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'My Approvals', to: '/inbox', icon: CheckSquare },
    ],
  },
  {
    label: 'Commercial',
    modules: 'M1–M2',
    items: [
      { label: 'Pipeline', to: '/crm/pipeline', icon: Target, stage: '1A' },
      { label: 'Tenders & Bid Bonds', to: '/crm/tenders', icon: Gavel, stage: '1A' },
      { label: 'Correspondence', to: '/crm/correspondence', icon: Mail, stage: '1A' },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, stage: '1A' },
    ],
  },
  {
    label: 'Operations',
    modules: 'M3–M5',
    items: [
      { label: 'Job Orders', to: '/ops/jobs', icon: ClipboardList, stage: '1A' },
      { label: 'Planning Board', to: '/ops/planning', icon: CalendarRange, stage: '1A' },
      { label: 'Fleet', to: '/fleet/units', icon: Truck, stage: '1A' },
      { label: 'Fuel Monitoring', to: '/fleet/fuel', icon: Fuel, stage: '1A' },
      { label: 'Driver Behaviour', to: '/fleet/drivers', icon: Gauge, stage: '1A' },
      { label: 'Live Tracking', to: '/fleet/tracking', icon: MapPinned, stage: '1A' },
      { label: 'Timesheets', to: '/timesheets', icon: Clock, stage: '1A' },
      { label: 'Manpower Allocation', to: '/manpower', icon: Users, stage: '1A' },
    ],
  },
  {
    label: 'Procurement',
    modules: 'M6',
    items: [
      { label: 'Purchase Requisitions', to: '/procurement/requisitions', icon: ShoppingCart, stage: '1A' },
      { label: 'RFQ & Bid Tabulation', to: '/procurement/rfq', icon: FileSearch, stage: '1A' },
      { label: 'Purchase Orders', to: '/procurement/orders', icon: FileCheck2, stage: '1A' },
      { label: 'Goods / Service Receipt', to: '/procurement/receipts', icon: PackageCheck, stage: '1A' },
      { label: 'Vendors', to: '/vendors', icon: Building2, stage: '1A' },
    ],
  },
  {
    label: 'Project Control',
    modules: 'M7',
    items: [
      { label: 'Project Codes & P/L', to: '/projects', icon: FolderKanban, stage: '1A' },
      { label: 'GEN Allocation', to: '/costing/allocation', icon: Split, stage: '1A' },
      { label: 'Fuel Actualisation', to: '/costing/fuel-actualisation', icon: Droplets, stage: '1A' },
      { label: 'Late Costs', to: '/costing/late-costs', icon: History, stage: '1A' },
      { label: 'FPP Control', to: '/costing/fpp', icon: FileLock, stage: '1A' },
    ],
  },
  {
    label: 'Finance',
    modules: 'M8–M13',
    items: [
      { label: 'General Ledger', to: '/finance/gl', icon: BookOpen, stage: '1B' },
      { label: 'Chart of Accounts', to: '/finance/coa', icon: ListTree, stage: '1B' },
      { label: 'Period Close', to: '/finance/close', icon: CalendarCheck, stage: '1B' },
      { label: 'Loket Invoice', to: '/finance/loket', icon: Inbox, stage: '1B' },
      { label: 'Three-way Match', to: '/finance/ap/match', icon: GitCompare, stage: '1B' },
      { label: 'Payments', to: '/finance/ap/payments', icon: HandCoins, stage: '1B' },
      { label: 'Billing & Surat Konversi', to: '/finance/billing', icon: Receipt, stage: '1B' },
      { label: 'Konversi vs Invoice', to: '/finance/billing/reconciliation', icon: GitCompare, stage: '1B' },
      { label: 'Receivables', to: '/finance/ar', icon: Banknote, stage: '1B' },
      { label: 'Fixed Assets', to: '/finance/assets', icon: Factory, stage: '1B' },
      { label: 'Tax', to: '/finance/tax', icon: Landmark, stage: '1B' },
      { label: 'Cash & Bank', to: '/finance/cash', icon: Banknote, stage: '1B' },
    ],
  },
  {
    label: 'Supporting',
    modules: 'M14–M16',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Boxes, stage: '1B' },
      { label: 'Work Orders', to: '/maintenance/work-orders', icon: Wrench, stage: '1A' },
      { label: 'Maintenance Schedule', to: '/maintenance/schedule', icon: CalendarRange, stage: '1A' },
      { label: 'Certifications', to: '/maintenance/certifications', icon: BadgeCheck, stage: '1A' },
      { label: 'HSE Incidents', to: '/hse/incidents', icon: ShieldAlert, stage: '1A' },
      { label: 'Permits & Licences', to: '/hse/permits', icon: FileBadge, stage: '1A' },
      { label: 'Waste Manifests', to: '/hse/waste', icon: Recycle, stage: '1A' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Master Data (MDM)', to: '/mdm', icon: Database },
      { label: 'Documents', to: '/documents', icon: FolderOpen },
      { label: 'Reports & BI', to: '/reports', icon: BarChart3 },
      { label: 'Users & Access', to: '/admin/users', icon: UserCog },
      { label: 'Integrations', to: '/admin/integrations', icon: Plug },
      { label: 'Audit Trail', to: '/admin/audit', icon: ScrollText },
      { label: 'Configuration', to: '/admin/config', icon: Settings2 },
    ],
  },
  {
    label: 'Other apps',
    items: [
      { label: 'Field Mobile App', to: '/mobile', icon: Smartphone },
      { label: 'Vendor Portal', to: '/portal', icon: Store },
    ],
  },
]
