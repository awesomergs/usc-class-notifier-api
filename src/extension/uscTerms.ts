// Data only: USC academic term boundaries and holidays, keyed by term id. No logic, no
// dependencies.
//
// Term id convention: YYYY + 1|2|3 (spring|summer|fall). Dates cross-checked against the
// registrar (arr.usc.edu) — see CALENDAR_EXPORT_NOTES.md. Fall Recess (Oct 8-9) and Thanksgiving
// (Nov 25-29) are each listed as separate single-day entries, not a range, matching the
// registrar's own day-by-day "no classes" listing — Thanksgiving is a real five-day span, not
// just Thursday-Friday.

import type { Term } from "@/extension/ics";

export const USC_TERMS = new Map<string, Term>([
  [
    "20263",
    {
      id: "20263",
      name: "USC Fall 2026",
      firstDay: "2026-08-24",
      lastDay: "2026-12-04",
      holidays: [
        { date: "2026-09-07", name: "Labor Day" },
        { date: "2026-10-08", name: "Fall Recess" },
        { date: "2026-10-09", name: "Fall Recess" },
        { date: "2026-11-11", name: "Veterans Day" },
        { date: "2026-11-25", name: "Thanksgiving" },
        { date: "2026-11-26", name: "Thanksgiving" },
        { date: "2026-11-27", name: "Thanksgiving" },
        { date: "2026-11-28", name: "Thanksgiving" },
        { date: "2026-11-29", name: "Thanksgiving" },
      ],
    },
  ],
]);

export function resolveTerm(termId: string): Term | null {
  return USC_TERMS.get(termId) ?? null;
}
