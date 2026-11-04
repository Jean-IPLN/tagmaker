import { buildCode128Zpl } from "@/lib/zpl/code128";
import type { BuildCode128ZplInput } from "@/lib/zpl/code128";

export { MIN_MODULE_WIDTH } from "@/lib/zpl/code128";
export { buildCode128Zpl as buildLocationZpl };

export type BuildLocationZplInput = BuildCode128ZplInput;

export const SYMBOL_MODULES = 11 * 4 + 35;
