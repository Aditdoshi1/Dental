"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, deleteProduct } from "@/app/app/[shopSlug]/products/actions";
import type { Item, QrCode } from "@/types/database";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  LinkIcon,
  Sparkles,
  Package,
  Image as ImageIcon,
  X,
  Check,
  Download,
  QrCode as QrIcon,
} from "lucide-react";

interface MetadataResult {
  title: string;
  image: string;
  description: string;
  siteName: string;
  favicon: string;
}

interface Props {
  shopSlug: string;
  shopId: string;
  products: Item[];
  qrMap: Record<string, QrCode>;
  appUrl: string;
}

export default function ProductManager({ shopSlug, shopId, products: initialProducts, qrMap, appUrl }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<Item[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaPreview, setMetaPreview] = useState<MetadataResult | null>(null);
  const [expandedQr, setExpandedQr] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const fetchMetadata = useCallback(async (url: string) => {
    if (!url || url.length < 10) { setMetaPreview(null); return; }
    try { new URL(url); } catch { return; }

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
        if (formRef.current) {
          const titleInput = formRef.current.querySelector('input[name="title"]') as HTMLInputElement;
          if (titleInput && !titleInput.value.trim() && data.title) titleInput.value = data.title;
          const imageInput = formRef.current.querySelector('input[name="image_url"]') as HTMLInputElement;
          if (imageInput && !imageInput.value.trim() && data.image) imageInput.value = data.image;
        }
      }
    } catch { /* metadata is optional */ }
    finally { setFetchingMeta(false); }
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

  async function handleCreate(formData: FormData) {
    setSaving(true);
    try {
      const optimistic: Item = {
        id: `temp-${Date.now()}`,
        collection_id: null,
        shop_id: shopId,
        title: (formData.get("title") as string) || "",
        note: (formData.get("note") as string) || "",
        product_url: (formData.get("product_url") as string) || "",
        image_url: (formData.get("image_url") as string) || "",
        sort_order: 0,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProducts((prev) => [optimistic, ...prev]);
      setShowForm(false);
      setMetaPreview(null);

      await createProduct(shopSlug, shopId, formData);
      startTransition(() => router.refresh());
    } catch (err) {
      setProducts(initialProducts);
      setShowForm(true);
      alert(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(itemId: string, formData: FormData) {
    setSaving(true);
    try {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === itemId
            ? {
                ...p,
                title: (formData.get("title") as string) || p.title,
                note: (formData.get("note") as string) || "",
                product_url: (formData.get("product_url") as string) || p.product_url,
                image_url: (formData.get("image_url") as string) || "",
                active: formData.get("active") === "true",
              }
            : p
        )
      );
      setEditingId(null);
      await updateProduct(shopSlug, itemId, formData);
      startTransition(() => router.refresh());
    } catch (err) {
      setProducts(initialProducts);
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Delete this product and its QR code?")) return;
    try {
      setProducts((prev) => prev.filter((p) => p.id !== itemId));
      await deleteProduct(shopSlug, itemId);
      startTransition(() => router.refresh());
    } catch (err) {
      setProducts(initialProducts);
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-5">
      {/* Add button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card animate-scale-in">
          <form ref={formRef} action={handleCreate} className="space-y-4">
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
                <span className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Product URL *</span>
              </label>
              <div className="relative">
                <input name="product_url" type="url" required className="input-field pr-10" placeholder="Paste a product link..." onChange={handleUrlChange} />
                {fetchingMeta && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Paste any product link — we&apos;ll auto-fetch the title and image</p>
            </div>

            {metaPreview && (metaPreview.title || metaPreview.image) && (
              <div className="animate-fade-in bg-slate-50 rounded-lg ring-1 ring-slate-200 p-3 flex gap-3">
                {metaPreview.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={metaPreview.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 line-clamp-2">{metaPreview.title}</p>
                  {metaPreview.description && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{metaPreview.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    {metaPreview.favicon && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={metaPreview.favicon} alt="" className="w-3 h-3" onError={(e) => (e.currentTarget.style.display = "none")} />
                    )}
                    {metaPreview.siteName}
                  </p>
                </div>
                <span className="badge-green text-[10px] flex-shrink-0"><Check className="w-3 h-3" /> Auto-filled</span>
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
                <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Image URL</span>
              </label>
              <input name="image_url" type="url" className="input-field" placeholder="Auto-filled from link, or paste manually" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Product</>}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setMetaPreview(null); }} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 && !showForm ? (
        <div className="card text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium mb-1">No standalone products yet</p>
          <p className="text-sm text-slate-400 mb-4">Products get their own individual QR codes</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm mx-auto">
            <Plus className="w-4 h-4" /> Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const qr = qrMap[product.id];
            const isEditing = editingId === product.id;
            const isTemp = product.id.startsWith("temp-");

            return (
              <div
                key={product.id}
                className={`card group transition-all duration-200 hover:shadow-md ${isTemp ? "opacity-60 animate-pulse-soft" : ""}`}
              >
                {isEditing ? (
                  <form action={(fd) => handleUpdate(product.id, fd)} className="space-y-3">
                    <input name="title" defaultValue={product.title} required className="input-field" placeholder="Title" />
                    <input name="product_url" type="url" defaultValue={product.product_url} required className="input-field text-xs" placeholder="URL" />
                    <input name="note" defaultValue={product.note} className="input-field" placeholder="Note" />
                    <input name="image_url" type="url" defaultValue={product.image_url} className="input-field text-xs" placeholder="Image URL" />
                    <div className="flex items-center gap-2">
                      <input type="hidden" name="active" value={product.active ? "true" : "false"} />
                      <label className="flex items-center gap-1.5 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          defaultChecked={product.active}
                          onChange={(e) => {
                            const hidden = e.target.parentElement?.querySelector('input[name="active"]') as HTMLInputElement;
                            if (hidden) hidden.value = e.target.checked ? "true" : "false";
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Active
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Product image */}
                    {product.image_url ? (
                      <div className="aspect-[16/10] -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-xl bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] -mx-5 -mt-5 mb-4 rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-300" />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">{product.title}</h3>
                        {product.note && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.note}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {!product.active && <span className="badge-gray text-[10px]">Inactive</span>}
                          {qr && <span className="badge-green text-[10px]"><QrIcon className="w-3 h-3" /> QR</span>}
                        </div>
                      </div>
                    </div>

                    {/* QR Code expandable */}
                    {qr && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setExpandedQr(expandedQr === product.id ? null : product.id)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                        >
                          <QrIcon className="w-3.5 h-3.5" />
                          {expandedQr === product.id ? "Hide QR" : "Show QR Code"}
                        </button>
                        {expandedQr === product.id && (
                          <div className="mt-3 animate-fade-in">
                            {qr.qr_png_path && (
                              <div className="bg-white border border-slate-100 rounded-xl p-4 flex justify-center mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`} alt="QR" className="w-32 h-32" />
                              </div>
                            )}
                            <p className="text-[11px] text-slate-500 mb-2">
                              Public link (QR points here):
                            </p>
                            <div className="bg-slate-50 rounded-lg p-2 mb-2 ring-1 ring-slate-200">
                              <code className="text-[10px] text-brand-700 break-all font-mono">
                                {appUrl}/p/{shopSlug}/{product.id}
                              </code>
                            </div>
                            <div className="flex gap-1.5">
                              {qr.qr_png_path && (
                                <a href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_png_path}`} download={`${product.title}-qr.png`} className="btn-primary text-[11px] flex-1 text-center py-1.5">
                                  <Download className="w-3 h-3" /> PNG
                                </a>
                              )}
                              {qr.qr_svg_path && (
                                <a href={`${supabaseUrl}/storage/v1/object/public/qr-codes/${qr.qr_svg_path}`} download={`${product.title}-qr.svg`} className="btn-secondary text-[11px] flex-1 text-center py-1.5">
                                  <Download className="w-3 h-3" /> SVG
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => setEditingId(product.id)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
