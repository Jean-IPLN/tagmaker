import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Code128Form } from "@/components/code128-form";
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

const PRINTER_ADDRESS = "192.168.1.99";

function setPrinterCookie(): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify({ printerAddress: PRINTER_ADDRESS })
  )}; path=/`;
}

function renderForm() {
  render(<Code128Form />);
  return {
    contentInput: screen.getByLabelText("Contenu"),
    quantityInput: screen.getByLabelText("Quantité"),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
  };
}

describe("Code128Form — validation du contenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
    setPrinterCookie();
  });

  it("refuse un contenu vide sans requête", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { submitButton } = renderForm();
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Le contenu est requis")
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse les accents et les caractères non ASCII", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "Café" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne peut contenir que des caractères ASCII imprimables"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse plus de 80 caractères sans requête", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "A".repeat(81) } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne peut pas dépasser 80 caractères"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une quantité nulle ou non entière avec un message clair", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABC" } });
    fireEvent.change(quantityInput, { target: { value: "0" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La quantité doit être au moins 1"
      )
    );

    fireEvent.change(quantityInput, { target: { value: "1.5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La quantité doit être un nombre entier"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("conserve la saisie après un refus serveur (contenu trop long)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Le contenu ne tient pas sur ce format (9 caractères max).",
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      )
    );

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABCDEFGHIJ" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne tient pas sur ce format (9 caractères max)."
      )
    );
    expect(contentInput).toHaveValue("ABCDEFGHIJ");
  });
});
