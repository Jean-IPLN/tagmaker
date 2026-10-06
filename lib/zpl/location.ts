import { clamp, computeBarcodeLayout } from "@/lib/zpl/layout";
import {
  computeRotatedLocationBox,
  ROTATED_MARGIN_DOTS,
} from "@/lib/zpl/rotated-layout";

export interface BuildLocationZplInput {
  codes: string[];
  quantity?: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
}

const CHAR_MODULES = 11;
const CODE_128_BASE_MODULES = 35;
export const SYMBOL_MODULES = CHAR_MODULES * 4 + CODE_128_BASE_MODULES;
const QUIET_MODULES = 20;
const TOTAL_MODULES = SYMBOL_MODULES + QUIET_MODULES;
export const MIN_MODULE_WIDTH = 2;
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
  const advance = Math.round(textHeight * CHAR_ADVANCE_RATIO);
  const textWidth = code.length * advance;

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
    textField = `^FO${box.textX},${box.textY}^AEB,${textHeight},${wCell}^FD${code}^FS`;
  } else {
    const xText = layout.x + Math.round((layout.barsWidth - textWidth) / 2);
    const yText = layout.y + layout.barHeight + gap;
    barcodeField = `^FO${layout.x},${layout.y}^BCN,${layout.barHeight},N,N,N`;
    textField = `^FO${xText},${yText}^AEN,${textHeight},${wCell}^FD${code}^FS`;
  }

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${layout.moduleWidth},3,${layout.barHeight}`,
    barcodeField,
    `^FD${code}^FS`,
    textField,
    ...(quantity !== undefined ? [`^PQ${quantity}`] : []),
    "^XZ",
  ].join("\r\n");
}

export function buildLocationZpl({
  codes,
  quantity,
  widthDots,
  heightDots,
  rotated = false,
}: BuildLocationZplInput): string {
  const codeLength = codes[0]?.length ?? 0;
  const textAxis = rotated ? widthDots : heightDots;
  const desiredTextHeight = clamp(
    Math.round(textAxis * TEXT_HEIGHT_RATIO),
    TEXT_HEIGHT_MIN,
    TEXT_HEIGHT_MAX
  );
  let textHeight =
    Math.ceil(desiredTextHeight / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT;

  if (rotated) {
    // En rotation, le texte court verticalement le long du côté court :
    // 4 caractères de largeur OCR-B (advance 0.52 × hauteur) doivent tenir
    // entre les deux marges, sinon le texte déborde de l'étiquette.
    const maxTextWidth = heightDots - 2 * ROTATED_MARGIN_DOTS;
    const maxTextHeight = maxTextWidth / (codeLength * CHAR_ADVANCE_RATIO);
    textHeight = Math.min(
      textHeight,
      Math.floor(maxTextHeight / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT
    );
  }

  const gap = Math.round(textHeight * TEXT_GAP_RATIO);

  const layout = computeBarcodeLayout({
    widthDots: rotated ? heightDots : widthDots,
    heightDots: rotated ? widthDots : heightDots,
    totalModules: TOTAL_MODULES,
    symbolModules: SYMBOL_MODULES,
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