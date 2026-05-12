"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutGrid, LogOut, Shirt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/wardrobe", label: "Wardrobe", Icon: LayoutGrid },
  { href: "/recommendations", label: "Recommendations", Icon: Sparkles },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Logo + nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/wardrobe"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
          >
            <Shirt className="h-5 w-5 text-indigo-400" />
            Hangar
          </Link>

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="rounded-full p-0.5 transition-opacity hover:opacity-80 focus:outline-none"
            aria-label="Open user menu"
          >
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar is an external OAuth URL; configuring remotePatterns for every provider is out of scope
              <img
                src={session.user.image}
                alt={session.user.name ?? "User avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white ring-2 ring-white/10">
                {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-1 shadow-2xl">
              {session?.user?.name && (
                <div className="px-3 py-2.5">
                  <p className="text-[11px] text-gray-500">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-white">
                    {session.user.name}
                  </p>
                </div>
              )}
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
