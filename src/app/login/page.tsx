"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogIn } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("shop_members")
      .select("shop_id, shops(slug)")
      .eq("user_id", authData.user.id)
      .eq("accepted", true)
      .limit(1);

    if (memberships && memberships.length > 0) {
      const shopSlug = (memberships[0].shops as unknown as { slug: string })?.slug;
      router.push(`/app/${shopSlug}/dashboard`);
    } else {
      router.push("/setup");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Logo + Theme */}
      <div className="flex items-center justify-between w-full max-w-sm mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-sm">
            Q
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-slate-100">QRShelf</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="card p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="animate-fade-in text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3.5 py-2.5 ring-1 ring-red-200 dark:ring-red-800">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
