"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLabelModules } from "@/lib/modules/registry";
import {
  filterValidEntries,
  recordModule,
} from "@/lib/recent-modules";
import {
  readRecentCookie,
  writeRecentCookie,
} from "@/lib/recent-modules-cookie";

export function RecentModulesTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const currentModule = getLabelModules().find(({ href }) => href === pathname);
    if (!currentModule) {
      return;
    }
    const availableModuleIds = getLabelModules().map(({ id }) => id);
    const now = Date.now();
    const entries = filterValidEntries(
      recordModule(readRecentCookie(), currentModule.id, now),
      availableModuleIds,
      now
    );
    writeRecentCookie(entries);
  }, [pathname]);

  return null;
}