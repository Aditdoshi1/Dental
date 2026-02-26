"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateCollection, deleteCollection } from "@/app/app/[shopSlug]/collections/actions";
import type { Collection, ShopRole } from "@/types/database";
import { Save, Trash2, Loader2, Eye, EyeOff, Globe, Lock } from "lucide-react";

interface Props {
  collection: Collection;
  shopSlug: string;
  shopId: string;
  role: ShopRole;
}

export default function CollectionForm({ collection, shopSlug, shopId, role }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const canEdit = role === "owner" || role === "admin" || collection.owner_id === shopId;

  async function handleUpdate(formData: FormData) {
    setSaving(true);
    setMessage(null);
    try {
      await updateCollection(shopSlug, collection.id, formData);
      setMessage({ type: "success", text: "Changes saved" });
      startTransition(() => router.refresh());
      setTimeout(() => setMessage(null), 2500);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this collection and all its items? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteCollection(shopSlug, collection.id);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to delete" });
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-slate-900 mb-5">Collection Details</h2>
      <form action={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-600 mb-1.5">Title</label>
          <input id="title" name="title" type="text" required defaultValue={collection.title} className="input-field" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-600 mb-1.5">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={collection.description} className="input-field" placeholder="Visible to customers on the landing page" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${
              collection.visibility === "shop" ? "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300"
            }`}>
              <input type="radio" name="visibility" value="shop" defaultChecked={collection.visibility === "shop"} className="text-brand-600 focus:ring-brand-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-sm font-medium text-slate-900">Shop</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Visible to all team members</p>
              </div>
            </label>
            <label className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${
              collection.visibility === "personal" ? "border-purple-300 bg-purple-50/50 ring-1 ring-purple-200" : "border-slate-200 hover:border-slate-300"
            }`}>
              <input type="radio" name="visibility" value="personal" defaultChecked={collection.visibility === "personal"} className="text-purple-600 focus:ring-purple-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-sm font-medium text-slate-900">Personal</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Only you + shared members</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="hidden" name="active" value={collection.active ? "true" : "false"} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={collection.active}
              onChange={(e) => {
                const hidden = e.target.parentElement?.parentElement?.querySelector('input[name="active"]') as HTMLInputElement;
                if (hidden) hidden.value = e.target.checked ? "true" : "false";
              }}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="flex items-center gap-1.5 text-slate-700">
              {collection.active ? <Eye className="w-3.5 h-3.5 text-brand-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              Active (visible to customers)
            </span>
          </label>
        </div>

        {message && (
          <div className={`animate-fade-in text-sm rounded-lg px-3.5 py-2.5 ${
            message.type === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={saving || !canEdit} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {canEdit && (
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
