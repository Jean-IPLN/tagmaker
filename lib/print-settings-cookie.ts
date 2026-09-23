"use client";

import {
  PRINT_SETTINGS_COOKIE_NAME,
  PRINT_SETTINGS_MAX_AGE_SECONDS,
  parsePrintSettings,
  serializePrintSettings,
  type PrintSettings,
} from "@/lib/print-settings";

export { PRINT_SETTINGS_COOKIE_NAME };

const COOKIE_ATTRIBUTES = [
  "path=/",
  "SameSite=Lax",
  `Max-Age=${PRINT_SETTINGS_MAX_AGE_SECONDS}`,
].join("; ");

export function readPrintSettings(): PrintSettings {
  const match = document.cookie.match(
    `(?:^|; )${PRINT_SETTINGS_COOKIE_NAME}=([^;]*)`
  );
  if (!match) {
    return {};
  }

  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return {};
  }
  return parsePrintSettings(raw);
}

export function writePrintSettings(settings: PrintSettings): void {
  try {
    const next = { ...readPrintSettings(), ...settings };
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      serializePrintSettings(next)
    )}; ${COOKIE_ATTRIBUTES}`;
  } catch {
    // échec silencieux : un réglage ne doit jamais faire planter l'interface
  }
}

export function clearPrintSettings(): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
}