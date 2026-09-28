"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { navForRole } from "./nav";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Pin } from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "Admin",
  operator: "Operator",
  accountant: "Accounts",
};

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="flex size-9 items-center justify-center rounded-md bg-blurple">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
          <path
            d="M3 18h18M5 18l3-9 4 5 3-7 4 11"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="display text-lg tracking-tight text-white">StoneOps</span>
    </Link>
  );
}

function NavList({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(user.role);
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              "relative flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition " +
              (active
                ? "bg-surface text-white"
                : "text-muted-foreground hover:bg-surface/60 hover:text-white")
            }
          >
            {active && (
              <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blurple" />
            )}
            <Icon className={"size-4 " + (active ? "text-blurple" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserChip({ user }: { user: SessionUser }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition hover:bg-surface">
        <span className="flex size-8 items-center justify-center rounded-full bg-magenta text-xs font-bold text-white">
          {user.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold text-white">{user.name}</span>
          <span className="block text-[11px] text-muted-foreground">
            {ROLE_BADGE[user.role] ?? user.role}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          @{user.username} · {ROLE_BADGE[user.role] ?? user.role}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <Pin className="size-4" /> Change PIN
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void logoutAction()}>
          <LogOut className="size-4" /> Lock screen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title =
    navForRole(user.role).find(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/")
    )?.label ?? "StoneOps";

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-canvas/80 backdrop-blur lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavList user={user} />
        </div>
        <div className="border-t border-hairline p-4 text-[11px] leading-relaxed text-muted-foreground">
          Local-first · SQLite · offline
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="flex size-9 items-center justify-center rounded-md bg-surface text-white ring-1 ring-white/10 hover:bg-accent">
                <Menu className="size-4" />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-canvas p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center px-5">
                  <Brand />
                </div>
                <NavList user={user} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="lg:hidden">
              <Brand />
            </span>
          </div>

          <h1 className="display hidden text-lg text-white lg:block">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-pill bg-green/10 px-3 py-1 text-[11px] font-semibold text-green ring-1 ring-green/30 sm:flex">
              <span className="size-1.5 rounded-full bg-green" /> Offline ready
            </span>
            <UserChip user={user} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
