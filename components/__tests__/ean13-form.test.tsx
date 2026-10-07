import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Ean13Form } from "@/components/ean13-form";
import { PRINT_SETTINGS_COOKIE_NAME } from "@/lib/print-settings-cookie";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: toastMock }));

const VALID_BODY = { ean13: "5901234123457", quantity: 5 };
const PRINTER_ADDRESS = "192.168.1.99";
const NO_PRINTER_MESSAGE =
  "Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.";

function setPrintSettingsCookie(settings: object): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(settings)
  )}; path=/`;
}

function renderForm() {
  render(<Ean13Form />);
  return {
    codeInput: screen.getByLabelText("Code EAN-13"),
    quantityInput: screen.getByLabelText("Quantité"),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Ean13Form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it("n'envoie aucune requête si l'EAN-13 est invalide", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: "5901234123456" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringMatching(/clé de contrôle/)
    );
  });

  it("envoie directement la requête pour une quantité ≤ 2 (sans modal)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: "5901234123457" } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            ean13: "5901234123457",
            quantity: 2,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
    expect(
      screen.queryByText("Imprimer 2 étiquettes ?")
    ).not.toBeInTheDocument();
  });

  it("affiche la modal critique sans requête pour une quantité > 2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("annuler la modal ne ferme rien côté requête et conserve les valeurs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect((codeInput as HTMLInputElement).value).toBe(VALID_BODY.ean13);
    expect((quantityInput as HTMLInputElement).value).toBe("5");
  });

  it("confirmer la modal envoie la requête", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 5 }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            ...VALID_BODY,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
  });

  it("affiche un message clair si l'imprimante est injoignable (503)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(503, {
          error: {
            code: "PRINTER_UNAVAILABLE",
            message: "Imprimante injoignable ou envoi échoué.",
          },
        })
      );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Imprimante injoignable/)
      )
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("affiche le message d'erreur du serveur pour un conflit (409)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(409, {
        error: {
          code: "PRINT_IN_PROGRESS",
          message: "Une impression est déjà en cours.",
        },
      })
    );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Une impression est déjà en cours."
      )
    );
  });

  it("signale une erreur réseau si le serveur est injoignable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Erreur réseau/)
      )
    );
  });

  it("confirme une impression réussie par un toast de succès", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { status: "sent", quantity: 2 })
    );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("envoie le format de papier mémorisé dans le réglage", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ paperId: "100x50", printerAddress: PRINTER_ADDRESS })
    )}; path=/`;

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 2,
            paperId: "100x50",
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
  });

  it("envoie l'adresse d'imprimante mémorisée dans le réglage", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ printerAddress: "192.168.1.99" })
    )}; path=/`;

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 2,
            printerAddress: "192.168.1.99",
          }),
        })
      )
    );
  });

  it("envoie l'orientation activée dans le réglage (rotated: true)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ rotated: true, printerAddress: PRINTER_ADDRESS })
    )}; path=/`;

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 2,
            printerAddress: PRINTER_ADDRESS,
            rotated: true,
          }),
        })
      )
    );
  });

  it("n'envoie pas rotated quand le réglage est désactivé", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ rotated: false, printerAddress: PRINTER_ADDRESS })
    )}; path=/`;

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 2,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
  });

  it("bloque l'impression sans imprimante sélectionnée (quantité 1)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(NO_PRINTER_MESSAGE)
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(submitButton).toBeEnabled();
    expect(screen.queryByText("Impression en cours…")).not.toBeInTheDocument();
  });

  it("bloque à la confirmation sans imprimante sélectionnée (quantité 5)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(NO_PRINTER_MESSAGE)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("laisse la validation prioritaire sans imprimante (contrôle négatif croisé)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: "5901234123456" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/clé de contrôle/)
      )
    );
    expect(toastMock.error).not.toHaveBeenCalledWith(NO_PRINTER_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie la requête quand une imprimante est sélectionnée (non-régression)", async () => {
    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 1 }));

    const { codeInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 1,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
    expect(toastMock.error).not.toHaveBeenCalledWith(NO_PRINTER_MESSAGE);
    expect(toastMock.success).toHaveBeenCalled();
  });
});