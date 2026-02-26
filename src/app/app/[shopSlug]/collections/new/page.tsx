import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveShopContext } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { createCollection } from "../actions";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function NewCollectionPage({ params }: Props) {
  const { shopSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await resolveShopContext(supabase, shopSlug, user.id);
  if (!ctx) redirect("/setup");

  const base = `/app/${shopSlug}`;

  async function handleCreate(formData: FormData) {
    "use server";
    await createCollection(shopSlug, ctx!.shop.id, formData);
  }

  return (
    <div>
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link href={`${base}/collections`} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Collections
          </Link>
          <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-300 font-medium">New</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3">New Collection</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create a group of product recommendations</p>
      </div>

      <div className="card max-w-xl">
        <form action={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="input-field"
              placeholder="e.g. Best Sellers, After-Visit Essentials"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              This is the name your customers will see
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="input-field"
              placeholder="Brief description shown to customers when they scan the QR code..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-600 p-3.5 cursor-pointer transition-all hover:border-brand-300 dark:hover:border-brand-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50 dark:has-[:checked]:bg-brand-900/20 has-[:checked]:ring-1 has-[:checked]:ring-brand-200 dark:has-[:checked]:ring-brand-700">
                <input type="radio" name="visibility" value="shop" defaultChecked className="mt-0.5 text-brand-600 focus:ring-brand-500" />
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Shop</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visible to all team members</p>
                </div>
              </label>
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-600 p-3.5 cursor-pointer transition-all hover:border-purple-300 dark:hover:border-purple-600 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/50 dark:has-[:checked]:bg-purple-900/20 has-[:checked]:ring-1 has-[:checked]:ring-purple-200 dark:has-[:checked]:ring-purple-700">
                <input type="radio" name="visibility" value="personal" className="mt-0.5 text-purple-600 focus:ring-purple-500" />
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Personal</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Only you, unless you share it</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Collection
            </button>
            <Link href={`${base}/collections`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
