import { z } from "zod";

import {
  ESPACE_IDS,
  LOCATION_REGEX,
  MAX_RANGE_SIZE,
  MAX_RANGES,
  MAX_TOTAL_LABELS,
  ORDRE_LAST,
  POSITION_IDS,
  isLocationCodeOfType,
  isLocationCodeValid,
} from "@/lib/location/code";

export { isLocationCodeOfType, isLocationCodeValid };

const locationTypeField = z.enum(["classic", "dynamic"], {
  error: "Le type d'emplacement doit être classique ou dynamique",
});

const paperIdField = z
  .string()
  .min(1, "Le format de papier est invalide")
  .optional();

const printerAddressField = z
  .ipv4({ error: "L'adresse IPv4 de l'imprimante est invalide" })
  .optional();

const locationCodeField = z
  .string({ error: "Le code emplacement est requis" })
  .regex(
    LOCATION_REGEX,
    "Le code emplacement doit contenir exactement 4 caractères : " +
      "1 ou 2, puis 'A-Z' + '1-9/A-Z' ou '#D', puis '0-9/A-Z'"
  );

function typeOrientationMessage(code: string): string {
  return code.includes("#D")
    ? "Un emplacement avec '#D' doit être imprimé en type Dynamique"
    : "Un emplacement avec un groupe lettre doit être imprimé en type Classique";
}

function rangeCharacterSets(code: string): readonly [string, string, string] {
  return code[1] === "#" && code[2] === "D"
    ? ["#", "D", ORDRE_LAST]
    : [ESPACE_IDS, POSITION_IDS, ORDRE_LAST];
}

function boxBounds(
  startCode: string,
  endCode: string
): { starts: number[]; ends: number[] } {
  const sets = rangeCharacterSets(startCode);
  const startOf = (char: string, axis: number): number =>
    sets[axis].indexOf(char);
  return {
    starts: [
      startOf(startCode[1], 0),
      startOf(startCode[2], 1),
      startOf(startCode[3], 2),
    ],
    ends: [
      startOf(endCode[1], 0),
      startOf(endCode[2], 1),
      startOf(endCode[3], 2),
    ],
  };
}

const singleSchema = z
  .object({
    mode: z.literal("single"),
    locationType: locationTypeField,
    code: locationCodeField,
    quantity: z
      .number({ error: "La quantité doit être un nombre" })
      .int("La quantité doit être un nombre entier")
      .min(1, "La quantité doit être au moins 1")
      .max(1000, "La quantité ne peut pas dépasser 1000"),
    paperId: paperIdField,
    printerAddress: printerAddressField,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!isLocationCodeOfType(data.code, data.locationType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: typeOrientationMessage(data.code),
      });
    }
  });

const rangeEntrySchema = z
  .object({
    startCode: locationCodeField,
    endCode: locationCodeField,
  })
  .strict();

const rangeSchema = z
  .object({
    mode: z.literal("range"),
    locationType: locationTypeField,
    ranges: z
      .array(rangeEntrySchema)
      .min(1, "Au moins une plage est requise")
      .max(
        MAX_RANGES,
        `Le nombre de plages ne peut pas dépasser ${MAX_RANGES}`
      ),
    paperId: paperIdField,
    printerAddress: printerAddressField,
  })
  .strict()
  .superRefine((data, ctx) => {
    const typeLabel = data.locationType === "classic" ? "Classique" : "Dynamique";
    const sizes: number[] = [];

    for (const [index, range] of data.ranges.entries()) {
      const plage = `Plage ${index + 1}`;
      const path: (string | number)[] = ["ranges", index, "startCode"];

      if (
        !isLocationCodeOfType(range.startCode, data.locationType) ||
        !isLocationCodeOfType(range.endCode, data.locationType)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${plage} : les bornes doivent être des emplacements ${typeLabel}`,
        });
        continue;
      }

      if (range.startCode[0] !== range.endCode[0]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${plage} : les bornes doivent appartenir à la même zone (1 ou 2)`,
        });
        continue;
      }

      const { starts, ends } = boxBounds(range.startCode, range.endCode);
      const isReversed = starts.some((start, axis) => start > ends[axis]);
      if (isReversed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${plage} : la fin de plage doit suivre le début (espace, puis position, puis sous-position)`,
        });
        continue;
      }

      const size = rangeSize(range.startCode, range.endCode);
      if (size > MAX_RANGE_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${plage} : La plage ne peut pas dépasser ${MAX_RANGE_SIZE} étiquettes`,
        });
        continue;
      }

      sizes.push(size);
    }

    if (sizes.length !== data.ranges.length) {
      return;
    }

    const totalIssue = totalRangeSizeIssue(sizes);
    if (totalIssue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ranges"],
        message: totalIssue,
      });
    }
  });

export const locationRequestSchema = z.discriminatedUnion("mode", [
  singleSchema,
  rangeSchema,
]);

export type LocationRequest = z.infer<typeof locationRequestSchema>;
export type SingleLocationRequest = z.infer<typeof singleSchema>;
export type RangePair = z.infer<typeof rangeEntrySchema>;
export type RangesLocationRequest = z.infer<typeof rangeSchema>;

export function rangeSize(startCode: string, endCode: string): number {
  const { starts, ends } = boxBounds(startCode, endCode);
  return ends.reduce(
    (size, end, axis) => size * (end - starts[axis] + 1),
    1
  );
}

export function totalRangeSizeIssue(sizes: readonly number[]): string | null {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total > MAX_TOTAL_LABELS) {
    return `Le nombre total d'étiquettes ne peut pas dépasser ${MAX_TOTAL_LABELS}`;
  }
  return null;
}

export function expandRange(startCode: string, endCode: string): string[] {
  if (startCode[0] !== endCode[0]) {
    throw new RangeError(
      "Les bornes d'une plage doivent appartenir à la même zone (1 ou 2)"
    );
  }

  const { starts, ends } = boxBounds(startCode, endCode);
  for (let axis = 0; axis < 3; axis += 1) {
    if (starts[axis] === -1 || ends[axis] === -1) {
      throw new RangeError(
        "Les bornes de la plage doivent être du même type (Classique ou Dynamique)"
      );
    }
    if (starts[axis] > ends[axis]) {
      throw new RangeError(
        "La fin de plage doit suivre le début (espace, puis position, puis sous-position)"
      );
    }
  }

  const sets = rangeCharacterSets(startCode);
  const zone = startCode[0];
  const codes: string[] = [];
  for (let espace = starts[0]; espace <= ends[0]; espace += 1) {
    for (let position = starts[1]; position <= ends[1]; position += 1) {
      for (let sub = starts[2]; sub <= ends[2]; sub += 1) {
        codes.push(
          zone + sets[0][espace] + sets[1][position] + sets[2][sub]
        );
      }
    }
  }
  return codes;
}

export function expandRanges(
  ranges: readonly RangePair[]
): string[] {
  return ranges.flatMap((range) =>
    expandRange(range.startCode, range.endCode)
  );
}