import {
  defaultPurse,
  resetPurse,
  type PurseState,
} from "@/lib/money/state";

// The purse lives in the browser so choices persist across navigation and
// refreshes (the server is stateless). One shared purse per browser — no auth.
const KEY = "zeroth.purse.v1";

export function loadPurse(): PurseState {
  if (typeof window === "undefined") return defaultPurse();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PurseState;
  } catch {
    /* fall through to default */
  }
  return defaultPurse();
}

export function savePurse(state: PurseState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    // Let other tabs / open pages know the purse changed.
    window.dispatchEvent(new Event("purse:changed"));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function resetAndSave(): PurseState {
  const next = resetPurse(loadPurse());
  savePurse(next);
  return next;
}

export { defaultPurse, type PurseState };
