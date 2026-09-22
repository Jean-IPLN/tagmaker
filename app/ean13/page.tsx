import Link from "next/link";

import { Ean13Form } from "@/components/ean13-form";

export default function Ean13Page() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Étiquette EAN-13
          </h1>
          <p className="text-muted-foreground">
            Saisissez un code EAN-13 et la quantité d&apos;étiquettes à imprimer.
          </p>
        </div>
        <Ean13Form />
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Retour
        </Link>
      </div>
    </main>
  );
}