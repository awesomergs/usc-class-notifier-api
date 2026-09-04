# Calendar export feature — research notes (pre-revert)

Written before reverting an in-progress implementation, specifically to avoid re-deriving
this from scratch in a fresh session. Everything below is either confirmed by directly
running/testing something, or pulled from real captured markup — not assumed.

## Confirmed: no existing calendar-export logic

`src/extension/extension.ts`'s `insertExportButton` is a pure redirect — it injects an
`<a>` tag pointing at `https://my.usc.edu/ical/?term=...`. USC's own server generates that
`.ics`, not this extension. No fetch, no blob construction, nothing downstream. Grepped the
whole repo for `schedY`/`schedN`/`regY`/`regN` and near-variants — zero hits. There is no
existing check anywhere for "is this section actually registered" (vs. just sitting in the
course bin) — this needs to be built from nothing.

## Scraping infrastructure that already exists (reuse, don't duplicate)

- `webRegPage.ts` — scrapes `webreg.usc.edu`, scoped per-section off `.section_crsbin`.
  Currently parses seat counts, instructor, type. Does NOT yet read `Location:`, and does
  NOT check registration state.
- `schedule.ts` / `scheduleDocument.ts` — fetches `webreg.usc.edu/Calendar`'s embedded
  Kendo JSON blob for conflict detection. **Confirmed dead end for building a semester-long
  `.ics`**: pulled the original pre-trimmed type definition from git history (commit
  `bade5f4`) and `RecurrenceRule` was observed as `null` in the real payload — USC
  pre-expands to literal per-date occurrences, no real recurring definition, no term
  boundaries, no location field. The endpoint also only returns whichever single week the
  server defaults to (no date-range query param on the fetch) — same "only shows one
  visible week" limitation as USC's own `myCalendar` UI. Building from this would silently
  produce wrong results for any student whose current week includes a holiday.
- `coursesPage.ts` — same job as `webRegPage.ts` but for the newer Material-based
  `classes.usc.edu` UI. Uses a `MutationObserver` since it's an Angular SPA.
- `utils.ts` — `splitDays()` already converts day codes ("MWF" → weekday names). Also has
  the professor-name-matching logic for RMP ratings (unrelated to export).
- Pattern in common: all DOM parsing here is defensive/fuzzy (matches on text labels like
  `"Instructor:"`, not fixed selectors), wrapped in try/catch per-row, because USC's markup
  is an unstable jQuery/Angular hybrid.

## Confirmed real markup (`.section_crsbin`, from an earlier captured fixture)

```html
<div id="section_13001" class="section">
  <div class="... section-row" ...>
    <div class="section_crsbin">
      <span class="section_row ...">
        <span class="... table-headers-xsmall">Action: </span>
        <div id="section-action" class="schUnschRmv" style="display: block;">
          <div id="schedY_regN_13001" class="btn-group ... actionbar" style="display: none;">
            <a>Unschedule</a><a href="/Checkout">Register</a>
          </div>
          <div id="schedN_regN_13001" class="btn-group ... actionbar" style="display: none;">
            <a>Schedule</a><a>Remove</a>
          </div>
          <div id="schedY_regY_13001" class="btn-group ... actionbar" style="display: block;">
            <a>Unschedule</a>
          </div>
          <div id="schedN_regY_13001" class="btn-group ... actionbar" style="display: none;">
            <a>Schedule</a><a href="/Checkout">Drop</a>
          </div>
        </div>
      </span>
      <span class="section_row ..."
        ><span class="... table-headers-xsmall">Time: </span><span>01:00pm-01:50pm<br /></span
      ></span>
      <span class="section_row ..."
        ><span class="... table-headers-xsmall">Days: </span><span>MWF<br /></span
      ></span>
      <span class="section_row ..."
        ><span class="... table-headers-xsmall">Location: </span><span>ZHS159<br /></span
      ></span>
    </div>
  </div>
</div>
```

Key facts: `Time:`/`Days:`/`Location:` are sibling `<span>`s directly inside
`.section_crsbin` — same scope `webRegPage.ts` already iterates, no ancestor walk needed.
A section counts as actually registered (include in export) only when `schedY_regY_{id}`
or `schedN_regY_{id}` is `display: block`; the other two states mean bin-only or
scheduled-but-not-submitted, and must be excluded.

**Caveat: this markup was never independently re-verified against the live page in this
session** — it's from an earlier capture. Do a real spot-check (Inspect element on a live,
authenticated `/CourseBin` page with a registered section) before trusting it fully in a
fresh implementation. USC's markup has drifted before without notice (a building code was
silently renamed at some point).

## DST/VTIMEZONE library research (empirically tested, not doc-sourced)

Tested against a real failure case: weekly Tue/Thu 10:00–11:50am Pacific, Aug 25–Dec 10
2026, crossing the Nov 1 2026 fall-back.

