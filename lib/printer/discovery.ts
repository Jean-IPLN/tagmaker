import { createConnection } from "node:net";
import os from "node:os";

import { env } from "@/lib/env";

export interface PrinterDevice {
  address: string;
  port: number;
  hostname?: string | null;
}

const PROBE_TIMEOUT_MS = 1000;
const BATCH_SIZE = 254;
const TOTAL_BUDGET_MS = 30_000;

const IPV4_OCTET =
  "(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])";
const IPV4_PATTERN = new RegExp(
  `^(${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET})\\.${IPV4_OCTET}$`
);

export function deriveScanSubnet(): string | null {
  const candidate = env.ZPL_SCAN_SUBNET ?? env.ZPL_PRINTER_HOST;
  const match = candidate.match(IPV4_PATTERN);
  return match ? `${match[1]}.` : null;
}

export function getLocalIpAddresses(subnet: string): string[] {
  const addresses = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (
        entry.family === "IPv4" &&
        !entry.internal &&
        entry.address.startsWith(subnet)
      ) {
        addresses.add(entry.address);
      }
    }
  }
  return Array.from(addresses);
}

export function buildScanTargets(
  subnet: string,
  excludeIps: string[] = []
): string[] {
  const targets: string[] = [];
  for (let index = 1; index <= 254; index += 1) {
    const address = `${subnet}${index}`;
    if (!excludeIps.includes(address)) {
      targets.push(address);
    }
  }
  return targets;
}

export function probePort(
  address: string,
  port: number,
  timeoutMs = PROBE_TIMEOUT_MS
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = createConnection({ host: address, port });

    const finish = (open: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

export async function discoverPrinters(
  port = env.ZPL_PRINTER_PORT
): Promise<PrinterDevice[]> {
  const subnet = deriveScanSubnet();
  if (!subnet) {
    return [];
  }

  const targets = buildScanTargets(subnet, getLocalIpAddresses(subnet));
  const devices: PrinterDevice[] = [];
  const startedAt = Date.now();

  for (let offset = 0; offset < targets.length; offset += BATCH_SIZE) {
    if (Date.now() - startedAt >= TOTAL_BUDGET_MS) {
      break;
    }

    const batch = targets.slice(offset, offset + BATCH_SIZE);
    const openings = await Promise.all(
      batch.map((address) => probePort(address, port))
    );

    openings.forEach((isOpen, index) => {
      if (isOpen) {
        devices.push({ address: batch[index], port });
      }
    });
  }

  return devices;
}