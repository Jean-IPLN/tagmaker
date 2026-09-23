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
import type { PaperSize } from "@/lib/paper-sizes";
import {
  readPrintSettings,
  writePrintSettings,
} from "@/lib/print-settings-cookie";

export interface SettingsFooterProps {
  paperSizes: PaperSize[];
  defaultPaperId: string;
}

export function SettingsFooter({
  paperSizes,
  defaultPaperId,
}: SettingsFooterProps) {
  const [paperId, setPaperId] = useState(defaultPaperId);

  useEffect(() => {
    const settings = readPrintSettings();
    const cookiePaperId = settings.paperId;
    if (cookiePaperId && paperSizes.some((size) => size.id === cookiePaperId)) {
      // sync du cookie (lisible uniquement côté client) vers l'état au montage
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaperId(cookiePaperId);
    }
  }, [paperSizes]);

  function handlePaperChange(value: string | null) {
    if (!value) {
      return;
    }
    setPaperId(value);
    writePrintSettings({ paperId: value });
  }

  const paperItems = paperSizes.map((size) => ({
    label: size.label,
    value: size.id,
  }));

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
      </div>
    </SidebarFooter>
  );
}