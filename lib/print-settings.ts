export interface PrintSettings {
  paperId?: string;
  printerAddress?: string;
}

export const PRINT_SETTINGS_COOKIE_NAME = "tagmaker_print_settings";
export const PRINT_SETTINGS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function parsePrintSettings(raw: string): PrintSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const candidate = parsed as Record<string, unknown>;
  if ("paperId" in candidate && typeof candidate.paperId !== "string") {
    return {};
  }
  if (
    "printerAddress" in candidate &&
    typeof candidate.printerAddress !== "string"
  ) {
    return {};
  }

  const settings: PrintSettings = {};
  if (typeof candidate.paperId === "string") {
    settings.paperId = candidate.paperId;
  }
  if (typeof candidate.printerAddress === "string") {
    settings.printerAddress = candidate.printerAddress;
  }
  return settings;
}

export function serializePrintSettings(settings: PrintSettings): string {
  return JSON.stringify(settings);
}