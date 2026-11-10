import { escapeTextData } from "@/lib/zpl/code128";
import { clamp } from "@/lib/zpl/layout";
import { ROTATED_MARGIN_DOTS } from "@/lib/zpl/rotated-layout";

export interface BuildDataMatrixZplInput {
  content: string;
  legend?: string;
  quantity?: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
  inline?: boolean;
}

interface DataMatrixCapacity {
  modules: number;
  capacity: number;
}

const CAPACITIES: DataMatrixCapacity[] = [
  { modules: 10, capacity: 3 },
  { modules: 12, capacity: 5 },
  { modules: 14, capacity: 8 },
  { modules: 16, capacity: 12 },
  { modules: 18, capacity: 18 },
  { modules: 20, capacity: 22 },
  { modules: 22, capacity: 30 },
  { modules: 24, capacity: 36 },
  { modules: 26, capacity: 44 },
  { modules: 32, capacity: 62 },
  { modules: 36, capacity: 86 },
  { modules: 40, capacity: 114 },
  { modules: 44, capacity: 144 },
  { modules: 48, capacity: 174 },
  { modules: 52, capacity: 204 },
  { modules: 64, capacity: 280 },
];

const MARGIN_DOTS = ROTATED_MARGIN_DOTS;
const QUIET_MODULES_PER_SIDE = 1;
const MIN_MODULE_SIZE = 2;
const MAX_MODULE_SIZE = 8;
const OCR_B_CELL_HEIGHT = 28;
const LEGEND_HEIGHT_MIN = 28;
const LEGEND_HEIGHT_MAX = 112;
const LEGEND_HEIGHT_RATIO = 0.18;
const LEGEND_GAP_RATIO = 0.15;
const OCR_B_WIDTH_RATIO = 0.48;
const CHAR_ADVANCE_RATIO = 0.52;

const CONTENT_ESCAPES: Record<string, string> = {
  _: "__",
  "^": "_d094",
  "~": "_d126",
};

interface DataMatrixLayout {
  dimension: number;
  moduleSize: number;
  symbolSize: number;
  symbolX: number;
  symbolY: number;
  legendHeight: number;
  legendCellWidth: number;
  textX: number;
  textY: number;
  textFieldWidth: number;
  inline: boolean;
}

interface DataMatrixLayoutInput {
  content: string;
  legend?: string;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
  inline?: boolean;
}

export function dataMatrixSymbolDimension(length: number): number {
  const entry = CAPACITIES.find(({ capacity }) => capacity >= length);
  return entry?.modules ?? 64;
}

export function escapeDataMatrixData(value: string): string {
  return value.replace(/[_^~]/g, (char) => CONTENT_ESCAPES[char]);
}

export function dataMatrixFits(input: DataMatrixLayoutInput): boolean {
  return computeDataMatrixLayout(input) !== null;
}

