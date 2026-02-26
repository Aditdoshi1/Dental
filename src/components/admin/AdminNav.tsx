"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShopSwitcher from "./ShopSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import type { ShopRole } from "@/types/database";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  QrCode,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  User,
  Pencil,
} from "lucide-react";
import { useState } from "react";

interface Props {
  shopSlug: string;
  shopName: string;
  shopLogo: string;
  shopId: string;
  role: ShopRole;
  userId: string;
  userEmail: string;
}

export default function AdminNav({ shopSlug, shopName, shopLogo, shopId, role, userId, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/app/${shopSlug}`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(shopName);
  const [savingName, setSavingName] = useState(false);

  const navItems = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/collections`, label: "Collections", icon: FolderOpen },
    { href: `${base}/products`, label: "Products", icon: Package },
    { href: `${base}/qr-codes`, label: "QR Codes", icon: QrCode },
    { href: `${base}/analytics`, label: "Analytics", icon: BarChart3 },
  ];

  if (role === "owner" || role === "admin") {
    navItems.push({ href: `${base}/team`, label: "Team", icon: Users });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === shopName) {
      setEditingName(false);
      setNameValue(shopName);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/shop/${shopId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        router.refresh();
        setEditingName(false);
      }
    } catch { /* ignore */ }
    finally { setSavingName(false); }
  }

  return (
    <nav className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-2">
          {/* Logo + Brand */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5 group">
              <Link href={`${base}/dashboard`} className="flex items-center gap-2.5">
                {shopLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={shopLogo} alt={shopName} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {shopName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(shopName); } }}
                    autoFocus
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 border border-brand-300 dark:border-brand-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 w-28 sm:w-36"
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="text-brand-600 hover:text-brand-700 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button onClick={() => { setEditingName(false); setNameValue(shopName); }} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="hidden sm:inline font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                  {shopName}
                  {(role === "owner" || role === "admin") && (
                    <button onClick={() => setEditingName(true)} className="ml-1.5 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors inline-flex align-middle">
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 shadow-sm ring-1 ring-brand-100 dark:ring-brand-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <ShopSwitcher currentShopSlug={shopSlug} userId={userId} />

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-full pl-1.5 pr-3 py-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-[120px] md:max-w-[160px] truncate">
                {userEmail}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-1.5 text-[13px] text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center touch-manipulation"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-3 pt-1 animate-fade-in border-t border-slate-200 dark:border-slate-700">
            {/* User info on mobile */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="divider my-1" />
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] items-center touch-manipulation ${
                      isActive
                        ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="divider my-1" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left min-h-[44px] items-center touch-manipulation"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
