"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronsUpDown, Check } from "lucide-react";

interface ShopInfo {
  slug: string;
  name: string;
}

interface Props {
  currentShopSlug: string;
  userId: string;
}

export default function ShopSwitcher({ currentShopSlug, userId }: Props) {
  const router = useRouter();
  const [shops, setShops] = useState<ShopInfo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("shop_members")
        .select("shops(slug, name)")
        .eq("user_id", userId)
        .eq("accepted", true);

      if (data) {
        const list = data
          .map((d) => (d.shops as unknown as ShopInfo))
          .filter(Boolean);
        setShops(list);
      }
    }
    load();
  }, [userId]);

  if (shops.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-all"
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
        Switch
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 py-1 min-w-[180px] animate-scale-in">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Your Shops</p>
            {shops.map((s) => (
              <button
                key={s.slug}
                onClick={() => {
                  router.push(`/app/${s.slug}/dashboard`);
                  setOpen(false);
                }}
                className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  s.slug === currentShopSlug ? "text-brand-700 font-medium" : "text-slate-700"
                }`}
              >
                <span className="truncate">{s.name}</span>
                {s.slug === currentShopSlug && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
