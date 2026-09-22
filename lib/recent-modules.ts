export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RECENT_MODULES = 4;
export const MAX_RECENT_AGE_MS = 30 * DAY_MS;
export const RECENT_COOKIE_NAME = "tagmaker_recent_modules";

export interface RecentModuleEntry {
  moduleId: string;
  lastUsedAt: number;
}

export function recordModule(
  entries: RecentModuleEntry[],
  moduleId: string,
  timestamp: number
): RecentModuleEntry[] {
  const now = { moduleId, lastUsedAt: timestamp };
  const withoutDuplicate = entries.filter((entry) => entry.moduleId !== moduleId);
  return [now, ...withoutDuplicate].slice(0, MAX_RECENT_MODULES);
}

export function filterValidEntries(
  entries: RecentModuleEntry[],
  availableModuleIds: string[],
  now = Date.now()
): RecentModuleEntry[] {
  const available = new Set(availableModuleIds);
  return entries.filter(
    (entry) =>
      available.has(entry.moduleId) &&
      entry.lastUsedAt >= now - MAX_RECENT_AGE_MS
  );
}

export function getRecentModuleIds(
  entries: RecentModuleEntry[],
  availableModuleIds: string[],
  now = Date.now()
): string[] {
  const sorted = filterValidEntries(entries, availableModuleIds, now)
    .slice()
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of sorted) {
    if (seen.has(entry.moduleId)) {
      continue;
    }
    seen.add(entry.moduleId);
    ids.push(entry.moduleId);
    if (ids.length === MAX_RECENT_MODULES) {
      break;
    }
  }
  return ids;
}

export function serializeEntries(entries: RecentModuleEntry[]): string {
  return JSON.stringify(entries);
}

export function parseEntries(raw: string): RecentModuleEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRecentModuleEntry);
}

export function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isRecentModuleEntry(value: unknown): value is RecentModuleEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<RecentModuleEntry>;
  return (
    typeof candidate.moduleId === "string" &&
    typeof candidate.lastUsedAt === "number" &&
    Number.isInteger(candidate.lastUsedAt) &&
    candidate.lastUsedAt > 0
  );
}