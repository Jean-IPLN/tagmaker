import net from "node:net";
import type { AddressInfo } from "node:net";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envConfig } = vi.hoisted(() => ({
  envConfig: {
    ZPL_PRINTER_HOST: "127.0.0.1",
    ZPL_PRINTER_PORT: 0,
    ZPL_RESOLUTION_DPI: 203,
    ZPL_PAPER_SIZES: "40x25, 50x25, 60x40, 100x50",
  },
}));

vi.mock("@/lib/env", () => ({ env: envConfig }));

import { sendToPrinter } from "@/lib/printer/send";

async function startTcpServer(): Promise<{
  server: net.Server;
  port: number;
  received: Buffer[];
}> {
  const received: Buffer[] = [];
  const server = net.createServer((socket) => {
    socket.on("data", (chunk) => received.push(chunk));
    socket.on("error", () => {});
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, port, received };
}

describe("sendToPrinter", () => {
  let server: net.Server | null = null;

  beforeEach(() => {
    envConfig.ZPL_PRINTER_PORT = 0;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server!.close(resolve));
      server = null;
    }
  });

  it("écrit le flux ZPL complet sur le socket TCP et résout { status: sent }", async () => {
    const started = await startTcpServer();
    server = started.server;
    envConfig.ZPL_PRINTER_PORT = started.port;

    const zpl = "^XA^PW320^LL200^FD590123412345^XZ";
    await expect(sendToPrinter(zpl)).resolves.toEqual({ status: "sent" });

    await vi.waitFor(() => {
      const received = started.received.join("");
      expect(received).toContain("^XZ");
      expect(received).toContain(zpl);
    });
  });

  it("rejette avec une erreur explicite si aucun serveur n'écoute", async () => {
    const closed = await startTcpServer();
    await new Promise((resolve) => closed.server.close(resolve));
    envConfig.ZPL_PRINTER_PORT = closed.port;

    await expect(sendToPrinter("^XA^XZ")).rejects.toThrow(/injoignable/i);
  });

  it("envoie vers la cible fournie en priorité sur l'environnement", async () => {
    const targetHost = "127.0.0.1";
    const started = await startTcpServer();
    server = started.server;
    envConfig.ZPL_PRINTER_HOST = "127.0.0.2";
    envConfig.ZPL_PRINTER_PORT = 9999;

    const zpl = "^XA^XZ";
    await expect(
      sendToPrinter(zpl, { host: targetHost, port: started.port })
    ).resolves.toEqual({ status: "sent" });

    await vi.waitFor(() => {
      expect(started.received.join("")).toContain(zpl);
    });
  });

  it("mentionne la cible fournie dans le message d'échec", async () => {
    const closed = await startTcpServer();
    await new Promise((resolve) => closed.server.close(resolve));

    await expect(
      sendToPrinter("^XA^XZ", { host: "127.0.0.1", port: closed.port })
    ).rejects.toThrow(/127\.0\.0\.1:\d+/);
  });
});