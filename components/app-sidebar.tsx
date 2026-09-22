"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tag } from "@phosphor-icons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getLabelModules } from "@/lib/modules/registry";

export function AppSidebar() {
  const pathname = usePathname();
  const modules = getLabelModules();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <Tag className="size-5 shrink-0" aria-hidden="true" />
              <span className="font-semibold">TagMaker</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider delay={0}>
                {modules.map((module) => (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton
                      isActive={pathname === module.href}
                      tooltip={{ children: module.description, hidden: false }}
                      render={<Link href={module.href} />}
                    >
                      <span className="truncate">{module.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}