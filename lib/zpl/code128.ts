import { clamp, computeBarcodeLayout } from "@/lib/zpl/layout";
import {
  computeRotatedLocationBox,
  ROTATED_MARGIN_DOTS,
} from "@/lib/zpl/rotated-layout";

export interface BuildCode128ZplInput {
  codes: string[];
  quantity?: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
}

export const MAX_CODE128_LENGTH = 80;
export const MIN_MODULE_WIDTH = 2;

const CHAR_MODULES = 11;
const CODE_128_BASE_MODULES = 35;
const QUIET_MODULES = 20;
const MAX_MODULE_WIDTH = 8;
const TARGET_HEIGHT_COVERAGE = 0.9;
const MIN_BAR_HEIGHT_DOTS = 51;
const TEXT_HEIGHT_RATIO = 0.18;
const TEXT_HEIGHT_MIN = 25;
const TEXT_HEIGHT_MAX = 110;
// Police E (OCR-B) bitmap 28×15 dots @203 dpi : la hauteur ^AEN n'est
// appliquée que par multiples de 28 (la cellule native) — on monte au
// multiple supérieur pour que le texte réellement imprimé suive le calcul.
const OCR_B_CELL_HEIGHT = 28;
const TEXT_GAP_RATIO = 0.15;
const OCR_B_WIDTH_RATIO = 0.48;
const CHAR_ADVANCE_RATIO = 0.52;

// Sous-ensemble B : >, ^ et ~ sont réservés par ^BC et doivent passer par
// leurs codes d'invocation, sinon le caractère disparaît du code-barres.
const CODE128_ESCAPES: Record<string, string> = {
  ">": ">0",
  "^": "><",
  "~": ">=",
};
const TEXT_ESCAPES: Record<string, string> = {
  "^": "_5E",
  "~": "_7E",
  _: "_5F",
};

export function escapeCode128Data(value: string): string {
  return value.replace(/[>^~]/g, (char) => CODE128_ESCAPES[char]);
}

export function escapeTextData(value: string): string {
  return value.replace(/[\^~_]/g, (char) => TEXT_ESCAPES[char]);
}

export function code128SymbolModules(length: number): number {
  return CHAR_MODULES * length + CODE_128_BASE_MODULES;
}

export function maxCode128Length({
  widthDots,
  heightDots,
  rotated = false,
}: {
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
}): number {
  const axis = rotated ? heightDots : widthDots;
  const modulesLimit = Math.floor(
    (axis / MIN_MODULE_WIDTH - QUIET_MODULES - CODE_128_BASE_MODULES) /
      CHAR_MODULES
  );
  const textAdvance = Math.round(OCR_B_CELL_HEIGHT * CHAR_ADVANCE_RATIO);
  const textLimit = Math.floor(
    (axis - 2 * ROTATED_MARGIN_DOTS) / textAdvance
  );
  return Math.max(0, Math.min(MAX_CODE128_LENGTH, modulesLimit, textLimit));
}

export function code128Fits(
  content: string,
  dimensions: { widthDots: number; heightDots: number; rotated?: boolean }
): boolean {
  return content.length <= maxCode128Length(dimensions);
}

function computeTextHeight(
  codeLength: number,
  widthDots: number,
  heightDots: number,
  rotated: boolean
): number {
  const referenceAxis = rotated ? widthDots : heightDots;
  const desiredTextHeight = clamp(
    Math.round(referenceAxis * TEXT_HEIGHT_RATIO),
    TEXT_HEIGHT_MIN,
    TEXT_HEIGHT_MAX
  );
  const textHeight =
    Math.ceil(desiredTextHeight / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT;

  // Le texte court le long du grand axe : sa largeur doit tenir entre les
  // marges, sinon il déborde de l'étiquette.
  const textAxis = rotated ? heightDots : widthDots;
  const maxTextWidth = textAxis - 2 * ROTATED_MARGIN_DOTS;
  const maxTextHeight = maxTextWidth / (codeLength * CHAR_ADVANCE_RATIO);
  return Math.min(
    textHeight,
    Math.floor(maxTextHeight / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT
  );
}

function buildSingleLabel({
  code,
  layout,
  widthDots,
  heightDots,
  rotated,
  textHeight,
  gap,
  quantity,
}: {
  code: string;
  layout: ReturnType<typeof computeBarcodeLayout>;
  widthDots: number;
  heightDots: number;
  rotated: boolean;
  textHeight: number;
  gap: number;
  quantity?: number;
}): string {
  const wCell = Math.round(textHeight * OCR_B_WIDTH_RATIO);
  const textWidth = code.length * wCell;
  const barcodeData = escapeCode128Data(code);
  const textData = escapeTextData(code);
  const textHex = textData === code ? "" : "^FH";

  let barcodeField: string;
  let textField: string;

  if (rotated) {
    const box = computeRotatedLocationBox(
      widthDots,
      heightDots,
      layout,
      textHeight,
      gap,
      textWidth
    );
    barcodeField = `^FO${box.x},${box.y}^BCB,${box.barHeight},N,N,N`;
    textField = `^FO${box.textX},0^AEB,${textHeight},${wCell}^FB${heightDots},1,0,C${textHex}^FD${textData}^FS`;
  } else {
    const yText = layout.y + layout.barHeight + gap;
    barcodeField = `^FO${layout.x},${layout.y}^BCN,${layout.barHeight},N,N,N`;
    textField = `^FO0,${yText}^AEN,${textHeight},${wCell}^FB${widthDots},1,0,C${textHex}^FD${textData}^FS`;
  }

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${layout.moduleWidth},3,${layout.barHeight}`,
    barcodeField,
    `^FD${barcodeData}^FS`,
    textField,
    ...(quantity !== undefined ? [`^PQ${quantity}`] : []),
    "^XZ",
  ].join("\r\n");
}

export function buildCode128Zpl({
  codes,
  quantity,
  widthDots,
  heightDots,
  rotated = false,
}: BuildCode128ZplInput): string {
  const codeLength = codes[0]?.length ?? 0;
  if (codeLength === 0) {
    return "";
  }

  const symbolModules = code128SymbolModules(codeLength);
  const totalModules = symbolModules + QUIET_MODULES;
  const textHeight = computeTextHeight(
    codeLength,
    widthDots,
    heightDots,
    rotated
  );

  const gap = Math.round(textHeight * TEXT_GAP_RATIO);

  const layout = computeBarcodeLayout({
    widthDots: rotated ? heightDots : widthDots,
    heightDots: rotated ? widthDots : heightDots,
    totalModules,
    symbolModules,
    minModuleWidth: MIN_MODULE_WIDTH,
    maxModuleWidth: MAX_MODULE_WIDTH,
    textHeightDots: textHeight,
    textGapDots: gap,
    targetHeightCoverage: TARGET_HEIGHT_COVERAGE,
    minBarHeightDots: MIN_BAR_HEIGHT_DOTS,
  });

  return codes
    .map(
      (code, index) =>
        buildSingleLabel({
          code,
          layout,
          widthDots,
          heightDots,
          rotated,
          textHeight,
          gap,
          quantity: index === 0 && codes.length === 1 ? quantity : undefined,
        })
    )
    .join("\r\n");
}
