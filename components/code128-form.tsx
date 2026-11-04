"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { PrintConfirmDialog } from "@/components/print-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { code128RequestSchema } from "@/lib/code128/validate";
import { sendPrintRequest } from "@/lib/print-client";

export function Code128Form() {
  const [content, setContent] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function submitPrint(value: string, qty: number) {
    setIsSending(true);
    try {
      await sendPrintRequest(
        "/api/print/code128",
        { content: value, quantity: qty },
        qty
      );
    } finally {
      setIsSending(false);
    }
  }

  function validate(values: { content: string; quantity: string }) {
    return code128RequestSchema.safeParse({
      content: values.content,
      quantity: Number(values.quantity),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = validate({ content, quantity });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Saisie invalide.");
      return;
    }

    if (parsed.data.quantity > 2) {
      setIsConfirming(true);
      return;
    }

    void submitPrint(parsed.data.content, parsed.data.quantity);
  }

  function handleConfirm() {
    setIsConfirming(false);
    const parsed = validate({ content, quantity });
    if (!parsed.success) {
      return;
    }
    void submitPrint(parsed.data.content, parsed.data.quantity);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="content">Contenu</Label>
        <Input
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="REF-2026-A17"
          maxLength={80}
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          1 à 80 caractères ASCII imprimables.
        </p>
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

      <PrintConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        count={Number(quantity)}
        onConfirm={handleConfirm}
      />
    </form>
  );
}
