"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { Fragment, useRef, useState } from "react";
import { cn } from "cn";
import { toast } from "sonner";

import { LocationConfirmDialog } from "@/components/location-confirm-dialog";
import {
  LOCATION_CODE_PLACEHOLDERS,
  LocationCodeInput,
} from "@/components/location-code-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { MAX_RANGES } from "@/lib/location/code";
import { expandRanges, locationRequestSchema } from "@/lib/location/validate";
import { readPrintSettings } from "@/lib/print-settings-cookie";

type LocationType = "classic" | "dynamic";
type Mode = "single" | "range";

const DYNAMIC_FIXED_INDEXES = [1, 2] as const;
const ZONE_PATTERN = /^[12]$/;

interface RangeRow {
  id: number;
  startCode: string;
  endCode: string;
}

function resyncZone(code: string, zone: string): string {
  if (code.length === 0) {
    return zone;
  }
  return zone + code.slice(1);
}

function withZoneSync(
  current: readonly RangeRow[],
  changedId: number,
  changedCode: string,
  field: "startCode" | "endCode"
): RangeRow[] {
  return current.map((range) => {
    if (range.id !== changedId) {
      return range;
    }
    const base = { ...range, [field]: changedCode };
    const zone = changedCode[0] ?? "";
    if (!ZONE_PATTERN.test(zone)) {
      return base;
    }
    return {
      ...base,
      startCode: resyncZone(base.startCode, zone),
      endCode: resyncZone(base.endCode, zone),
    };
  });
}

interface SingleBody {
  mode: "single";
  locationType: LocationType;
  code: string;
  quantity: number;
}

interface RangeBody {
  mode: "range";
  locationType: LocationType;
  ranges: { startCode: string; endCode: string }[];
}

