"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Ean13ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantity: number;
  onConfirm: () => void;
}

export function Ean13ConfirmDialog({
  open,
  onOpenChange,
  quantity,
  onConfirm,
}: Ean13ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Imprimer {quantity} étiquette{quantity > 1 ? "s" : ""} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action envoie {quantity} étiquette{quantity > 1 ? "s" : ""}{" "}
            à l&apos;imprimante ZPL. Vérifiez la quantité avant de confirmer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}