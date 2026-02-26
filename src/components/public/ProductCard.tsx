"use client";

import type { Item } from "@/types/database";
import { ExternalLink } from "lucide-react";

interface Props {
  item: Item;
  collectionId: string;
  qrCodeId?: string;
  buttonColor?: string;
}

export default function ProductCard({ item, collectionId, qrCodeId, buttonColor = "#f59e0b" }: Props) {
  async function handleClick() {
    fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collectionId,
        item_id: item.id,
        qr_code_id: qrCodeId,
      }),
    }).catch(() => {});

    setTimeout(() => {
      window.open(item.product_url, "_blank", "noopener,noreferrer");
    }, 150);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-950/[0.05] overflow-hidden hover:shadow-lg hover:ring-slate-950/10 transition-all duration-300 group">
      {item.image_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      )}

      <div className="p-5">
        <h3 className="font-semibold text-slate-900 text-lg leading-snug line-clamp-2">{item.title}</h3>
        {item.note && (
          <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{item.note}</p>
        )}
        <button
          onClick={handleClick}
          style={{ backgroundColor: buttonColor }}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:opacity-80 transition-all duration-150"
        >
          View Product
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
