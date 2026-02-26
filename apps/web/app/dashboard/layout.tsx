"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookMarked, Loader2, Plane, Settings } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SIDEBAR_LINKS = [
  { href: "/dashboard/watchlist", label: "Ma watchlist", icon: BookMarked },
  { href: "/dashboard/alerts", label: "Mes alertes", icon: Bell },
  { href: "/dashboard/settings", label: "Préférences", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* User card */}
            <div className="glass border border-white/5 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-sm">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
                  <p className="text-2xs text-secondary truncate">{user?.email}</p>
                </div>
              </div>
              {user?.is_premium && (
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                                bg-violet-500/10 border border-violet-500/20">
                  <span className="text-2xs text-violet-400 font-bold">✦ Premium</span>
                </div>
              )}
            </div>

            {/* Nav links */}
            <nav className="glass border border-white/5 rounded-2xl overflow-hidden">
              {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3.5 text-sm transition-colors",
                    "border-b border-white/5 last:border-0",
                    pathname === href
                      ? "text-primary bg-orange-500/8 border-l-2 border-l-orange-500"
                      : "text-secondary hover:text-primary hover:bg-white/3"
                  )}
                >
                  <Icon
                    className={clsx(
                      "w-4 h-4",
                      pathname === href ? "text-orange-400" : "text-muted"
                    )}
                  />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Logo at bottom */}
            <div className="mt-6 flex items-center gap-2 px-2">
              <div className="w-5 h-5 rounded-lg bg-orange-500 flex items-center justify-center">
                <Plane className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-muted font-display">TripRadar</span>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
