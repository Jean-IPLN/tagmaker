import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { RecentModulesTracker } from "@/components/recent-modules-tracker";
import { env } from "@/lib/env";
import { DEFAULT_PAPER_SIZE, parsePaperSizes } from "@/lib/paper-sizes";

const spaceGrotesk = Space_Grotesk({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TagMaker – Étiquettes EAN-13",
  description: "Application locale d'impression d'étiquettes à code-barres EAN-13",
};

function getDefaultPaperSettings() {
  const paperSizes = parsePaperSizes(env.ZPL_PAPER_SIZES, DEFAULT_PAPER_SIZE);
  return { paperSizes, defaultPaperId: paperSizes[0].id };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { paperSizes, defaultPaperId } = getDefaultPaperSettings();

  return (
    <html
      lang="fr"
      className={cn("h-full", "dark", "antialiased", geistSans.variable, geistMono.variable, "font-sans", spaceGrotesk.variable)}
    >
      <body className="min-h-full">
        <SidebarProvider>
          <RecentModulesTracker />
          <AppSidebar paperSizes={paperSizes} defaultPaperId={defaultPaperId} />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
