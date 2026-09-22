"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Ean13ConfirmDialog } from "@/components/ean13-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { labelRequestSchema } from "@/lib/ean13/validate";

export function Ean13Form() {
  const [ean13, setEan13] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function submitPrint(code: string, qty: number) {
    setIsSending(true);
    try {
      const response = await fetch("/api/print/ean13", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ean13: code, quantity: qty }),
      });

      const data: { error?: { message?: string } } | null =
        await response.json().catch(() => null);

      if (response.ok) {
        toast.success(
          `Impression envoyée (${qty} étiquette${qty > 1 ? "s" : ""})`
        );
        return;
      }

      const message = data?.error?.message ?? "L'impression a échoué.";
      if (response.status === 503) {
        toast.error(`Imprimante injoignable : ${message}`);
      } else {
        toast.error(message);
      }
    } catch {
      toast.error("Erreur réseau : impossible de joindre le serveur.");
    } finally {
      setIsSending(false);
    }
  }

  function validate(values: { ean13: string; quantity: string }) {
    return labelRequestSchema.safeParse({
      ean13: values.ean13,
      quantity: Number(values.quantity),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = validate({ ean13, quantity });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Saisie invalide.");
      return;
    }

    if (parsed.data.quantity > 2) {
      setIsConfirming(true);
      return;
    }

    void submitPrint(parsed.data.ean13, parsed.data.quantity);
  }

  function handleConfirm() {
    setIsConfirming(false);
    const parsed = validate({ ean13, quantity });
    if (!parsed.success) {
      return;
    }
    void submitPrint(parsed.data.ean13, parsed.data.quantity);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ean13">Code EAN-13</Label>
        <Input
          id="ean13"
          value={ean13}
          onChange={(event) => setEan13(event.target.value)}
          placeholder="5901234123457"
          inputMode="numeric"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantité</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={1000}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={isSending} className="w-full">
        {isSending ? "Impression en cours…" : "Imprimer"}
      </Button>

      <Ean13ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        quantity={Number(quantity)}
        onConfirm={handleConfirm}
      />
    </form>
  );
}