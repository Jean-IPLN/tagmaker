"use client";

import {
  MAX_RECENT_AGE_MS,
  RECENT_COOKIE_NAME,
  type RecentModuleEntry,
  decodeCookieValue,
  parseEntries,
  serializeEntries,
} from "@/lib/recent-modules";

export { RECENT_COOKIE_NAME };

const COOKIE_ATTRIBUTES = [
  "path=/",
  "SameSite=Lax",
  `Max-Age=${Math.round(MAX_RECENT_AGE_MS / 1000)}`,
].join("; ");

export function readRecentCookie(): RecentModuleEntry[] {
  const match = document.cookie.match(
    `(?:^|; )${RECENT_COOKIE_NAME}=([^;]*)`
  );
  if (!match) {
    return [];
  }
  return parseEntries(decodeCookieValue(match[1]));
}

export function writeRecentCookie(entries: RecentModuleEntry[]): void {
  try {
    document.cookie = `${RECENT_COOKIE_NAME}=${encodeURIComponent(
      serializeEntries(entries)
    )}; ${COOKIE_ATTRIBUTES}`;
  } catch {
    // échec silencieux : le suivi ne doit jamais faire planter l'accueil
  }
}