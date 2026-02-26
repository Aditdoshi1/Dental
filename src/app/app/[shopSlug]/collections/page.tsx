import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { Collection } from "@/types/database";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function CollectionsPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const base = `/app/${shopSlug}`;

  const [{ data: collections }, { data: itemCounts }] = await Promise.all([
    supabase
      .from("collections")
      .select("*, profiles!collections_owner_id_fkey(display_name)")
      .eq("shop_id", ctx.shop.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("items")
      .select("collection_id")
      .eq("shop_id", ctx.shop.id),
  ]);

  // Count items per collection
  const countMap: Record<string, number> = {};
  (itemCounts || []).forEach((item: { collection_id: string }) => {
    countMap[item.collection_id] = (countMap[item.collection_id] || 0) + 1;
  });

  const shopCollections = (collections || []).filter(
    (c: Collection) => c.visibility === "shop"
  );
  const personalCollections = (collections || []).filter(
    (c: Collection) => c.visibility === "personal"
  );

  function CollectionCard({ c }: { c: Collection & { profiles?: { display_name: string } } }) {
    const count = countMap[c.id] || 0;
    return (
      <Link
        key={c.id}
        href={`${base}/collections/${c.id}`}
        className="card-hover flex items-center justify-between group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{c.title}</h3>
            {c.visibility === "personal" && <span className="badge-purple">Personal</span>}
            {!c.active && <span className="badge-gray">Inactive</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{count} {count === 1 ? "product" : "products"}</span>
            <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">by {c.profiles?.display_name || "Unknown"}</span>
            <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(c.created_at)}</span>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Collections</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {(collections || []).length} {(collections || []).length === 1 ? "collection" : "collections"} total
          </p>
        </div>
        <Link href={`${base}/collections/new`} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Collection
        </Link>
      </div>

      {/* Shop Collections */}
      <div className="mb-8">
        <p className="section-label mb-3">Shop Collections</p>
        {shopCollections.length === 0 ? (
          <div className="card text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">No shop-wide collections yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Create one to share product recommendations with your team</p>
            <Link href={`${base}/collections/new`} className="btn-primary text-sm">
              Create Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {shopCollections.map((c: Collection & { profiles?: { display_name: string } }) => (
              <CollectionCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* Personal Collections */}
      <div>
        <p className="section-label mb-3">Personal Collections</p>
        {personalCollections.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No personal collections</p>
        ) : (
          <div className="space-y-2">
            {personalCollections.map((c: Collection & { profiles?: { display_name: string } }) => (
              <CollectionCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
