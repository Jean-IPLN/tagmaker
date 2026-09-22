import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Ean13ConfirmDialog } from "@/components/ean13-confirm-dialog";

function renderDialog(
  quantity = 5,
  props: Partial<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }> = {}
) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const onOpenChange = props.onOpenChange ?? vi.fn();
  render(
    <Ean13ConfirmDialog
      open={props.open ?? true}
      quantity={quantity}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
    />
  );
  return { onConfirm, onOpenChange };
}

describe("Ean13ConfirmDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche la quantité à imprimer dans la modal", () => {
    renderDialog(5);

    expect(
      screen.getByText("Imprimer 5 étiquettes ?")
    ).toBeInTheDocument();
  });

  it("Confirmer déclenche onConfirm sans requête directe", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { onConfirm } = renderDialog(5);

    fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Annuler referme la modal sans onConfirm ni requête", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { onConfirm, onOpenChange } = renderDialog(5);

    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(vi.mocked(onOpenChange).mock.calls[0][0]).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});