function computeLegendHeight(
  legend: string,
  textAxis: number,
  smallAxis: number
): number {
  if (legend.length === 0) {
    return 0;
  }

  const desired = clamp(
    Math.round(smallAxis * LEGEND_HEIGHT_RATIO),
    LEGEND_HEIGHT_MIN,
    LEGEND_HEIGHT_MAX
  );
  const start = Math.ceil(desired / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT;
  const available = textAxis - 2 * MARGIN_DOTS;

  for (let height = start; height >= LEGEND_HEIGHT_MIN; height -= OCR_B_CELL_HEIGHT) {
    const advance = Math.round(height * CHAR_ADVANCE_RATIO);
    if (legend.length * advance <= available) {
      return height;
    }
  }

  return 0;
}

function computeInlineLayout(
  content: string,
  legend: string,
  widthDots: number,
  heightDots: number
): DataMatrixLayout | null {
  const dimension = dataMatrixSymbolDimension(content.length);
  const availableWidth = widthDots - 2 * MARGIN_DOTS;
  const availableHeight = heightDots - 2 * MARGIN_DOTS;
  const span = dimension + 2 * QUIET_MODULES_PER_SIDE;
  const moduleMax = clamp(
    Math.floor(availableHeight / span),
    MIN_MODULE_SIZE,
    MAX_MODULE_SIZE
  );
  const desired = clamp(
    Math.round(Math.min(widthDots, heightDots) * LEGEND_HEIGHT_RATIO),
    LEGEND_HEIGHT_MIN,
    LEGEND_HEIGHT_MAX
  );
  const heightMax =
    Math.floor(availableHeight / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT;

  if (heightMax < LEGEND_HEIGHT_MIN) {
    return null;
  }

  const start = Math.min(
    Math.ceil(desired / OCR_B_CELL_HEIGHT) * OCR_B_CELL_HEIGHT,
    Math.min(heightMax, LEGEND_HEIGHT_MAX)
  );

  for (let moduleSize = moduleMax; moduleSize >= MIN_MODULE_SIZE; moduleSize--) {
    const symbolSize = dimension * moduleSize;
    if (symbolSize > availableHeight) {
      continue;
    }

    const remainingWidth = availableWidth - symbolSize;
    if (remainingWidth <= 0) {
      continue;
    }

    for (
      let legendHeight = start;
      legendHeight >= LEGEND_HEIGHT_MIN;
      legendHeight -= OCR_B_CELL_HEIGHT
    ) {
      const advance = Math.round(legendHeight * CHAR_ADVANCE_RATIO);
      const gap = Math.round(legendHeight * LEGEND_GAP_RATIO);
      const textWidth = legend.length * advance;

      if (textWidth + gap > remainingWidth) {
        continue;
      }

      const blockWidth = symbolSize + gap + textWidth;
      const symbolX = Math.round((widthDots - blockWidth) / 2);
      const textX = symbolX + symbolSize + gap;
      return {
        dimension,
        moduleSize,
        symbolSize,
        symbolX,
        symbolY: Math.round((heightDots - symbolSize) / 2),
        legendHeight,
        legendCellWidth: Math.round(legendHeight * OCR_B_WIDTH_RATIO),
        textX,
        textY: Math.round((heightDots - legendHeight) / 2),
        textFieldWidth: widthDots - MARGIN_DOTS - textX,
        inline: true,
      };
    }
  }

  return null;
}

function computeDataMatrixLayout({
  content,
  legend = "",
  widthDots,
  heightDots,
  rotated = false,
  inline = false,
}: DataMatrixLayoutInput): DataMatrixLayout | null {
  const dimension = dataMatrixSymbolDimension(content.length);

  if (!rotated && inline && legend.length > 0) {
    return computeInlineLayout(content, legend, widthDots, heightDots);
  }

  const textAxis = rotated ? heightDots : widthDots;
  const smallAxis = Math.min(widthDots, heightDots);
  const legendHeight = computeLegendHeight(legend, textAxis, smallAxis);

  if (legend.length > 0 && legendHeight === 0) {
    return null;
  }

  const gap = legendHeight > 0 ? Math.round(legendHeight * LEGEND_GAP_RATIO) : 0;
  const legendSpan = legendHeight + gap;
  const availableWidth =
    widthDots - 2 * MARGIN_DOTS - (rotated ? legendSpan : 0);
  const availableHeight =
    heightDots - 2 * MARGIN_DOTS - (rotated ? 0 : legendSpan);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return null;
  }

  const span = dimension + 2 * QUIET_MODULES_PER_SIDE;
  const moduleSize = clamp(
    Math.floor(Math.min(availableWidth, availableHeight) / span),
    MIN_MODULE_SIZE,
    MAX_MODULE_SIZE
  );
  const symbolSize = dimension * moduleSize;

  if (symbolSize > availableWidth || symbolSize > availableHeight) {
    return null;
  }

  const legendCellWidth = Math.round(legendHeight * OCR_B_WIDTH_RATIO);

  if (rotated) {
    const blockWidth = symbolSize + legendSpan;
    const blockLeft = Math.round((widthDots - blockWidth) / 2);
    return {
      dimension,
      moduleSize,
      symbolSize,
      symbolX: blockLeft,
      symbolY: Math.round((heightDots - symbolSize) / 2),
      legendHeight,
      legendCellWidth,
      textX: blockLeft + symbolSize + gap,
      textY: 0,
      textFieldWidth: heightDots,
      inline: false,
    };
  }

  const blockHeight = symbolSize + legendSpan;
  const blockTop = Math.round((heightDots - blockHeight) / 2);
  return {
    dimension,
    moduleSize,
    symbolSize,
    symbolX: Math.round((widthDots - symbolSize) / 2),
    symbolY: blockTop,
    legendHeight,
    legendCellWidth,
    textX: 0,
    textY: blockTop + symbolSize + gap,
    textFieldWidth: widthDots,
    inline: false,
  };
}

export function buildDataMatrixZpl({
  content,
  legend = "",
  quantity,
  widthDots,
  heightDots,
  rotated = false,
  inline = false,
}: BuildDataMatrixZplInput): string {
  if (content.length === 0) {
    return "";
  }

  const layout = computeDataMatrixLayout({
    content,
    legend,
    widthDots,
    heightDots,
    rotated,
    inline,
  });
  if (!layout) {
    return "";
  }

  const orientation = rotated ? "B" : "N";
  const forcedDimension = layout.dimension <= 48 ? layout.dimension : 0;
  const contentData = escapeDataMatrixData(content);
  const legendData = escapeTextData(legend);
  const legendHex = legendData === legend ? "" : "^FH";

  const lines = [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^FO${layout.symbolX},${layout.symbolY}^BX${orientation},${layout.moduleSize},200,${forcedDimension},${forcedDimension},6,_,1`,
    `^FD${contentData}^FS`,
  ];

  if (legend.length > 0) {
    if (rotated) {
      lines.push(
        `^FO${layout.textX},0^AEB,${layout.legendHeight},${layout.legendCellWidth}^FB${heightDots},1,0,C${legendHex}^FD${legendData}^FS`
      );
    } else {
      const alignment = layout.inline ? "L" : "C";
      lines.push(
        `^FO${layout.textX},${layout.textY}^AEN,${layout.legendHeight},${layout.legendCellWidth}^FB${layout.textFieldWidth},1,0,${alignment}${legendHex}^FD${legendData}^FS`
      );
    }
  }

  if (quantity !== undefined) {
    lines.push(`^PQ${quantity}`);
  }

  lines.push("^XZ");
  return lines.join("\r\n");
}
