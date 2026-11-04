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

export interface PrintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => void;
}

export function PrintConfirmDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: PrintConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Imprimer {count} étiquette{count > 1 ? "s" : ""} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action envoie {count} étiquette{count > 1 ? "s" : ""} à
            l&apos;imprimante ZPL. Vérifiez la quantité avant de confirmer.
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
