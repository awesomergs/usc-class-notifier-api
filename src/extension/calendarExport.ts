// Real .ics generation for webreg.usc.edu/Calendar, replacing the old redirect-to-USC's-own-feed
// button for the classes it can already handle. Stage 1: no LOCATION, no holiday EXDATEs — see
// CALENDAR_EXPORT_NOTES.md and the Stage 1 plan for why.
//
// The Calendar page itself can't supply registration data (its embedded Kendo JSON pre-expands
// to literal dates with no term bounds — a confirmed dead end), so the click handler fetches
// /CourseBin same-origin and scrapes that instead, the same way getCurrentSchedule()
// (src/extension/schedule.ts) already fetches /Calendar from this content script.

import $ from "jquery";
import { toast } from "react-toastify";
import { generateICS, type Schedule } from "@/extension/ics";
import { resolveTerm } from "@/extension/uscTerms";
import { scrapeRegisteredSections } from "@/extension/courseBinDom";
import { COURSE_BIN_URL } from "@/extension/courseBinScrape";
import { getCurrentTerm } from "@/extension/getCurrentTerm";

export const ICS_EXPORT_BUTTON_CLASS = "usc-helper-ics-export";

function triggerDownload(icsText: string, filename: string) {
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function handleExportClick() {
  try {
    const termId = getCurrentTerm();
    if (!termId) {
      toast.error("Couldn't determine the current term — try reloading the page.");
      return;
    }
    const term = resolveTerm(termId);
    if (!term) {
      toast.error(`No term data for "${termId}" yet — this term isn't supported.`);
      return;
    }

    const response = await fetch(COURSE_BIN_URL);
    if (!response.ok) {
      toast.error("Couldn't load your course bin — try again in a moment.");
      return;
    }
    const html = await response.text();
    const courseBinDoc = new DOMParser().parseFromString(html, "text/html");

    const sections = scrapeRegisteredSections(courseBinDoc);
    if (sections.length === 0) {
      toast.error("No registered classes found to export.");
      return;
    }

    const schedule: Schedule = { term, sections };
    const icsText = generateICS(schedule);
    triggerDownload(icsText, `${term.id}-usc-schedule.ics`);
    toast.success(`Exported ${sections.length} class${sections.length === 1 ? "" : "es"} to .ics.`);
  } catch (e) {
    console.error(e);
    toast.error("Failed to export calendar — see console for details.");
  }
}

export function insertCalendarExportButton() {
  const exportPdfButton = $("#export");
  if (exportPdfButton.length === 0) {
    // Not the Calendar page's toolbar, or the markup has drifted — nothing to attach to.
    return;
  }

  $(`.${ICS_EXPORT_BUTTON_CLASS}`).remove();
  exportPdfButton.after(
    `<button type="button" class="${ICS_EXPORT_BUTTON_CLASS} btn btn-default" style="margin-left: 8px;">Export as .ics</button>`,
  );
  $(`.${ICS_EXPORT_BUTTON_CLASS}`)
    .off("click.usc-helper-ics-export")
    .on("click.usc-helper-ics-export", handleExportClick);
}
