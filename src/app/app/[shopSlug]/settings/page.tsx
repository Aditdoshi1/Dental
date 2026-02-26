"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, Palette } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const shopSlug = params.shopSlug as string;

  const [shop, setShop] = useState<{
    id: string; name: string; description: string;
    logo_url: string; primary_color: string; secondary_color: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("shops")
        .select("id, name, description, logo_url, primary_color, secondary_color")
        .eq("slug", shopSlug)
        .single();
      if (data) setShop(data);
    }
    load();
  }, [shopSlug]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!shop) return;
    setSaving(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase
      .from("shops")
      .update({
        name: (fd.get("name") as string)?.trim(),
        description: (fd.get("description") as string)?.trim() || "",
        primary_color: (fd.get("primary_color") as string) || "#14b8a6",
        secondary_color: (fd.get("secondary_color") as string) || "#f59e0b",
      })
      .eq("id", shop.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Settings saved!" });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  }

  if (!shop) {
    return (
      <div>
        <div className="skeleton h-7 w-40 mb-6" />
        <div className="card max-w-xl space-y-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Shop Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Customize your shop&apos;s appearance and details</p>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1.5">
              Shop Name
            </label>
            <input id="name" name="name" type="text" required defaultValue={shop.name} className="input-field" />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-600 mb-1.5">
              Description
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={shop.description} className="input-field" placeholder="What does your shop specialize in?" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Slug</label>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3.5 py-2.5 font-mono ring-1 ring-slate-200">
              /{shopSlug}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-slate-500" />
              <label className="block text-sm font-medium text-slate-600">Brand Colors</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary_color" className="block text-xs text-slate-500 mb-1.5">Primary</label>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 ring-1 ring-slate-200">
                  <input
                    id="primary_color"
                    name="primary_color"
                    type="color"
                    defaultValue={shop.primary_color || "#14b8a6"}
                    className="w-10 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-500">Buttons & accents</span>
                </div>
              </div>
              <div>
                <label htmlFor="secondary_color" className="block text-xs text-slate-500 mb-1.5">Secondary</label>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 ring-1 ring-slate-200">
                  <input
                    id="secondary_color"
                    name="secondary_color"
                    type="color"
                    defaultValue={shop.secondary_color || "#f59e0b"}
                    className="w-10 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-500">Highlights</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Logo</label>
            <div className="bg-slate-50 rounded-lg p-4 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">
                Upload an image to the &ldquo;shop-assets&rdquo; Supabase Storage bucket
                and paste the public URL. Full upload UI coming soon.
              </p>
            </div>
          </div>

          {message && (
            <div className={`animate-fade-in text-sm rounded-lg px-3.5 py-2.5 ${
              message.type === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
            }`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
