import {
  LayoutDashboard,
  Factory,
  Boxes,
  ReceiptText,
  ShoppingCart,
  Wallet,
  Users,
  Truck,
  MapPinned,
  ChartNoAxesCombined,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[] | "*";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: "*" },
  { href: "/production", label: "Production", icon: Factory, roles: "*" },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: "*" },
  { href: "/sales", label: "Sales & Dispatch", icon: ReceiptText, roles: "*" },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart, roles: "*" },
  { href: "/expenses", label: "Expenses", icon: Wallet, roles: "*" },
  { href: "/customers", label: "Customers", icon: Users, roles: "*" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: "*" },
  { href: "/maps", label: "Maps", icon: MapPinned, roles: "*" },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined, roles: "*" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "*" || (item.roles as Role[]).includes(role)
  );
}
