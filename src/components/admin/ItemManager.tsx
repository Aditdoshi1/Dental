"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem, deleteItem } from "@/app/app/[shopSlug]/collections/actions";
import { addProductToCollection } from "@/app/app/[shopSlug]/products/actions";
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
  Link as LinkIconSimple,
  Package,
} from "lucide-react";

interface StandaloneProduct {
  id: string;
  title: string;
  product_url: string;
  image_url: string;
  note: string;
}

interface Props {
  shopSlug: string;
  shopId: string;
  collectionId: string;
  items: Item[];
  canEdit: boolean;
  standaloneProducts?: StandaloneProduct[];
}

interface MetadataResult {
  title: string;
  image: string;
  description: string;
  siteName: string;
  favicon: string;
}

export default function ItemManager({ shopSlug, shopId, collectionId, items: initialItems, canEdit, standaloneProducts = [] }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<"new" | "existing" | null>(null);
  const [addingExistingId, setAddingExistingId] = useState<string | null>(null);
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

        // Auto-fill: always set image when we have it
        if (formRef.current) {
          const titleInput = formRef.current.querySelector('input[name="title"]') as HTMLInputElement;
          if (titleInput && !titleInput.value.trim() && data.title) {
            titleInput.value = data.title;
          }
          const imageInput = formRef.current.querySelector('input[name="image_url"]') as HTMLInputElement;
          if (imageInput && data.image) {
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
    if (metaPreview?.image && !formData.get("image_url")) {
      formData.set("image_url", metaPreview.image);
    }
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
      setAddMode(null);

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

  async function handleAddExistingProduct(productId: string) {
    setAddingExistingId(productId);
    try {
      const { item } = await addProductToCollection(shopSlug, shopId, productId, collectionId);
      setAddMode(null);
      if (item) setItems((prev) => [item, ...prev]);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add to collection");
    } finally {
      setAddingExistingId(null);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Products</h2>
          <span className="badge-gray">{items.length}</span>
        </div>
        {canEdit && !showForm && addMode === null && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setAddMode("new"); setShowForm(true); }}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add new product
            </button>
            {standaloneProducts.length > 0 && (
              <button
                onClick={() => setAddMode(addMode === "existing" ? null : "existing")}
                className="btn-secondary text-sm"
              >
                <LinkIconSimple className="w-4 h-4" />
                Add existing product
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add existing product: list of standalone products */}
      {canEdit && addMode === "existing" && standaloneProducts.length > 0 && (
        <div className="animate-scale-in mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Choose a product to add to this collection</h3>
            <button type="button" onClick={() => setAddMode(null)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto space-y-1">
            {standaloneProducts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleAddExistingProduct(p.id)}
                  disabled={addingExistingId !== null}
                  className="w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-white dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                >
                  {p.image_url ? (
                    <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-1">{p.title}</span>
                  {addingExistingId === p.id ? <Loader2 className="w-4 h-4 animate-spin text-brand-500 flex-shrink-0" /> : <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add new product form */}
      {showForm && (
        <div className="animate-scale-in mb-5">
          <form ref={formRef} action={handleCreateItem} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 ring-1 ring-slate-200/50 dark:ring-slate-600/50 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                New Product
              </h3>
              <button type="button" onClick={() => { setShowForm(false); setMetaPreview(null); setAddMode(null); }} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                Paste any product link — we&apos;ll auto-fetch the title and image
              </p>
            </div>

            {/* Metadata Preview */}
            {metaPreview && (metaPreview.title || metaPreview.image) && (
              <div className="animate-fade-in bg-white rounded-lg ring-1 ring-slate-200 p-3 flex gap-3">
                {metaPreview.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
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
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{metaPreview.title}</p>
                  {metaPreview.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{metaPreview.description}</p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
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
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Title *</label>
                <input name="title" required className="input-field" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Note</label>
                <input name="note" className="input-field" placeholder="Why you recommend this" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
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
              <button type="button" onClick={() => { setShowForm(false); setMetaPreview(null); setAddMode(null); }} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">No products yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Add your first product recommendation above</p>
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
                    <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
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
                  <span className="text-xs text-slate-300 dark:text-slate-500 font-mono w-5 text-right flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  {item.image_url ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                      {!item.active && <span className="badge-gray text-[10px]">Off</span>}
                    </div>
                    {item.note && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.note}</p>}
                  </div>

                  {item.product_url && (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex p-1.5 rounded-md text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
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
