import assert from "node:assert/strict";
import test from "node:test";
import { resolveTerm } from "@/extension/uscTerms";
import { generateICS, unfoldLines, type Schedule, type Term } from "@/extension/ics";

const CRLF = "\r\n";

const fall2026 = resolveTerm("20263")!;

test("Fall 2026 holidays are exactly the nine registrar dates, Fall Recess and Thanksgiving as separate day entries", () => {
  assert.deepEqual(
    fall2026.holidays!.map((h) => h.date),
    [
      "2026-09-07",
      "2026-10-08",
      "2026-10-09",
      "2026-11-11",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ],
  );
});

function eventBlockFor(icsText: string, sectionId: string): string {
  const unfolded = unfoldLines(icsText);
  // UIDs are "{termId}-{sectionId}-{meetingIndex}@...", so match on the section id as a
  // substring rather than assuming it directly follows "UID:".
  const block = unfolded.split(CRLF + "BEGIN:VEVENT").find((b) => b.includes(`-${sectionId}-`));
  assert.ok(block, `expected to find a VEVENT for section "${sectionId}"`);
  return block!;
}

function exdateLine(block: string): string | undefined {
  return block.split(CRLF).find((l) => l.startsWith("EXDATE"));
}

// One schedule covering all four locked-value cases: an MWF section, a TTh section, and a
// Tuesday-only section (the one weekday none of Fall 2026's nine holidays fall on).
const lockedValueSchedule: Schedule = {
  term: fall2026,
  sections: [
    {
      id: "30011R",
      course: "CSCI 201",
      title: "Principles of Software Development",
      type: "Lecture",
      instructor: "Prof. A. Rivera",
      meetings: [{ days: ["MO", "WE", "FR"], start: "10:00", end: "10:50" }],
    },
    {
      id: "30022R",
      course: "CSCI 104",
      title: "Foundations of Programming",
      type: "Lecture",
      instructor: "Prof. K. Chen",
      meetings: [{ days: ["TU", "TH"], start: "09:30", end: "10:50" }],
    },
    {
      id: "30033R",
      course: "MATH 226",
      title: "Calculus III",
      type: "Lecture",
      instructor: "Prof. L. Nguyen",
      meetings: [{ days: ["TU"], start: "13:00", end: "14:50" }],
    },
  ],
};

const lockedValueOutput = generateICS(lockedValueSchedule);

test("MWF section excludes exactly Sep 7, Oct 9, Nov 11, Nov 25, and Nov 27 — never Oct 8 or Nov 26", () => {
  const line = exdateLine(eventBlockFor(lockedValueOutput, "30011R"));
  assert.ok(line);
  for (const digits of ["20260907", "20261009", "20261111", "20261125", "20261127"]) {
    assert.ok(line!.includes(digits), `expected EXDATE to include ${digits}: ${line}`);
  }
  for (const digits of ["20261008", "20261126"]) {
    assert.ok(!line!.includes(digits), `did not expect EXDATE to include ${digits}: ${line}`);
  }
});

test("TTh section excludes exactly Oct 8 and Nov 26 — never the other five dates", () => {
  const line = exdateLine(eventBlockFor(lockedValueOutput, "30022R"));
  assert.ok(line);
  for (const digits of ["20261008", "20261126"]) {
    assert.ok(line!.includes(digits), `expected EXDATE to include ${digits}: ${line}`);
  }
  for (const digits of ["20260907", "20261009", "20261111", "20261125", "20261127"]) {
    assert.ok(!line!.includes(digits), `did not expect EXDATE to include ${digits}: ${line}`);
  }
});

test("a Tuesday-only section, which never overlaps any Fall 2026 holiday, produces zero EXDATEs — no EXDATE line at all, not an empty one", () => {
  const block = eventBlockFor(lockedValueOutput, "30033R");
  assert.equal(exdateLine(block), undefined);
  assert.ok(!block.includes("EXDATE"));
});

// A term with no holiday data at all — omitted field, and an explicit empty array — must still
// generate a valid calendar with zero EXDATEs and no thrown error.

function termWithoutHolidays(holidays: Term["holidays"]): Term {
  return {
    id: "20263",
    name: "USC Fall 2026",
    firstDay: fall2026.firstDay,
    lastDay: fall2026.lastDay,
    holidays,
  };
}

const noHolidaySection: Schedule["sections"] = [
  {
    id: "30011R",
    course: "CSCI 201",
    title: "Principles of Software Development",
    type: "Lecture",
    instructor: "Prof. A. Rivera",
    meetings: [{ days: ["MO", "WE", "FR"], start: "10:00", end: "10:50" }],
  },
];

test("a term with the holidays field omitted still generates a valid calendar with zero EXDATEs", () => {
  const schedule: Schedule = { term: termWithoutHolidays(undefined), sections: noHolidaySection };
  const output = generateICS(schedule);
  assert.ok(output.includes("BEGIN:VCALENDAR"));
  assert.ok(!output.includes("EXDATE"));
});

test("a term with an explicit empty holidays array still generates a valid calendar with zero EXDATEs", () => {
  const schedule: Schedule = { term: termWithoutHolidays([]), sections: noHolidaySection };
  const output = generateICS(schedule);
  assert.ok(output.includes("BEGIN:VCALENDAR"));
  assert.ok(!output.includes("EXDATE"));
});
