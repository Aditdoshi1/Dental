import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import AdminNav from "@/components/admin/AdminNav";
import type { ShopRole } from "@/types/database";

export interface ShopLayoutContext {
  shopId: string;
  shopSlug: string;
  shopName: string;
  shopLogo: string;
  role: ShopRole;
  userId: string;
}

export default async function ShopAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ shopSlug: string }>;
}) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav
        shopSlug={ctx.shop.slug}
        shopName={ctx.shop.name}
        shopLogo={ctx.shop.logo_url}
        shopId={ctx.shop.id}
        role={ctx.role}
        userId={user.id}
        userEmail={user.email || ""}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
