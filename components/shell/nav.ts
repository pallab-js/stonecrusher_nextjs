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
  { href: "/production", label: "Production", icon: Factory, roles: ["admin", "operator"] },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: ["admin", "operator"] },
  { href: "/sales", label: "Sales & Dispatch", icon: ReceiptText, roles: ["admin", "accountant"] },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart, roles: ["admin", "accountant"] },
  { href: "/expenses", label: "Expenses", icon: Wallet, roles: ["admin", "accountant"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "accountant"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "accountant"] },
  { href: "/maps", label: "Maps", icon: MapPinned, roles: ["admin", "operator"] },
  {
    href: "/reports",
    label: "Reports",
    icon: ChartNoAxesCombined,
    roles: ["admin", "operator", "accountant"],
  },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "*" || (item.roles as Role[]).includes(role)
  );
}
