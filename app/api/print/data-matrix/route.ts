import { dataMatrixRequestSchema } from "@/lib/data-matrix/validate";
import { createPrintPostHandler } from "@/lib/print/route-handler";
import { buildDataMatrixZpl, dataMatrixFits } from "@/lib/zpl/data-matrix";

const FIT_MESSAGE =
  "Le contenu ou la légende ne tient pas sur ce format. " +
  "Raccourcissez ou changez de format.";

export const POST = createPrintPostHandler({
  schema: dataMatrixRequestSchema,
  build: (data, { widthDots, heightDots, rotated }) => ({
    zpl: buildDataMatrixZpl({
      content: data.content,
      legend: data.legend,
      quantity: data.quantity,
      widthDots,
      heightDots,
      rotated,
      inline: data.inline,
    }),
    body: { status: "sent", labels: data.quantity },
  }),
  validate: (data, { widthDots, heightDots, rotated }) =>
    dataMatrixFits({
      content: data.content,
      legend: data.legend,
      widthDots,
      heightDots,
      rotated,
      inline: data.inline,
    })
      ? null
      : { code: "VALIDATION_ERROR", message: FIT_MESSAGE },
});
