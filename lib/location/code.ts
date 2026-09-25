export type LocationType = "classic" | "dynamic";

export const ORDRE_LAST = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ZONE_IDS = "12";
export const ESPACE_IDS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const POSITION_IDS = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const MAX_RANGE_SIZE = 1000;
export const MAX_RANGES = 10;
export const MAX_TOTAL_LABELS = 1000;

export const LOCATION_REGEX = /^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$/;
export const CLASSIC_LOCATION_REGEX = /^[12][A-Z][1-9A-Z][0-9A-Z]$/;
export const DYNAMIC_LOCATION_REGEX = /^[12]#D[0-9A-Z]$/;

export function isLocationCodeValid(code: string): boolean {
  return LOCATION_REGEX.test(code);
}

export function isLocationCodeOfType(
  code: string,
  type: LocationType
): boolean {
  return type === "classic"
    ? CLASSIC_LOCATION_REGEX.test(code)
    : DYNAMIC_LOCATION_REGEX.test(code);
}