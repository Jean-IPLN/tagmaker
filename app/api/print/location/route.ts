import { locationRequestSchema } from "@/lib/location/validate";
import { expandRanges } from "@/lib/location/validate";
import { createPrintPostHandler } from "@/lib/print/route-handler";
import { buildLocationZpl } from "@/lib/zpl/location";

export const POST = createPrintPostHandler({
  schema: locationRequestSchema,
  build: (data, { widthDots, heightDots, rotated }) => {
    if (data.mode === "range") {
      const codes = expandRanges(data.ranges);
      return {
        zpl: buildLocationZpl({ codes, widthDots, heightDots, rotated }),
        body: { status: "sent", labels: codes.length },
      };
    }

    return {
      zpl: buildLocationZpl({
        codes: [data.code],
        quantity: data.quantity,
        widthDots,
        heightDots,
        rotated,
      }),
      body: { status: "sent", labels: data.quantity },
    };
  },
});