- `ics` (adamgibbons) — **broken for this case**. No `TZID`/`VTIMEZONE` support at all.
  `utc` mode emits a UTC `DTSTART` with a bare weekly `RRULE`, which recurs by a _fixed_
  UTC offset forever — after the DST transition it silently lands an hour off. `local`
  mode emits floating time with zero timezone info.
- `ical-generator` alone — emits correct `DTSTART;TZID=America/Los_Angeles:...` wall-clock
  form, but ships no `VTIMEZONE` block by default, which RFC 5545 requires whenever a
  `TZID` is referenced.
- `ical-generator` + `timezones-ical-library` — **correct**, produces a real `VTIMEZONE`
  with accurate `DAYLIGHT`/`STANDARD` subcomponents. **But the documented integration
  crashes as-written**: `tzlib_get_ical_block()` returns `[icsBlockString, tzidLine]` (an
  array), not the plain string `ical-generator`'s `.replace()` call expects. Needs a
  one-line adapter: `generator: (tz) => tzlib_get_ical_block(tz)[0]`. Confirmed by actually
  running it (`TypeError: n.replace is not a function`), then fixing and re-verifying.
- `rrule` alone doesn't solve this — it's a recurrence-expansion engine, not an ICS/
  VTIMEZONE writer.

**Conclusion: `ical-generator` + `timezones-ical-library`, with the adapter wrapper.**

## Term dates / holidays

Real Spring/Summer/Fall 2026 dates were pulled from `arr.usc.edu` (USC's actual registrar
— note: a naive web search for USC surfaces University of South Carolina results first;
discard those). Fall 2026 specifically: instruction Aug 24–Dec 4, finals Dec 9–16,
holidays Sep 7 (Labor Day), Oct 8–9 (Fall Recess), Nov 11 (Veterans Day), Nov 25–29
(Thanksgiving — a real 5-day span, not just Thu–Fri; this was a genuine correction made
after cross-checking two disagreeing sources earlier in a related project — don't let it
regress back to a 2-day assumption). Summer 2026 in the pulled data is a known
simplification — it only captures the outer bounding window; USC's real summer structure
has overlapping 6/8/12-week sessions this doesn't model.

## Building-code-to-name mapping

A verified ~225-entry code→name table exists (cross-referenced against multiple current
USC sources, e.g. `THH` → "Mark Taper Hall of Humanities", `KAP` → "Kaprielian Hall"). A
raw code is legal inside an ICS `LOCATION:` field, so a missing/wrong entry should always
fall back to the raw code — this is polish, never a blocker for export.

## Build tooling gotchas (this repo specifically)

- This is a **monorepo containing both the browser extension (WXT) and a separate Next.js
  web app**. Plain `pnpm dev` runs the Next.js app (`next dev`, port 3000) — NOT the
  extension. Don't assume `dev` means "the extension."
- Plain `pnpm` may not be on `PATH` — use `corepack pnpm <command>` as a fallback for
  install/lint/typecheck/test.
- `npx wxt dev` **fails** — WXT's CLI treats `dev` as a root-directory argument, not a
  subcommand, producing `Entrypoints directory not found: ./dev/entrypoints`. The correct
  command is **`npx wxt`** with no extra argument.
- The build output folder (`.output/chrome-mv3-dev` for dev builds) is a **hidden
  directory** — starts with a dot, invisible in Finder/file-picker dialogs by default.
  Press Cmd+Shift+. (period) to reveal hidden files when selecting it for
  chrome://extensions → Load Unpacked.
- **If the real, Chrome-Web-Store-installed version of this extension is enabled at the
  same time as a locally-loaded unpacked dev build, both inject their own copy of
  `insertExportButton`'s link onto the page.** Existing code explicitly deduplicates by
  removing the second matching `.exportCal` element found — meaning you can easily end up
  interacting with the OLD published extension's behavior while believing you're testing
  your local changes. Always disable the store version before testing a local build.

## Other things caught along the way, worth remembering

- jQuery throws at import time without a real `window`/`document` — this is why no
  existing file in this repo unit-tests DOM code directly.
- jsdom does not implement `.innerText` at all (a known jsdom limitation) — every existing
  `.innerText` call in this codebase would throw under jsdom without a scoped polyfill in
  the test file itself (don't change production code to work around a test-only gap).
- `:visible` (jQuery) silently never resolves true under jsdom or any non-layout DOM —
  checking inline `style.display` directly is the only reliable approach for the
  registration-state divs, in tests or otherwise.
- Watch for empty-list edge cases when building `EXDATE`/`exclude` arrays — an empty
  `exclude: []` produced an invalid blank `EXDATE;TZID=...:` line in one library; only set
  the field when genuinely non-empty.
