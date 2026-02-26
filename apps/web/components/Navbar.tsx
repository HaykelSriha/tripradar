"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, Bell, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { clsx } from "clsx";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/deals", label: "Deals" },
    { href: "/deals?tier=hot", label: "Deals chauds 🔥" },
    { href: "/deals?is_direct=true", label: "Vols directs" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-primary tracking-tight">
            TripRadar
          </span>
        </Link>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "hover:text-primary transition-colors",
                pathname === link.href && "text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border
                           border-white/10 hover:border-white/20 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-primary font-medium hidden sm:block">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-secondary" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 glass border border-white/10
                              rounded-2xl shadow-xl shadow-black/40 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-primary truncate">{user.name}</p>
                    <p className="text-2xs text-secondary truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/watchlist"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary
                                 hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      Mes alertes
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary
                                 hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Préférences
                    </Link>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm
                                 text-danger hover:bg-danger/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-secondary hover:text-primary transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="text-sm px-4 py-2 rounded-xl bg-orange-500 text-white
                           font-medium hover:bg-orange-400 transition-colors"
              >
                Commencer
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
