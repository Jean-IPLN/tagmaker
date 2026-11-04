import type { z } from "zod";

import { env } from "@/lib/env";
import { isRotatable } from "@/lib/orientation";
import { sizeById } from "@/lib/paper-sizes";
import { sendToPrinter } from "@/lib/printer/send";
import { getPaperSizes, resolveDimensions } from "@/lib/zpl/dimensions";

export interface PrintRequestData {
  paperId?: string;
  printerAddress?: string;
  rotated?: boolean;
}

export interface PrintBuildContext {
  widthDots: number;
  heightDots: number;
  rotated: boolean;
}

export interface PrintBuildResult {
  zpl: string;
  body: Record<string, unknown>;
}

export interface PrintValidationError {
  code: string;
  message: string;
}

export interface PrintHandlerConfig<T extends PrintRequestData> {
  schema: z.ZodType<T>;
  build: (data: T, context: PrintBuildContext) => PrintBuildResult;
  validate?: (data: T, context: PrintBuildContext) => PrintValidationError | null;
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export function createPrintPostHandler<T extends PrintRequestData>({
  schema,
  build,
  validate,
}: PrintHandlerConfig<T>): (request: Request) => Promise<Response> {
  let currentPrint: Promise<Record<string, unknown>> | null = null;

  return async function POST(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        422,
        "VALIDATION_ERROR",
        "Le corps de la requête doit être un JSON valide."
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Saisie invalide.";
      return errorResponse(422, "VALIDATION_ERROR", message);
    }

    const data = parsed.data;
    const { paperId, printerAddress } = data;
    const rotated = data.rotated ?? false;

    if (paperId && !sizeById(paperId, getPaperSizes())) {
      return errorResponse(
        422,
        "VALIDATION_ERROR",
        `Format de papier inconnu : ${paperId}.`
      );
    }

    if (rotated) {
      const sizes = getPaperSizes();
      const size = paperId ? sizeById(paperId, sizes) : sizes[0];
      if (!size || !isRotatable(size, env.ZPL_RESOLUTION_DPI)) {
        return errorResponse(
          422,
          "VALIDATION_ERROR",
          "Format inutilisable en orientation pivotée."
        );
      }
    }

    let context: PrintBuildContext;
    try {
      context = { ...resolveDimensions(paperId), rotated };
    } catch {
      return errorResponse(
        503,
        "PRINTER_UNAVAILABLE",
        "Imprimante injoignable ou envoi échoué."
      );
    }

    const invalid = validate?.(data, context);
    if (invalid) {
      return errorResponse(422, invalid.code, invalid.message);
    }

    if (currentPrint) {
      return errorResponse(
        409,
        "PRINT_IN_PROGRESS",
        "Une impression est déjà en cours."
      );
    }

    const target = printerAddress
      ? { host: printerAddress, port: env.ZPL_PRINTER_PORT }
      : undefined;

    const print = (async () => {
      const { zpl, body: resultBody } = build(data, context);
      await sendToPrinter(zpl, target);
      return resultBody;
    })();
    currentPrint = print;

    try {
      return Response.json(await print);
    } catch {
      return errorResponse(
        503,
        "PRINTER_UNAVAILABLE",
        "Imprimante injoignable ou envoi échoué."
      );
    } finally {
      currentPrint = null;
    }
  };
}
