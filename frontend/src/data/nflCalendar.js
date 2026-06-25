/**
 * nflCalendar.js — Phase 1.5g.3 hand-curated cultural-moment calendar.
 *
 * `date-list` cultural moments (Blueprints/specs/team-motif-grammar.md
 * §Activation rules) compare `new Date()` against fixed `YYYY-MM-DD` strings.
 * Those strings live HERE, decoupled from `nflTeams.js`, so the calendar is
 * diffable and auditable in isolation.
 *
 * OWNER: Justin. CADENCE: audited pre-season (August) each year, per
 * `Brand/entity-identity-theming.md:201-203` (find-don't-derive; cite the
 * anchor; re-confirm dates annually rather than computing them at runtime —
 * v1 deliberately does NOT introduce a server-trusted NFL clock).
 *
 * Keyed by cultural-moment `id`. Add the next season's dates here before the
 * prior season's roll off; do not delete past dates (harmless, and keeps the
 * audit trail intact).
 */

export const MOMENT_DATES = {
  // DET Thanksgiving Classic — the Lions have hosted on Thanksgiving since
  // 1934. Thanksgiving is the 4th Thursday of November (US).
  //   2026-11-26 (4th Thursday), 2027-11-25 (4th Thursday).
  'det-thanksgiving-classic': ['2026-11-26', '2027-11-25'],
};

/**
 * Lookup helper. Returns a frozen array (never null) so callers can iterate
 * without a guard.
 */
export function getMomentDates(id) {
  return MOMENT_DATES[id] ?? [];
}
