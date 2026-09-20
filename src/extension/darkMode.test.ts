import assert from "node:assert/strict";
import test from "node:test";
import { isCalendarPage, shouldEnableDarkMode } from "@/extension/darkMode";

test("isCalendarPage matches only the WebReg Calendar path, case-insensitively", () => {
  assert.equal(isCalendarPage("https://webreg.usc.edu/Calendar"), true);
  assert.equal(isCalendarPage("https://webreg.usc.edu/calendar/details"), true);
  assert.equal(isCalendarPage("https://webreg.usc.edu/myCourseBin"), false);
  assert.equal(isCalendarPage("not a url"), false);
});

test("shouldEnableDarkMode requires the extension enabled, the setting on, and the Calendar page", () => {
  const calendarUrl = "https://webreg.usc.edu/Calendar";
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: true }, calendarUrl), true);
  assert.equal(shouldEnableDarkMode({ enabled: false, darkMode: true }, calendarUrl), false);
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: false }, calendarUrl), false);
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: true }, "https://webreg.usc.edu/myCourseBin"), false);
});
