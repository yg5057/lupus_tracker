"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ChartColumn, FileText } from "lucide-react";

const TABS = [
  { href: "/calendar", label: "캘린더", Icon: Calendar },
  { href: "/", label: "기록", Icon: FileText },
  { href: "/chart", label: "차트", Icon: ChartColumn },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mt-4 flex border-t border-line bg-white pt-2.5 pb-6">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 text-[11px] ${
              active ? "font-bold text-mint-dark" : "font-semibold text-faint"
            }`}
          >
            <Icon size={24} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}