"use client";

import { useEffect, useMemo, useState } from "react";

import { SidebarFooter } from "@/components/ui/sidebar";
import {
  Select,
  SelectLabel,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowClockwise, CircleNotch, Warning, DeviceRotate } from "@phosphor-icons/react";
import type { PaperSize } from "@/lib/paper-sizes";
import type { PrinterDevice } from "@/lib/printer/discovery";
import {
  readPrintSettings,
  writePrintSettings,
} from "@/lib/print-settings-cookie";
import { cn } from "cn";

export interface SettingsFooterProps {
  paperSizes: PaperSize[];
  defaultPaperId: string;
  rotationEnabledPaperIds?: string[];
}

type PrinterScanState = "idle" | "scanning" | "done";

export function SettingsFooter({
  paperSizes,
  defaultPaperId,
  rotationEnabledPaperIds,
}: SettingsFooterProps) {
  const [paperId, setPaperId] = useState(defaultPaperId);
  const [printerAddress, setPrinterAddress] = useState<string | null>(null);
  const [printerScan, setPrinterScan] = useState<PrinterScanState>("idle");
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [rotated, setRotated] = useState(false);

  const rotationEnabledIds = useMemo(
    () => rotationEnabledPaperIds ?? paperSizes.map((size) => size.id),
    [rotationEnabledPaperIds, paperSizes]
  );

  function isRotationEnabled(paper: string): boolean {
    return rotationEnabledIds.includes(paper);
  }

  useEffect(() => {
    const settings = readPrintSettings();
    const cookiePaperId =
      settings.paperId && paperSizes.some((size) => size.id === settings.paperId)
        ? settings.paperId
        : defaultPaperId;
    // sync du cookie (lisible uniquement côté client) vers l'état au montage
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaperId(cookiePaperId);
    if (settings.printerAddress) {
      setPrinterAddress(settings.printerAddress);
    }
    const rotatable = rotationEnabledIds.includes(cookiePaperId);
    setRotated(settings.rotated === true && rotatable);
    if (settings.rotated === true && !rotatable) {
      writePrintSettings({ rotated: false });
    }
  }, [paperSizes, rotationEnabledIds, defaultPaperId]);

  function handlePaperChange(value: string | null) {
    if (!value) {
      return;
    }
    setPaperId(value);
    if (!isRotationEnabled(value)) {
      setRotated(false);
      writePrintSettings({ paperId: value, rotated: false });
      return;
    }
    writePrintSettings({ paperId: value });
  }

  function handleOrientationChange() {
    if (!isRotationEnabled(paperId)) {
      return;
    }
    const newValue = !rotated;
    setRotated(newValue);
    writePrintSettings({ rotated: newValue });
  }

  function handlePrinterOpenChange(open: boolean) {
    if (!open || printerAddress || printerScan !== "idle") {
      return;
    }
    startScan();
  }

  function startScan() {
    setPrinterScan("scanning");
    void runScan();
  }

  async function runScan() {
    try {
      const response = await fetch("/api/printers/discover");
      const data = (await response.json()) as { printers?: PrinterDevice[] };
      setPrinters(data.printers ?? []);
    } catch {
      setPrinters([]);
    } finally {
      setPrinterScan("done");
    }
  }

  function handlePrinterChange(value: string | null) {
    if (!value) {
      return;
    }
    setPrinterAddress(value);
    writePrintSettings({ printerAddress: value });
  }

  const paperItems = paperSizes.map((size) => ({
    label: size.label,
    value: size.id,
  }));

  const printerItems = printers.map((printer) => ({
    label: printer.address,
    value: printer.address,
  }));

  const isPrinterUndefined = printerAddress === null;

  return (
    <SidebarFooter>
      <Separator className="mx-2" />
      <div className="space-y-3">
        <p className="text-xs font-medium text-sidebar-foreground/70">
          Paramètres
        </p>
        <Select
          value={paperId}
          onValueChange={handlePaperChange}
          items={paperItems}
        >
          <SelectLabel>Papier</SelectLabel>
          <div className="flex items-center">
            <SelectTrigger className="flex-1 rounded-r-none border-r-0 data-disabled:opacity-50">
              <SelectValue placeholder="Choisir un format" />
            </SelectTrigger>
            <Button
              type="button"
              size="icon"
              variant={rotated ? "default" : "outline"}
              aria-label="Orientation"
              aria-pressed={rotated}
              data-state={rotated ? "on" : "off"}
              disabled={!isRotationEnabled(paperId)}
              onClick={handleOrientationChange}
              aria-disabled={!isRotationEnabled(paperId)}
              className="h-8 rounded-l-none"
            >
              <DeviceRotate className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <SelectPortal>
            <SelectPositioner sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {paperSizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      <SelectItemIndicator />
                      <SelectItemText>{size.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>

        <Select
          value={printerAddress}
          onValueChange={handlePrinterChange}
          onOpenChange={handlePrinterOpenChange}
          items={printerItems}
        >
          <SelectLabel>Imprimante</SelectLabel>
          <SelectTrigger
            className={cn(
              "data-disabled:opacity-50",
              isPrinterUndefined &&
                "border-amber-500 text-amber-500 data-placeholder:text-amber-500"
            )}
          >
            {isPrinterUndefined && (
              <Warning className="size-4 shrink-0" aria-hidden="true" />
            )}
            <SelectValue
              placeholder="Non défini"
              className={cn(isPrinterUndefined && "data-placeholder:text-amber-500")}
            />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {printerScan === "done" && printers.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      <SelectItemText>Aucune imprimante détectée</SelectItemText>
                    </SelectItem>
                  )}
                  {printers.map((printer) => (
                    <SelectItem key={printer.address} value={printer.address}>
                      <SelectItemIndicator />
                      <SelectItemText>{printer.address}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
                <div className="border-t border-border p-1">
                  {printerScan === "scanning" ? (
                    <div className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground">
                      <CircleNotch
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Recherche des imprimantes…
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startScan}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring"
                    >
                      <ArrowClockwise className="size-4" aria-hidden="true" />
                      Actualiser
                    </button>
                  )}
                </div>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>

      </div>
    </SidebarFooter>
  );
}