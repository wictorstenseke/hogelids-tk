# PRD: History Section Redesign — Tabs, Stats Dashboard & Multi-Year Line Chart

## Problem Statement

The current History section is a flat, chronological log of past bookings filtered by a single year. It gives members no sense of the club's usage patterns over time — how active the court is across months, how this year compares to last, or what the total booking volume looks like. The section is useful for looking up a specific past booking, but provides no aggregated insight.

## Solution

Redesign the History section into a two-tab layout:

- **Historik** — the existing booking list, unchanged in behavior, filtered by the shared year selection
- **Statistik** — a new stats dashboard showing aggregated booking data across all years, with a multi-year line chart and a headline total count

A shared multi-select year filter (chips) sits above both tabs and carries state across them. All data is fetched once via a new `getAllBookings()` service call to avoid redundant Firestore reads.

## User Stories

1. As a club member, I want to see the History section split into a Stats tab and a List tab, so that I can choose between an overview and a detailed log.
2. As a club member, I want to see a headline number showing total bookings for the selected year(s), so that I can quickly gauge overall court activity.
3. As a club member, I want to select multiple years using chip buttons, so that I can compare booking patterns across different seasons.
4. As a club member, I want a "Välj alla" default state that shows all years aggregated, so that I don't have to configure anything to see the full picture.
5. As a club member, I want to deselect individual years to remove them from the chart, so that I can isolate specific seasons.
6. As a club member, I want a line chart with one line per selected year and months on the X axis, so that I can compare monthly booking patterns across years.
7. As a club member, I want months with no bookings to show as zero on the chart rather than being hidden, so that I can see gaps in usage clearly.
8. As a club member, I want the chart to only show months that have at least one booking in any selected year, so that off-season months with no data don't clutter the view.
9. As a club member, I want the Historik tab to respect the same year selection as the Statistik tab, so that I don't have to re-filter when switching tabs.
10. As a club member, I want the booking list in Historik to show all bookings for all selected years when multiple years are chosen, so that the tab reflects the same scope as the stats.
11. As a club member, I want the stats and chart to update immediately when I change the year selection, so that the feedback is instant.
12. As a club member, I want the chart to be styled consistently with the existing green card aesthetic, so that the section feels cohesive.
13. As a club member on mobile, I want the year chips to wrap naturally and be touch-friendly, so that filtering works well on small screens.
14. As a club member, I want to see Swedish month abbreviations on the chart X axis, so that the UI stays consistent with the sv-SE locale.

## Implementation Decisions

### New service function

- Add `getAllBookings()` to `BookingService` — queries all past bookings (up to now) ordered by `startTime` ascending. Fetched once via `useQuery` with `staleTime: Infinity`.

### Stats computation

- Pure function `computeStats(bookings, selectedYears)` → `{ totalBookings, byYearByMonth: Record<number, Record<number, number>> }`
- Groups bookings by year, then by month index (0–11)
- Filters to selected years before computing
- Determines the union of active months across all selected years for the X axis

### Year filter state

- Shared state lifted within the redesigned `HistorySection`
- Default: all years selected ("Välj alla")
- Year list derived from distinct years present in fetched bookings

### Tabs

- Simple tab switcher (Statistik / Historik) — local state only, no routing changes
- Active tab indicated by yellow `#F1E334` accent, consistent with existing button styles

### Chart

- Library: `recharts`
- Chart type: `LineChart` with one `<Line>` per selected year
- X axis: month abbreviations in `sv-SE` for months present in data
- Y axis: booking count (integer ticks)
- Tooltip in Swedish showing year + month + count
- Color palette: distinct line colors per year, legible on dark green background

### Historik tab data

- Reuses all-bookings data already fetched — filters client-side to selected years
- No additional Firestore calls
- Existing list rendering and date formatting helpers unchanged

### No new routes

- Everything stays within `HistorySection` — no TanStack Router changes needed

## Testing Decisions

Good tests verify external behavior, not implementation details. They should not depend on internal data structures or rendering internals.

**What to test:**

- `computeStats()` pure function:
  - Given a set of bookings, verify correct `totalBookings` count
  - Verify correct month grouping per year
  - Verify that months with no bookings in any selected year are excluded from active months
  - Verify that deselected years are excluded from totals and chart data

**What not to test:**

- Recharts rendering internals
- Firestore call mechanics (service-level concern)
- Tab switching UI state

**Prior art:** Follow the same pattern as existing pure function tests in the codebase (co-located `*.test.tsx` files).

## Out of Scope

- Bar charts, pie charts, or other chart types
- Total hours metric — booking count only
- Per-user or per-member stats breakdown
- Admin-specific stats views
- Export or sharing of stats
- Animations or transitions on the chart
- Cross-year comparison beyond the line chart

## Further Notes

- The club has ~649 historical bookings post-migration; fetching all at once is acceptable at this scale.
- Swedish locale (`sv-SE`) must be used for all month/date labels.
- The green card aesthetic (`bg-[#194b29]`) is preserved across both tabs.
- `recharts` must be added as a dependency before implementation.
