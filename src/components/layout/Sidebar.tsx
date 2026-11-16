import NavList from "./NavList";
import Brand from "./Brand";
import type { Role } from "@/lib/auth/access";

/** The always-visible menu on laptops and larger screens. Smaller screens use MobileNav instead. */
export default function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-[74px] items-center border-b border-border px-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <NavList role={role} />
      </div>
    </aside>
  );
}
