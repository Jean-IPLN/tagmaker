import net from "node:net";

import { env } from "@/lib/env";

export interface PrintResult {
  status: "sent";
}

const SEND_TIMEOUT_MS = 10_000;

export function sendToPrinter(
  zpl: string,
  target?: { host: string; port: number }
): Promise<PrintResult> {
  const host = target?.host ?? env.ZPL_PRINTER_HOST;
  const port = target?.port ?? env.ZPL_PRINTER_PORT;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host,
      port,
    });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(SEND_TIMEOUT_MS);

    socket.once("connect", () => {
      socket.write(zpl, (error) => {
        cleanup();
        if (error) {
          reject(
            new Error(`Échec de l'envoi vers l'imprimante: ${error.message}`)
          );
          return;
        }
        resolve({ status: "sent" });
      });
    });

    socket.once("error", (error) => {
      cleanup();
      reject(
        new Error(
          `Imprimante injoignable (${host}:${port}): ${error.message}`
        )
      );
    });

    socket.once("timeout", () => {
      cleanup();
      reject(
        new Error(
          `Délai d'attente dépassé pour l'imprimante (${host}:${port})`
        )
      );
    });
  });
}