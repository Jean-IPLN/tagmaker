import { labelRequestSchema } from "@/lib/ean13/validate";
import { createPrintPostHandler } from "@/lib/print/route-handler";
import { buildEan13Zpl } from "@/lib/zpl/build";

export const POST = createPrintPostHandler({
  schema: labelRequestSchema,
  build: (data, { widthDots, heightDots, rotated }) => ({
    zpl: buildEan13Zpl({
      ean13: data.ean13,
      quantity: data.quantity,
      widthDots,
      heightDots,
      rotated,
    }),
    body: { status: "sent", quantity: data.quantity },
  }),
});
