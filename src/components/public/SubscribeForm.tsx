"use client";

import { useState } from "react";

interface Props {
  collectionId: string;
  collectionTitle: string;
  primaryColor: string;
}

export default function SubscribeForm({ collectionId, collectionTitle, primaryColor }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), collection_id: collectionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-950/[0.05] shadow-sm p-6 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-slate-900 text-lg">You&apos;re subscribed!</h3>
        <p className="text-sm text-slate-500 mt-1">
          We&apos;ll notify you when new products are added to <strong>{collectionTitle}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-950/[0.05] shadow-sm p-6">
      <div className="text-center mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${primaryColor}15` }}>
          <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 className="font-semibold text-slate-900 text-lg">Stay Updated</h3>
        <p className="text-sm text-slate-500 mt-1">
          Get notified when new products are added to this collection.
        </p>
      </div>

      <form onSubmit={handleSubscribe} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
          style={{ focusRingColor: primaryColor } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {status === "loading" ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "Subscribe"
          )}
        </button>
      </form>

      {status === "error" && (
        <p className="text-xs text-red-500 mt-2 animate-fade-in">{errorMsg}</p>
      )}

      <p className="text-[11px] text-slate-400 text-center mt-3">
        No spam. Unsubscribe at any time.
      </p>
    </div>
  );
}
