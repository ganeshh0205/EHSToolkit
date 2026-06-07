import { LayoutDashboard, Scale, DollarSign, FileText, MessageSquare, Leaf, BarChart3, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Regulatory Lookup", url: "/regulations", icon: Scale },
  { title: "Funding Finder", url: "/funding", icon: DollarSign },
  { title: "Report Writer", url: "/reports", icon: FileText },
  { title: "Data Analyzer", url: "/data-analyzer", icon: BarChart3 },
  { title: "Hygiene & Remediation", url: "/hygiene-planner", icon: Shield },
  { title: "AI Assistant", url: "/assistant", icon: MessageSquare },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/10">
            <Leaf className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">EnviroConsult Pro</span>
            <span className="text-[11px] text-sidebar-foreground">Your Consulting Toolkit</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
