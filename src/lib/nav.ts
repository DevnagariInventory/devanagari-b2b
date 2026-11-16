import {
  LayoutDashboard, BarChart3, Users, BookOpen, PenTool, Tag, FileText, Boxes, IndianRupee, Coins, Wallet, Printer,
  LineChart, ShieldCheck, Settings, FileSignature, Hourglass, UserCog, ShoppingCart, Library, Factory, Landmark, Lock,
  type LucideIcon,
} from "lucide-react";
import { canOpen, type Role } from "@/lib/auth/access";

export interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
}

/** A dropdown in the sidebar holding several pages. */
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
}

export type NavEntry = NavLink | NavGroup;
export const isGroup = (e: NavEntry): e is NavGroup => "items" in e;

export const navEntries: NavEntry[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Quotations", path: "/quotations", icon: FileSignature },
      { label: "Invoices", path: "/invoices", icon: FileText },
      { label: "Receivables", path: "/receivables", icon: Hourglass },
      { label: "Payments", path: "/payments", icon: IndianRupee },
    ],
  },
  {
    label: "Catalog & Stock",
    icon: Library,
    items: [
      { label: "Products", path: "/products", icon: BookOpen },
      { label: "Authors", path: "/authors", icon: PenTool },
      { label: "Categories", path: "/categories", icon: Tag },
      { label: "Inventory", path: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Production",
    icon: Factory,
    items: [
      { label: "Printing", path: "/printing", icon: Printer },
      { label: "Royalty", path: "/royalty", icon: Coins },
    ],
  },
  {
    label: "Finance",
    icon: Landmark,
    items: [
      { label: "Expenses", path: "/expenses", icon: Wallet },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "Reports", path: "/reports", icon: LineChart },
    ],
  },
  {
    label: "Admin",
    icon: Lock,
    items: [
      { label: "Users", path: "/users", icon: UserCog },
      { label: "Audit Logs", path: "/audit-logs", icon: ShieldCheck },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

/** The menu this role may see: pages they can't open are dropped, and so are groups left empty. */
export function navFor(role: Role): NavEntry[] {
  const out: NavEntry[] = [];
  for (const e of navEntries) {
    if (isGroup(e)) {
      const items = e.items.filter((n) => canOpen(role, n.path));
      if (items.length) out.push({ ...e, items });
    } else if (canOpen(role, e.path)) {
      out.push(e);
    }
  }
  return out;
}
