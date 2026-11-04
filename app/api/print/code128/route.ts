import { code128RequestSchema } from "@/lib/code128/validate";
import { createPrintPostHandler } from "@/lib/print/route-handler";
import {
  buildCode128Zpl,
  code128Fits,
  maxCode128Length,
} from "@/lib/zpl/code128";

export const POST = createPrintPostHandler({
  schema: code128RequestSchema,
  build: (data, { widthDots, heightDots, rotated }) => ({
    zpl: buildCode128Zpl({
      codes: [data.content],
      quantity: data.quantity,
      widthDots,
      heightDots,
      rotated,
    }),
    body: { status: "sent", labels: data.quantity },
  }),
  validate: (data, { widthDots, heightDots, rotated }) => {
    const dimensions = { widthDots, heightDots, rotated };
    if (code128Fits(data.content, dimensions)) {
      return null;
    }
    return {
      code: "VALIDATION_ERROR",
      message: `Le contenu ne tient pas sur ce format (${maxCode128Length(
        dimensions
      )} caractères max).`,
    };
  },
});
