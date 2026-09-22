import { cookies } from "next/headers";
import { RecentModulesGallery } from "@/components/recent-modules-gallery";
import { getLabelModules } from "@/lib/modules/registry";
import {
  RECENT_COOKIE_NAME,
  decodeCookieValue,
  getRecentModuleIds,
  parseEntries,
} from "@/lib/recent-modules";

export default async function Home() {
  const cookie = (await cookies()).get(RECENT_COOKIE_NAME);
  const entries = cookie ? parseEntries(decodeCookieValue(cookie.value)) : [];
  const availableModuleIds = getLabelModules().map((module) => module.id);
  const moduleIds = getRecentModuleIds(entries, availableModuleIds);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">TagMaker</h1>
          <p className="text-muted-foreground">Modules récemment utilisés.</p>
        </div>
        <RecentModulesGallery moduleIds={moduleIds} />
      </div>
    </main>
  );
}