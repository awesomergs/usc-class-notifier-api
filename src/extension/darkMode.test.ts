import assert from "node:assert/strict";
import test from "node:test";
import { isDarkModeSupportedPage, shouldEnableDarkMode } from "@/extension/darkMode";

test("isDarkModeSupportedPage matches Calendar and CourseBin paths, case-insensitively", () => {
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/Calendar"), true);
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/calendar/details"), true);
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/CourseBin"), true);
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/coursebin/details"), true);
});

test("isDarkModeSupportedPage rejects other WebReg pages and invalid URLs", () => {
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/Checkout"), false);
  assert.equal(isDarkModeSupportedPage("https://webreg.usc.edu/myInfo"), false);
  assert.equal(isDarkModeSupportedPage("not a url"), false);
});

test("shouldEnableDarkMode requires the extension enabled, the setting on, and a supported page", () => {
  const calendarUrl = "https://webreg.usc.edu/Calendar";
  const courseBinUrl = "https://webreg.usc.edu/CourseBin";
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: true }, calendarUrl), true);
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: true }, courseBinUrl), true);
  assert.equal(shouldEnableDarkMode({ enabled: false, darkMode: true }, courseBinUrl), false);
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: false }, courseBinUrl), false);
  assert.equal(shouldEnableDarkMode({ enabled: true, darkMode: true }, "https://webreg.usc.edu/Checkout"), false);
});
