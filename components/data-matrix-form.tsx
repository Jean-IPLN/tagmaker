"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { PrintConfirmDialog } from "@/components/print-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dataMatrixRequestSchema } from "@/lib/data-matrix/validate";
import { sendPrintRequest } from "@/lib/print-client";

export function DataMatrixForm() {
  const [content, setContent] = useState("");
  const [legend, setLegend] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function submitPrint(value: string, text: string, qty: number) {
    setIsSending(true);
    try {
      await sendPrintRequest(
        "/api/print/data-matrix",
        {
          content: value,
          ...(text ? { legend: text } : {}),
          quantity: qty,
        },
        qty
      );
    } finally {
      setIsSending(false);
    }
  }

  function validate(values: {
    content: string;
    legend: string;
    quantity: string;
  }) {
    return dataMatrixRequestSchema.safeParse({
      content: values.content,
      legend: values.legend,
      quantity: Number(values.quantity),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = validate({ content, legend, quantity });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Saisie invalide.");
      return;
    }

    if (parsed.data.quantity > 2) {
      setIsConfirming(true);
      return;
    }

    void submitPrint(
      parsed.data.content,
      parsed.data.legend,
      parsed.data.quantity
    );
  }

  function handleConfirm() {
    setIsConfirming(false);
    const parsed = validate({ content, legend, quantity });
    if (!parsed.success) {
      return;
    }
    void submitPrint(
      parsed.data.content,
      parsed.data.legend,
      parsed.data.quantity
    );
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
          maxLength={200}
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          1 à 200 caractères ASCII imprimables.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="legend">Légende</Label>
        <Input
          id="legend"
          value={legend}
          onChange={(event) => setLegend(event.target.value)}
          placeholder="Palette 42"
          maxLength={60}
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          0 à 60 caractères, imprimée sous le code.
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
