// Dark mode for webreg.usc.edu/Calendar. Themes the page chrome (masthead, tabs, buttons, the
// Kendo Scheduler grid) via src/styles/webregDark.css; event and legend item colors are left
// exactly as WebReg sets them.

export const DARK_MODE_CLASS = "usc-helper-dark";
const DARK_MODE_MIRROR_KEY = "usc-helper-dark-mode";

export function isCalendarPage(href: string = window.location.href): boolean {
  try {
    return new URL(href).pathname.toLowerCase().startsWith("/calendar");
  } catch {
    return false;
  }
}

export function shouldEnableDarkMode(options: { enabled: boolean; darkMode: boolean }, href?: string): boolean {
  return options.enabled && options.darkMode && isCalendarPage(href);
}

let active = false;

export function setDarkModeActive(enabled: boolean) {
  if (enabled === active) {
    return;
  }
  active = enabled;
  document.documentElement.classList.toggle(DARK_MODE_CLASS, enabled);
  try {
    localStorage.setItem(DARK_MODE_MIRROR_KEY, enabled ? "1" : "0");
  } catch {
    // localStorage can throw under strict cookie/site-data settings; the mirror is only a
    // first-paint optimization, so failing silently is safe.
  }
}

/**
 * Reads a synchronous localStorage mirror of the dark-mode setting so a document_start content
 * script can apply the class before first paint, without waiting on the async storage API. Must
 * be reconciled with the authoritative value once it loads (see darkMode.content.ts).
 */
export function readDarkModeMirror(): boolean {
  try {
    return localStorage.getItem(DARK_MODE_MIRROR_KEY) === "1";
  } catch {
    return false;
  }
}
