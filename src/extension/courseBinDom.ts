// DOM adapter for /CourseBin — selectors, the part that rots when the page changes. Kept in
// its own file, separate from courseBinScrape.ts's pure parsers, because jQuery throws at import
// time without a real window/document — pulling it into the same module as parseDays/
// parseTimeRange would make those untestable under node:test (see CALENDAR_EXPORT_NOTES.md).
//
// Targets /CourseBin specifically: it's the only page carrying both the Time:/Days: rows and
// the registration-state divs (schedY_regY_{id} etc.) needed to tell an actually-registered
// section apart from one that's merely sitting in the course bin. The Calendar page's embedded
// Kendo JSON was a confirmed dead end for this — no term boundaries, no recurrence, only the
// server's default week.
//
// Reuses this repo's own confirmed markup idiom rather than the ScheduleHelper+ prototype's DOM
// adapter (written against a different, unverified capture): course groupings are
// `.accordion-content-area` panels whose header sits at `.prev()` — see
// src/extension/webRegPage.ts's addUnitsToTitle and src/extension/notify.ts's course-code
// lookup, both of which already rely on this shape in production.

import $ from "jquery";
import { parseDays, parseTimeRange, expandLocation } from "@/extension/courseBinScrape";

export interface RawMeeting {
  days: string[];
  start?: string;
  end?: string;
  location?: string;
}

export interface RawSection {
  id: string;
  course: string;
  title: string;
  type: string;
  instructor: string;
  meetings: RawMeeting[];
}

// Exactly one of a section's action-state divs (schedY_regN_{id}, schedN_regN_{id},
// schedY_regY_{id}, schedN_regY_{id}) has style="display: block" at a time; its id encodes the
// section's real Scheduled/Registered flags. A section belongs in the export iff Registered=Y,
// regardless of Scheduled: schedN_regY is still currently registered (a drop pending at the next
// Checkout submission — hasn't taken effect yet), while schedY_regN was only ever scheduled in
// the planner, never actually registered. Read directly off the id, not the human-readable text
// in the sibling status divs, which says the same thing but is a less stable signal to parse.
function isRegistered(sectionEl: Element): boolean {
  const actionbars = $(sectionEl).find(".actionbar").toArray();
  for (const el of actionbars) {
    if (el.style.display !== "block") {
      continue;
    }
    const match = el.id.match(/^sched[YN]_reg([YN])_/);
    if (match) {
      return match[1] === "Y";
    }
  }
  return false;
}

// .innerText (not .textContent) so a <br>-separated multi-pattern value renders as newlines —
// same reason every existing selector in this file's siblings (webRegPage.ts, schedule.ts) reads
// .innerText rather than .textContent.
function labelStrippedText(row: HTMLElement): string {
  return (row.innerText || "").replace(/^[^:]*:\s*/, "").trim();
}

function labelStrippedLines(row: HTMLElement): string[] {
  return labelStrippedText(row)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function findRow(rows: HTMLElement[], label: string): HTMLElement | undefined {
  return rows.find((r) => r.innerText.includes(label));
}

function scrapeSection(sectionContainerEl: Element, course: string, title: string): RawSection | null {
  const id = sectionContainerEl.id.replace(/^section_/, "");
  const rows = $(sectionContainerEl).find(".section_row").toArray();

  const typeRow = findRow(rows, "Type:");
  const timeRow = findRow(rows, "Time:");
  const daysRow = findRow(rows, "Days:");
  const locationRow = findRow(rows, "Location:");
  const instructorRow = findRow(rows, "Instructor:");

  const type = typeRow ? labelStrippedText(typeRow) : "";
  const instructor = instructorRow ? labelStrippedLines(instructorRow).join("; ") : "";

  const timeLines = timeRow ? labelStrippedLines(timeRow) : [];
  const dayLines = daysRow ? labelStrippedLines(daysRow) : [];
  const locationLines = locationRow ? labelStrippedLines(locationRow) : [];

  const patternCount = Math.max(timeLines.length, dayLines.length, 1);
  const meetings: RawMeeting[] = [];
  for (let i = 0; i < patternCount; i++) {
    const days = parseDays(dayLines[i] ?? "");
    const range = parseTimeRange(timeLines[i] ?? "");
    if (days.length === 0 || !range) {
      continue; // async pattern — drop
    }
    const rawLocation = locationLines[i] ?? locationLines[0] ?? "";
    const location = rawLocation ? expandLocation(rawLocation) : undefined;
    meetings.push({ days, start: range.start, end: range.end, location });
  }

  return { id, course, title, type, instructor, meetings };
}

function parseCourseHeader(headerEl: HTMLElement | undefined): { course: string; title: string } | null {
  if (!headerEl) {
    return null;
  }
  const crsIdText = $(headerEl).find(".crsID").first().text().trim();
  const match = crsIdText.match(/^([A-Z]+)-(\d[\w]*)/i);
  if (!match) {
    return null;
  }
  const course = `${match[1]!.toUpperCase()} ${match[2]}`;
  const title = $(headerEl).find(".crsTitl").first().text().trim();
  return { course, title };
}

// Scrapes every actually-registered section out of a parsed /CourseBin document. Sections
// still sitting in the bin (never registered) and sections only scheduled-but-not-submitted are
// excluded. Defensive per-row: a single malformed course grouping is skipped and logged rather
// than aborting the whole export, matching this file's siblings (webRegPage.ts, schedule.ts).
export function scrapeRegisteredSections(doc: Document): RawSection[] {
  const sections: RawSection[] = [];

  $(".accordion-content-area", doc).each(function () {
    try {
      const header = parseCourseHeader($(this).prev()[0]);
      if (!header) {
        return;
      }

      const sectionEls = $(this).find(".section_crsbin").toArray();
      for (const sectionEl of sectionEls) {
        try {
          const container = sectionEl.closest(".section");
          if (!container || !isRegistered(container)) {
            continue;
          }

          const scraped = scrapeSection(container, header.course, header.title);
          if (scraped) {
            sections.push(scraped);
          }
        } catch (e) {
          console.error(e);
          console.error(`Failed to parse section ${sectionEl.id}!`);
        }
      }
    } catch (e) {
      console.error(e);
      console.error("Failed to parse a course grouping while scraping CourseBin!");
    }
  });

  return sections;
}
