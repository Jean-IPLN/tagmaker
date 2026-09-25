import Link from "next/link";

import { LocationForm } from "@/components/location-form";

export default function EmplacementPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Étiquette Emplacement
          </h1>
          <p className="text-muted-foreground">
            Saisissez un emplacement (classique ou #D) et la quantité
            d&apos;étiquettes à imprimer.
          </p>
        </div>
        <LocationForm />
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