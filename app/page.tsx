import { SkeletonForm } from "@/components/skeleton-form";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">TagMaker</h1>
          <p className="text-muted-foreground">
            Choisissez un module dans la barre latérale.
          </p>
        </div>
        <SkeletonForm />
      </div>
    </main>
  );
}