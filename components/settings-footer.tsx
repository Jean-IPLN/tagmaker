"use client";

import { useEffect, useState } from "react";

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
import { ArrowClockwise, CircleNotch, Warning } from "@phosphor-icons/react";
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
}

type PrinterScanState = "idle" | "scanning" | "done";

export function SettingsFooter({
  paperSizes,
  defaultPaperId,
}: SettingsFooterProps) {
  const [paperId, setPaperId] = useState(defaultPaperId);
  const [printerAddress, setPrinterAddress] = useState<string | null>(null);
  const [printerScan, setPrinterScan] = useState<PrinterScanState>("idle");
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);

  useEffect(() => {
    const settings = readPrintSettings();
    const cookiePaperId = settings.paperId;
    if (cookiePaperId && paperSizes.some((size) => size.id === cookiePaperId)) {
      // sync du cookie (lisible uniquement côté client) vers l'état au montage
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaperId(cookiePaperId);
    }
    if (settings.printerAddress) {
      setPrinterAddress(settings.printerAddress);
    }
  }, [paperSizes]);

  function handlePaperChange(value: string | null) {
    if (!value) {
      return;
    }
    setPaperId(value);
    writePrintSettings({ paperId: value });
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
          <SelectTrigger className="data-disabled:opacity-50">
            <SelectValue placeholder="Choisir un format" />
          </SelectTrigger>
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