interface SwitchRowProps {
  label: string;
  ariaLabel: string;
  leftLabel: string;
  rightLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SwitchRow({
  label,
  ariaLabel,
  leftLabel,
  rightLabel,
  checked,
  onCheckedChange,
}: SwitchRowProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center justify-between gap-4">
        <span
          className={cn(
            "w-24 text-left text-sm",
            !checked
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {leftLabel}
        </span>
        <Switch
          aria-label={ariaLabel}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
        <span
          className={cn(
            "w-24 text-right text-sm",
            checked
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {rightLabel}
        </span>
      </div>
    </div>
  );
}

interface RangeRowFieldsProps {
  index: number;
  isDynamic: boolean;
  start: string;
  end: string;
  canRemove: boolean;
  onStartChange: (code: string) => void;
  onEndChange: (code: string) => void;
  onRemove: () => void;
}

function RangeRowFields({
  index,
  isDynamic,
  start,
  end,
  canRemove,
  onStartChange,
  onEndChange,
  onRemove,
}: RangeRowFieldsProps) {
  const number = index + 1;
  const placeholders = isDynamic
    ? LOCATION_CODE_PLACEHOLDERS.dynamic
    : LOCATION_CODE_PLACEHOLDERS.classic;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Plage {number}</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Supprimer la plage ${number}`}
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Début</span>
          <LocationCodeInput
            labelPrefix={`Plage ${number} — début`}
            value={start}
            onChange={onStartChange}
            placeholders={placeholders}
            fixedIndexes={isDynamic ? DYNAMIC_FIXED_INDEXES : undefined}
          />
        </div>
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Fin</span>
          <LocationCodeInput
            labelPrefix={`Plage ${number} — fin`}
            value={end}
            onChange={onEndChange}
            placeholders={placeholders}
            fixedIndexes={isDynamic ? DYNAMIC_FIXED_INDEXES : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export function LocationForm() {
  const [mode, setMode] = useState<Mode>("single");
  const [locationType, setLocationType] = useState<LocationType>("classic");
  const [code, setCode] = useState("");
  const [ranges, setRanges] = useState<RangeRow[]>([
    { id: 0, startCode: "", endCode: "" },
  ]);
  const nextRangeId = useRef(1);
  const [quantity, setQuantity] = useState("1");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  function addRange() {
    if (ranges.length >= MAX_RANGES) {
      return;
    }
    setRanges([
      ...ranges,
      { id: nextRangeId.current, startCode: "", endCode: "" },
    ]);
    nextRangeId.current += 1;
  }

  function removeRange(id: number) {
    if (ranges.length === 1) {
      return;
    }
    setRanges(ranges.filter((range) => range.id !== id));
  }

  function updateRangeStart(id: number, startCode: string) {
    setRanges((current) =>
      withZoneSync(current, id, startCode, "startCode")
    );
  }

  function updateRangeEnd(id: number, endCode: string) {
    setRanges((current) => withZoneSync(current, id, endCode, "endCode"));
  }

  async function submitPrint(body: SingleBody | RangeBody) {
    const labels =
      body.mode === "single"
        ? body.quantity
        : expandRanges(body.ranges).length;

    setIsSending(true);
    try {
      const settings = readPrintSettings();
      const response = await fetch("/api/print/location", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...body,
          ...(settings.paperId ? { paperId: settings.paperId } : {}),
          ...(settings.printerAddress
            ? { printerAddress: settings.printerAddress }
            : {}),
        }),
      });

      const data: { error?: { message?: string } } | null =
        await response.json().catch(() => null);

      if (response.ok) {
        toast.success(
          `Impression envoyée (${labels} étiquette${labels > 1 ? "s" : ""})`
        );
        return;
      }

      const message = data?.error?.message ?? "L'impression a échoué.";
      if (response.status === 503) {
        toast.error(`Imprimante injoignable : ${message}`);
      } else {
        toast.error(message);
      }
    } catch {
      toast.error("Erreur réseau : impossible de joindre le serveur.");
    } finally {
      setIsSending(false);
    }
  }

  function buildSingleBody(): SingleBody {
    return {
      mode: "single",
      locationType,
      code,
      quantity: Number(quantity),
    };
  }

  function buildRangeBody(): RangeBody {
    return {
      mode: "range",
      locationType,
      ranges: ranges.map(({ startCode, endCode }) => ({
        startCode,
        endCode,
      })),
    };
  }

  function validate() {
    return mode === "single"
      ? locationRequestSchema.safeParse(buildSingleBody())
      : locationRequestSchema.safeParse(buildRangeBody());
  }

  function computeCount(): number {
    const parsed = validate();
    if (!parsed.success) {
      return 0;
    }
    return parsed.data.mode === "single"
      ? parsed.data.quantity
      : expandRanges(parsed.data.ranges).length;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = validate();
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Saisie invalide.");
      return;
    }

    const count = computeCount();
    if (count > 2) {
      setIsConfirming(true);
      return;
    }

    void submitPrint(
      parsed.data.mode === "single"
        ? buildSingleBody()
        : buildRangeBody()
    );
  }

  function handleConfirm() {
    setIsConfirming(false);
    const parsed = validate();
    if (!parsed.success) {
      return;
    }
    void submitPrint(
      parsed.data.mode === "single" ? buildSingleBody() : buildRangeBody()
    );
  }

  function handleModeChange(next: boolean) {
    setIsConfirming(false);
    setMode(next ? "range" : "single");
  }

  function handleTypeChange(next: boolean) {
    setLocationType(next ? "dynamic" : "classic");
  }

  const isDynamic = locationType === "dynamic";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SwitchRow
        label="Mode"
        ariaLabel="Mode d'impression"
        leftLabel="Un seul"
        rightLabel="Plage"
        checked={mode === "range"}
        onCheckedChange={handleModeChange}
      />

      <SwitchRow
        label="Type"
        ariaLabel="Type d'emplacement"
        leftLabel="Classique"
        rightLabel="Dynamique"
        checked={isDynamic}
        onCheckedChange={handleTypeChange}
      />

      {mode === "single" ? (
        <>
          <div className="space-y-2">
            <Label>Code emplacement</Label>
            <LocationCodeInput
              labelPrefix="Code emplacement"
              value={code}
              onChange={setCode}
              placeholders={
                isDynamic
                  ? LOCATION_CODE_PLACEHOLDERS.dynamic
                  : LOCATION_CODE_PLACEHOLDERS.classic
              }
              fixedIndexes={isDynamic ? DYNAMIC_FIXED_INDEXES : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {ranges.map((range, index) => (
            <Fragment key={range.id}>
              <RangeRowFields
                index={index}
                isDynamic={isDynamic}
                start={range.startCode}
                end={range.endCode}
                canRemove={ranges.length > 1}
                onStartChange={(startCode) =>
                  updateRangeStart(range.id, startCode)
                }
                onEndChange={(endCode) => updateRangeEnd(range.id, endCode)}
                onRemove={() => removeRange(range.id)}
              />
              {index < ranges.length - 1 && <Separator />}
            </Fragment>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addRange}
            disabled={ranges.length >= MAX_RANGES}
            className="w-full"
          >
            <Plus className="size-4" aria-hidden="true" />
            Ajouter une plage
          </Button>
        </div>
      )}

      <Button type="submit" disabled={isSending} className="w-full">
        {isSending ? "Impression en cours…" : "Imprimer"}
      </Button>

      <LocationConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        count={computeCount()}
        onConfirm={handleConfirm}
      />
    </form>
  );
}