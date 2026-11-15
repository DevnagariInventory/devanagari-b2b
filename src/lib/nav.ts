import {
  LayoutDashboard, BarChart3, Users, BookOpen, PenTool, Tag, FileText,
  Boxes, IndianRupee, Coins, Wallet, Printer, ClipboardList, LineChart,
  ShieldCheck, Settings, FileSignature, Undo2, Truck, Hourglass, UserCog, type LucideIcon,
} from "lucide-react";
import { canOpen, type Role } from "@/lib/auth/access";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Products", path: "/products", icon: BookOpen },
  { label: "Authors", path: "/authors", icon: PenTool },
  { label: "Categories", path: "/categories", icon: Tag },
  { label: "Quotations", path: "/quotations", icon: FileSignature },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Credit Notes", path: "/credit-notes", icon: Undo2 },
  { label: "Delivery Challans", path: "/challans", icon: Truck },
  { label: "Receivables", path: "/receivables", icon: Hourglass },
  { label: "Inventory", path: "/inventory", icon: Boxes },
  { label: "Payments", path: "/payments", icon: IndianRupee },
  { label: "Royalty", path: "/royalty", icon: Coins },
  { label: "Expenses", path: "/expenses", icon: Wallet },
  { label: "Printing Press", path: "/printing-press", icon: Printer },
  { label: "Print Orders", path: "/print-orders", icon: ClipboardList },
  { label: "Reports", path: "/reports", icon: LineChart },
  { label: "Audit Logs", path: "/audit-logs", icon: ShieldCheck },
  { label: "Users", path: "/users", icon: UserCog },
  { label: "Settings", path: "/settings", icon: Settings },
];

/** The menu entries this role may open. */
export const navFor = (role: Role) => navItems.filter((n) => canOpen(role, n.path));
