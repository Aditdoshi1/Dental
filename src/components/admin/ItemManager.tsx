"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem, deleteItem } from "@/app/app/[shopSlug]/collections/actions";
import type { Item } from "@/types/database";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  LinkIcon,
  Sparkles,
  FolderOpen,
  Image as ImageIcon,
  X,
  Check,
} from "lucide-react";

interface Props {
  shopSlug: string;
  shopId: string;
  collectionId: string;
  items: Item[];
  canEdit: boolean;
}

interface MetadataResult {
  title: string;
  image: string;
  description: string;
  siteName: string;
  favicon: string;
}

export default function ItemManager({ shopSlug, shopId, collectionId, items: initialItems, canEdit }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaPreview, setMetaPreview] = useState<MetadataResult | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchMetadata = useCallback(async (url: string) => {
    if (!url || url.length < 10) {
      setMetaPreview(null);
      return;
    }

    try {
      new URL(url);
    } catch {
      return;
    }

    setFetchingMeta(true);
    try {
      const res = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data: MetadataResult = await res.json();
        setMetaPreview(data);

        // Auto-fill empty title field
        if (formRef.current) {
          const titleInput = formRef.current.querySelector('input[name="title"]') as HTMLInputElement;
          if (titleInput && !titleInput.value.trim() && data.title) {
            titleInput.value = data.title;
          }
          const imageInput = formRef.current.querySelector('input[name="image_url"]') as HTMLInputElement;
          if (imageInput && !imageInput.value.trim() && data.image) {
            imageInput.value = data.image;
          }
        }
      }
    } catch {
      // Silently fail - metadata is optional
    } finally {
      setFetchingMeta(false);
    }
  }, []);

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value.trim();
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);

    if (url.length > 10) {
      fetchTimeout.current = setTimeout(() => fetchMetadata(url), 600);
    } else {
      setMetaPreview(null);
    }
  }

  async function handleCreateItem(formData: FormData) {
    setSaving(true);
    try {
      // Optimistic: add to local state immediately
      const optimisticItem: Item = {
        id: `temp-${Date.now()}`,
        collection_id: collectionId,
        shop_id: shopId,
        title: (formData.get("title") as string) || "",
        note: (formData.get("note") as string) || "",
        product_url: (formData.get("product_url") as string) || "",
        image_url: (formData.get("image_url") as string) || "",
        sort_order: items.length,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, optimisticItem]);
      setShowForm(false);
      setMetaPreview(null);

      await createItem(shopSlug, collectionId, shopId, formData);
      startTransition(() => router.refresh());
    } catch (err) {
      // Revert optimistic update
      setItems(initialItems);
      setShowForm(true);
      alert(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateItem(itemId: string, formData: FormData) {
    setSaving(true);
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                title: (formData.get("title") as string) || item.title,
                note: (formData.get("note") as string) || "",
                product_url: (formData.get("product_url") as string) || item.product_url,
                image_url: (formData.get("image_url") as string) || "",
                active: formData.get("active") === "true",
                sort_order: parseInt(formData.get("sort_order") as string) || item.sort_order,
              }
            : item
        )
      );
      setEditingId(null);

      await updateItem(shopSlug, itemId, collectionId, formData);
      startTransition(() => router.refresh());
    } catch (err) {
      setItems(initialItems);
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;
    try {
      // Optimistic delete
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      await deleteItem(shopSlug, itemId, collectionId);
      startTransition(() => router.refresh());
    } catch (err) {
      setItems(initialItems);
      alert(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Products</h2>
          <span className="badge-gray">{items.length}</span>
        </div>
        {canEdit && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="animate-scale-in mb-5">
          <form ref={formRef} action={handleCreateItem} className="bg-slate-50 rounded-xl p-5 ring-1 ring-slate-200/50 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                New Product
              </h3>
              <button type="button" onClick={() => { setShowForm(false); setMetaPreview(null); }} className="p-1 rounded-md hover:bg-slate-200 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  Product URL *
                </span>
              </label>
              <div className="relative">
                <input
                  name="product_url"
                  type="url"
                  required
                  className="input-field pr-10"
                  placeholder="Paste a product link..."
                  onChange={handleUrlChange}
                />
                {fetchingMeta && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Paste any product link — we&apos;ll auto-fetch the title and image
              </p>
            </div>

            {/* Metadata Preview */}
            {metaPreview && (metaPreview.title || metaPreview.image) && (
              <div className="animate-fade-in bg-white rounded-lg ring-1 ring-slate-200 p-3 flex gap-3">
                {metaPreview.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={metaPreview.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 line-clamp-2">{metaPreview.title}</p>
                  {metaPreview.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{metaPreview.description}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    {metaPreview.favicon && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={metaPreview.favicon} alt="" className="w-3 h-3" onError={(e) => (e.currentTarget.style.display = "none")} />
                    )}
                    {metaPreview.siteName}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="badge-green text-[10px]">
                    <Check className="w-3 h-3" /> Auto-filled
                  </span>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Title *</label>
                <input name="title" required className="input-field" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Note</label>
                <input name="note" className="input-field" placeholder="Why you recommend this" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Image URL
                </span>
              </label>
              <input name="image_url" type="url" className="input-field" placeholder="Auto-filled from link, or paste manually" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Product
                  </>
                )}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setMetaPreview(null); }} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 mb-1">No products yet</p>
          <p className="text-xs text-slate-400">Add your first product recommendation above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`group rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-150 ${
                item.id.startsWith("temp-") ? "opacity-70 animate-pulse-soft" : ""
              }`}
            >
              {editingId === item.id ? (
                <form action={(fd) => handleUpdateItem(item.id, fd)} className="p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input name="title" defaultValue={item.title} required className="input-field" placeholder="Title" />
                    <input name="product_url" type="url" defaultValue={item.product_url} required className="input-field" placeholder="URL" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input name="note" defaultValue={item.note} className="input-field" placeholder="Note" />
                    <input name="image_url" type="url" defaultValue={item.image_url} className="input-field" placeholder="Image URL" />
                  </div>
                  <div className="flex gap-3 items-center">
                    <input name="sort_order" type="number" defaultValue={item.sort_order} className="input-field w-20" />
                    <label className="flex items-center gap-1.5 text-sm text-slate-600">
                      <input type="hidden" name="active" value={item.active ? "true" : "false"} />
                      <input
                        type="checkbox"
                        defaultChecked={item.active}
                        onChange={(e) => {
                          const hidden = e.target.parentElement?.querySelector('input[name="active"]') as HTMLInputElement;
                          if (hidden) hidden.value = e.target.checked ? "true" : "false";
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      Active
                    </label>
                    <div className="flex-1" />
                    <button type="submit" disabled={saving} className="btn-primary text-sm">
                      <Check className="w-4 h-4" /> Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-xs text-slate-300 font-mono w-5 text-right flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  {item.image_url ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 ring-1 ring-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900 truncate">{item.title}</p>
                      {!item.active && <span className="badge-gray text-[10px]">Off</span>}
                    </div>
                    {item.note && <p className="text-xs text-slate-500 truncate">{item.note}</p>}
                  </div>

                  {item.product_url && (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex p-1.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
