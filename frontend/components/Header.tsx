"use client";

import Link from "next/link";
import { Wallet, Menu, Palette, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavItems = [
    { href: "/", label: "Dashboard" },
    { href: "/expenses", label: "Wydatki" },
    { href: "/expenses/new", label: "+ Dodaj" },
    { href: "/settlements", label: "Rozliczenia" },
    { href: "/export", label: "Eksport" },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const desktopBaseNavClass =
    "main-nav-link px-4 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400";
  const desktopDefaultInactiveClass =
    "text-stone-600 hover:bg-white hover:shadow-sm hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white";
  const desktopDefaultActiveClass =
    "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm theme-e:bg-pink-100 theme-e:text-fuchsia-600";
  const desktopAccentInactiveClass =
    "text-stone-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white theme-e:hover:bg-pink-100 theme-e:hover:text-fuchsia-600";
  const desktopAccentActiveClass =
    "bg-indigo-100 text-indigo-700 shadow-sm dark:bg-stone-700 dark:text-white dark:hover:bg-stone-700 theme-e:bg-pink-100 theme-e:text-fuchsia-600";

  const mobileMenuLinkBaseClass =
    "main-nav-link w-full px-3 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400";
  const mobileMenuLinkInactiveClass =
    "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white theme-e:hover:bg-pink-100 theme-e:hover:text-fuchsia-600";
  const mobileMenuLinkActiveClass =
    "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm theme-e:bg-pink-100 theme-e:text-fuchsia-600";

  const getDesktopNavClass = (href: string, isAccent = false) => {
    const isActive = pathname === href;
    if (isAccent) {
      return `${desktopBaseNavClass} ${isActive ? desktopAccentActiveClass : desktopAccentInactiveClass}`;
    }
    return `${desktopBaseNavClass} ${isActive ? desktopDefaultActiveClass : desktopDefaultInactiveClass}`;
  };

  const getMobileMenuNavClass = (href: string) => {
    const isActive = pathname === href;
    return `${mobileMenuLinkBaseClass} ${isActive ? mobileMenuLinkActiveClass : mobileMenuLinkInactiveClass}`;
  };
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 relative bg-white/80 dark:bg-stone-900/80 theme-e:bg-pink-50/70 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 theme-e:border-pink-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 theme-e:focus-visible:ring-pink-400"
            aria-label="Przejdź do dashboardu"
          >
            <div className="bg-indigo-600 p-2 rounded text-white shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block text-indigo-950 dark:text-white">
              Na Pół
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1 items-center bg-stone-100 dark:bg-stone-800/50 p-1 rounded border border-stone-200/70 dark:border-stone-800">
            <Link href="/" className={getDesktopNavClass("/")}>
              Dashboard
            </Link>
            <Link href="/expenses" className={getDesktopNavClass("/expenses")}>
              Wydatki
            </Link>
            <Link href="/expenses/new" className={getDesktopNavClass("/expenses/new", true)}>
              + Dodaj
            </Link>
            <Link href="/settlements" className={getDesktopNavClass("/settlements")}>
              Rozliczenia
            </Link>
            <Link href="/export" className={getDesktopNavClass("/export")}>
              Eksport
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'theme-e' ? 'theme-m' : 'theme-e')}
                className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 border font-semibold text-sm ${
                  theme === 'theme-e'
                    ? "bg-pink-100 border-pink-200 text-pink-700 shadow-sm"
                    : "bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
                }`}
                title="Przełącz motyw M / E"
              >
                <Palette className="w-4 h-4" />
                <span>{theme === 'theme-e' ? 'E' : 'M'}</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                mobileMenuOpen
                  ? "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-white theme-e:bg-pink-100 theme-e:text-fuchsia-600"
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 theme-e:hover:bg-pink-100"
              }`}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label="Otwórz menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-nav-menu"
        aria-hidden={!mobileMenuOpen}
        className={`app-menu-surface absolute top-full left-0 right-0 z-50 md:hidden grid overflow-hidden bg-white dark:bg-stone-900 theme-e:bg-pink-50 shadow-lg border-b border-stone-200 dark:border-stone-800 theme-e:border-pink-200/50 transition-all duration-300 ease-out ${
          mobileMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div
            className={`border-t border-stone-200/70 dark:border-stone-800/80 theme-e:border-pink-200/60 px-4 transition-all duration-300 ease-out ${
              mobileMenuOpen
                ? "pointer-events-auto pb-3 pt-2 translate-y-0"
                : "pointer-events-none pb-0 pt-0 -translate-y-3"
            }`}
          >
            <nav className="mt-3 flex flex-col gap-2">
              {mobileNavItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`${getMobileMenuNavClass(item.href)} transform-gpu transition-all duration-300 ease-out ${
                    mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  }`}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${index * 35}ms` : "0ms",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
