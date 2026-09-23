export interface PaperSize {
  id: string;
  widthMm: number;
  heightMm: number;
  surfaceMm2: number;
  label: string;
}

export interface PaperSizeFallback {
  widthMm: number;
  heightMm: number;
}

const SIZE_PATTERN = /^\s*(\d+)\s*[xX]\s*(\d+)\s*$/;

export const DEFAULT_PAPER_SIZE: PaperSizeFallback = {
  widthMm: 40,
  heightMm: 25,
};

export function parsePaperSizes(
  raw: string | undefined,
  fallback: PaperSizeFallback
): PaperSize[] {
  const parsed = (raw ?? "")
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(parseToken)
    .filter((size): size is PaperSize => size !== null);

  const seen = new Set<string>();
  const unique: PaperSize[] = [];
  for (const size of parsed) {
    if (seen.has(size.id)) {
      continue;
    }
    seen.add(size.id);
    unique.push(size);
  }

  const sizes =
    unique.length > 0
      ? unique
      : [makeSize(fallback.widthMm, fallback.heightMm)];

  return sizes.slice().sort((a, b) => a.surfaceMm2 - b.surfaceMm2);
}

function parseToken(token: string): PaperSize | null {
  const match = SIZE_PATTERN.exec(token);
  if (!match) {
    return null;
  }
  const widthMm = Number(match[1]);
  const heightMm = Number(match[2]);
  if (widthMm <= 0 || heightMm <= 0) {
    return null;
  }
  return makeSize(widthMm, heightMm);
}

function makeSize(widthMm: number, heightMm: number): PaperSize {
  return {
    id: `${widthMm}x${heightMm}`,
    widthMm,
    heightMm,
    surfaceMm2: widthMm * heightMm,
    label: `${widthMm} × ${heightMm} mm`,
  };
}

export function sizeById(
  id: string,
  sizes: PaperSize[]
): PaperSize | undefined {
  return sizes.find((size) => size.id === id);
}