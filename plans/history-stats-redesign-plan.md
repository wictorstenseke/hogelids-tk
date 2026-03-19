# Plan: History Section Redesign — Tabs, Stats Dashboard & Multi-Year Line Chart

> Source PRD: plans/history-stats-redesign.md

## Architectural decisions

- **Routes**: No new routes. Everything stays within `HistorySection` on `/`. TanStack Router is not touched.
- **Data fetching**: New `getAllBookings()` service function fetches all past bookings once, with `staleTime: Infinity`. Replaces per-year lazy loading for the stats view.
- **Year filter state**: Shared state within `HistorySection` — a `Set<number>` of selected years. Default: all years selected. Drives both tabs.
- **Stats computation**: Pure function `computeStats(bookings, selectedYears)` — no side effects, fully testable in isolation.
- **Chart library**: `recharts` — added as a production dependency.
- **Locale**: All date/month labels use `sv-SE`.

---

## Phase 1: Tab shell + shared year filter

**User stories**: 1, 3, 4, 5, 9, 10, 13

### What to build

Redesign `HistorySection` into a two-tab layout (Statistik / Historik) with a shared multi-select year filter above both tabs. Year chips derived from the years present in the existing per-year query range (`earliestYear` → `currentYear`). "Välj alla" is the default — all years selected. Selecting/deselecting a year chip updates shared state instantly.

Historik tab: existing booking list, now filtered client-side to the selected years (fetches per selected year, same pattern as today). Statistik tab: empty placeholder, styled consistently.

The year picker that currently lives in `HistorySection` is removed and replaced by the new shared chip filter.

### Acceptance criteria

- [ ] Two tabs render: "Statistik" and "Historik", active tab highlighted with yellow accent
- [ ] Year chips render for all years from `earliestYear` to `currentYear`
- [ ] All years selected by default ("Välj alla" state)
- [ ] Tapping a year chip toggles it; deselected years are visually distinct
- [ ] Historik tab booking list updates to reflect selected years
- [ ] Switching tabs preserves the year selection
- [ ] Chips wrap and are touch-friendly (min 44×44px tap targets) on mobile
- [ ] Statistik tab shows a placeholder (e.g. "Statistik kommer snart")

---

## Phase 2: Stats data layer + headline count

**User stories**: 2, 11, + test coverage

### What to build

Add `getAllBookings()` to `BookingService` — queries all past bookings up to now, ordered by `startTime` ascending. Wire it into `HistorySection` via `useQuery` with `staleTime: Infinity`.

Add a pure `computeStats(bookings, selectedYears)` function that returns `{ totalBookings, byYearByMonth }`. Write unit tests for it covering: correct total, correct month grouping, month exclusion when no selected year has data for it, and behavior when `selectedYears` is empty.

Replace the Statistik tab placeholder with a headline showing total bookings for the selected years.

### Acceptance criteria

- [ ] `getAllBookings()` fetches all past bookings in a single Firestore call
- [ ] `computeStats()` is a pure function with no Firestore dependency
- [ ] `computeStats()` tests pass: total count, month grouping, year filtering, empty selection
- [ ] Statistik tab shows "X bokningar" headline, updating instantly on year chip change
- [ ] No additional Firestore calls are made when switching years (client-side only)
- [ ] Loading state shown while `getAllBookings()` resolves

---

## Phase 3: Line chart

**User stories**: 6, 7, 8, 12, 14

### What to build

Install `recharts`. Render a `LineChart` in the Statistik tab below the headline count — one `<Line>` per selected year. X axis: abbreviated month names in `sv-SE` for months that have at least one booking in any selected year. Y axis: integer booking counts. Months with no bookings for a given year render as zero (not gaps). Tooltip shows year + Swedish month name + count.

Style the chart for the dark green card: white/light axis labels, distinct line colors per year (legible on dark background), minimal gridlines.

### Acceptance criteria

- [ ] `recharts` installed and rendering without errors
- [ ] One line per selected year in a distinct color
- [ ] X axis shows only months with data in any selected year (sv-SE abbreviations)
- [ ] A year with no bookings in an active month renders as 0, not a gap
- [ ] Y axis shows integer ticks only
- [ ] Tooltip displays year, Swedish month name, and booking count
- [ ] Chart is legible on the `bg-[#194b29]` dark green background
- [ ] Chart is responsive and renders correctly on mobile widths
- [ ] Deselecting a year removes its line from the chart instantly
