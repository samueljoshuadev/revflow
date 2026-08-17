"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  CheckSquare2,
  ContactRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  PanelTop,
  Building2,
  BarChart3,
  PlugZap,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/app/(protected)/actions";
import { switchOrganization } from "@/app/(protected)/(workspace)/settings/actions";
import { Brand } from "@/components/brand";
import { cn, initials } from "@/lib/utils";
import type { OrganizationVertical } from "@/types/database";

const agencyNavigation: Array<{
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}> = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pipeline", href: "/pipeline", icon: PanelTop },
  { label: "Leads", href: "/leads", icon: ContactRound },
  { label: "Agenda", href: "/calendar", icon: CalendarDays },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare2 },
  { label: "WhatsApp", href: "/messages", icon: MessageCircle },
  { label: "Clientes", href: "/clients", icon: Users },
];

const realEstateNavigation: typeof agencyNavigation = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: ContactRound },
  { label: "Imóveis", href: "/properties", icon: Building2 },
  { label: "Visitas", href: "/visits", icon: CalendarDays },
  { label: "Agenda", href: "/calendar", icon: CalendarDays },
  { label: "Corretores", href: "/team", icon: Users },
  { label: "Relatórios", href: "/reports", icon: BarChart3 },
];

type AppShellProps = {
  children: React.ReactNode;
  organizationName: string;
  organizationId: string;
  organizationRole: string;
  organizationVertical: OrganizationVertical;
  organizations: {
    id: string;
    name: string;
    role: string;
    vertical: OrganizationVertical;
  }[];
  userName: string;
  userEmail: string;
};

export function AppShell({
  children,
  organizationName,
  organizationId,
  organizationRole,
  organizationVertical,
  organizations,
  userName,
  userEmail,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRealEstate = organizationVertical === "real_estate";
  const navigation = isRealEstate ? realEstateNavigation : agencyNavigation;

  const sidebar = (
    <>
      <div className="flex h-[72px] items-center px-5">
        <Brand vertical={organizationVertical} />
      </div>
      <form
        action={switchOrganization}
        className="relative mx-3 mt-1 flex items-center gap-3 rounded-xl border border-gray-200/80 bg-gray-50/80 p-2.5 shadow-[0_4px_18px_rgba(35,38,72,0.03)]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-xs font-semibold text-white">
          {initials(organizationName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-800">
            {organizationName}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400 capitalize">
            {organizationRole}
          </p>
        </div>
        {organizations.length > 1 && (
          <select
            name="organizationId"
            aria-label="Trocar organização"
            defaultValue={organizationId}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {organizations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        <ChevronDown className="size-3.5 text-gray-400" />
      </form>
      <nav
        className="mt-5 flex-1 space-y-1 px-3"
        aria-label="Navegação principal"
      >
        <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-gray-400 uppercase">
          Workspace
        </p>
        {navigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-2.5 text-sm text-gray-300"
              >
                <Icon className="size-[18px]" />
                {item.label}
                <span className="ml-auto text-[9px] font-medium tracking-wide uppercase">
                  Em breve
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-soft text-brand shadow-[inset_3px_0_0_var(--brand)]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-gray-100 p-3">
        <Link
          href="/notifications"
          className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <Bell className="size-[17px]" /> Notificações
        </Link>
        <Link
          href="/team"
          className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <Users className="size-[17px]" /> Equipe
        </Link>
        <Link
          href="/settings/integrations"
          className={cn(
            "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm hover:bg-gray-50 hover:text-gray-900",
            pathname.startsWith("/settings/integrations")
              ? "bg-brand-soft text-brand"
              : "text-gray-500",
          )}
        >
          <PlugZap className="size-[17px]" /> Integrações
        </Link>
        <Link
          href="/settings"
          className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="size-[17px]" /> Configurações
        </Link>
        <span className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-gray-400">
          <LifeBuoy className="size-[17px]" /> Ajuda
        </span>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
            {initials(userName || userEmail)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-800">
              {userName || "Usuário"}
            </p>
            <p className="truncate text-[10px] text-gray-400">{userEmail}</p>
          </div>
          <form action={signOut}>
            <button
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div
      data-vertical={organizationVertical}
      className="min-h-screen bg-background"
    >
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-gray-200/80 bg-white/95 shadow-[8px_0_32px_rgba(25,28,57,0.025)] backdrop-blur-xl lg:flex">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[280px] flex-col bg-white shadow-2xl">
            <button
              className="absolute top-5 right-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-gray-200/80 bg-white/82 px-4 shadow-[0_4px_22px_rgba(25,28,57,0.025)] backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <form
            action={isRealEstate ? "/properties" : "/leads"}
            className="relative hidden w-full max-w-sm sm:block"
          >
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              className="h-9 w-full rounded-lg border-0 bg-gray-100/80 pr-16 pl-9 text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-violet-200"
              placeholder={
                isRealEstate ? "Buscar imóveis..." : "Buscar leads..."
              }
              aria-label={isRealEstate ? "Buscar imóveis" : "Buscar leads"}
            />
            <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-gray-400">
              ⌘ K
            </kbd>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Notificações"
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand ring-2 ring-white" />
            </button>
            <Link
              href={isRealEstate ? "/properties/new" : "/leads/new"}
              className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3.5 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">
                {isRealEstate ? "Novo imóvel" : "Novo lead"}
              </span>
            </Link>
          </div>
        </header>
        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </div>
    </div>
  );
}
