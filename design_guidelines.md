# Peppol Light Backend - Design Guidelines

## Design Approach

**System Selected:** Fluent Design (Microsoft) - optimal for data-heavy, enterprise SaaS applications requiring professional credibility and efficient information display.

**Design Principles:**
- Trust through clarity: Clean layouts with clear information hierarchy
- Efficiency-first: Minimize cognitive load with structured data presentation
- Professional restraint: Sophisticated visual language without unnecessary flourish

## Color System

**Primary Blue:** #1E5AA8 - navigation, primary buttons, key UI elements, active states
**Accent Orange:** #FF6B35 - CTAs, alerts, success indicators, status highlights
**Semantic Colors:**
- Success: Green (#10B981) for verified/approved status
- Warning: Amber (#F59E0B) for pending/review status  
- Error: Red (#EF4444) for failed/rejected status
- Neutral: Gray scale (#F9FAFB to #111827) for backgrounds, borders, text

## Typography

**Font Stack:** Inter (via Google Fonts CDN)

**Hierarchy:**
- Page Headers: 32px/bold for dashboard titles
- Section Headers: 24px/semibold for card titles, panel headers
- Body Text: 16px/regular for content, descriptions
- Data Labels: 14px/medium for form labels, table headers
- Metadata: 12px/regular for timestamps, secondary info

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 (cards), p-8 (panels)
- Section spacing: gap-6 (grids), space-y-8 (vertical stacks)
- Page margins: px-8, py-6

**Grid System:**
- Dashboard: 12-column grid with max-w-7xl container
- Responsive breakpoints: Single column (mobile), 2-column (tablet), 3-column (desktop)

## Authentication Pages

**Layout:** Centered card design with split-screen aesthetic
- Left: Full-height blue gradient panel with brand messaging
- Right: Authentication form (max-w-md)
- Logo placement: Top-left of gradient panel
- Form card: Elevated shadow, rounded-lg, p-8

**Login/Register Forms:**
- Input fields: Outlined style with focus ring (blue), h-12
- Labels: Above inputs, text-sm/medium
- Primary button: Full-width, bg-blue, h-12, rounded-lg
- Secondary links: Text-blue, underlined on hover
- Error messages: Text-red, text-sm below fields

## Dashboard Layout

**Navigation:**
- Top bar: Fixed header with logo (left), user menu (right), h-16, shadow-sm
- Sidebar: Fixed left navigation, w-64, bg-gray-50, py-6
  - Navigation items: px-4, py-3, rounded-md hover states
  - Active state: bg-blue-50, text-blue, border-l-4 blue

**Main Content Area:**
- Container: ml-64 (sidebar offset), p-8
- Page header: mb-8 with title, breadcrumbs, action buttons

## Core Components

**Invoice Cards:**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-6
- Card structure: bg-white, rounded-lg, shadow-sm, p-6, border
- Header: Invoice number (font-semibold), date (text-gray-500)
- Status badge: Inline-flex, px-3, py-1, rounded-full, text-sm/medium
- Conformity score: Large number (text-3xl/bold), progress bar below
- Error count: Orange badge if errors exist

**Status Badges:**
- Verified: bg-green-100, text-green-800, border-green-200
- Pending: bg-amber-100, text-amber-800, border-amber-200
- Failed: bg-red-100, text-red-800, border-red-200

**Data Tables:**
- Header: bg-gray-50, border-b-2, text-left, px-6, py-4, text-sm/medium
- Rows: border-b, px-6, py-4, hover:bg-gray-50
- Actions column: flex gap-2, icon buttons

**Error Lists:**
- Container: bg-red-50, border-l-4 border-red, p-4, rounded
- Error items: text-sm, space-y-2, list-disc list-inside
- Severity indicators: Icon + text color coding

**File Upload Zone:**
- Dashed border, rounded-lg, p-8, text-center
- Upload icon: text-gray-400, size-12
- Instructions: text-sm/medium, text-gray-600
- File type badge: text-xs, bg-gray-100, px-2, py-1

**Action Buttons:**
- Primary: bg-blue, text-white, hover:bg-blue-700, h-10, px-6, rounded-md
- Secondary: border-2 border-gray-300, hover:bg-gray-50
- Danger: bg-red, text-white for delete actions
- Icon buttons: p-2, rounded hover:bg-gray-100

## Modal Overlays

**Invoice Detail Modal:**
- Backdrop: bg-black/50
- Panel: max-w-4xl, bg-white, rounded-xl, shadow-2xl
- Header: border-b, px-8, py-6, flex justify-between
- Content: px-8, py-6, max-h-[80vh], overflow-y-auto
- Footer: border-t, px-8, py-4, flex justify-end gap-3

## Images

No hero images required. This is a utility-focused dashboard application where data visualization and efficient workflows take priority over marketing imagery. All visual communication happens through well-structured data displays, status indicators, and clear typography.

## Animations

Minimal, performance-focused transitions:
- Hover states: 150ms ease
- Modal/drawer entrances: 200ms ease-out
- No scroll-triggered animations