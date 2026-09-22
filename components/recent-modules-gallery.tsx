"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLabelModules } from "@/lib/modules/registry";

interface RecentModulesGalleryProps {
  moduleIds: string[];
}

const MODULES = getLabelModules();

export function RecentModulesGallery({ moduleIds }: RecentModulesGalleryProps) {
  const modules = moduleIds
    .map((id) => MODULES.find((module) => module.id === id))
    .filter((module) => module !== undefined);

  if (modules.length === 0) {
    return (
      <div role="status" aria-label="Chargement de la galerie…">
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="h-28">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {modules.map((module) => (
        <Link key={module.id} href={module.href} className="block">
          <Card className="h-28 transition-colors hover:bg-accent">
            <CardHeader className="space-y-1">
              <p className="text-lg font-semibold leading-none tracking-tight">
                {module.name}
              </p>
              <p className="text-muted-foreground">{module.description}</p>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}