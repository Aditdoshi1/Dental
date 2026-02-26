"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Loader2, Trash2, Shield, Crown, User } from "lucide-react";

interface Member {
  id: string;
  user_id: string | null;
  role: "owner" | "admin" | "member";
  invited_email: string;
  accepted: boolean;
  profiles: { display_name: string; email: string } | null;
}

export default function TeamPage() {
  const params = useParams();
  const shopSlug = params.shopSlug as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [shopId, setShopId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadMembers = useCallback(async () => {
    const supabase = createClient();
    const { data: shop } = await supabase.from("shops").select("id").eq("slug", shopSlug).single();
    if (!shop) return;
    setShopId(shop.id);

    const { data } = await supabase
      .from("shop_members")
      .select("id, user_id, role, invited_email, accepted, profiles(display_name, email)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: true });

    if (data) setMembers(data as unknown as Member[]);
  }, [shopSlug]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !shopId) return;
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const existing = members.find(
      (m) => m.invited_email === inviteEmail || m.profiles?.email === inviteEmail
    );
    if (existing) {
      setMessage({ type: "error", text: "This person is already a member or has a pending invite." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("shop_members").insert({
      shop_id: shopId,
      role: inviteRole,
      invited_email: inviteEmail,
      accepted: false,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: `Invite sent to ${inviteEmail}!` });
      setInviteEmail("");
      await loadMembers();
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "member") {
    const supabase = createClient();
    await supabase.from("shop_members").update({ role: newRole }).eq("id", memberId);
    await loadMembers();
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    const supabase = createClient();
    await supabase.from("shop_members").delete().eq("id", memberId);
    await loadMembers();
  }

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-3 h-3" />;
    if (role === "admin") return <Shield className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const roleBadge = (role: string) => {
    if (role === "owner") return "badge-purple";
    if (role === "admin") return "badge-blue";
    return "badge-gray";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Invite and manage team members</p>
      </div>

      {/* Invite form */}
      <div className="card mb-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Invite Team Member</h2>
        </div>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="input-field flex-1"
              placeholder="colleague@example.com"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              className="input-field w-28"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary text-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
            </button>
          </div>

          {message && (
            <div className={`animate-fade-in text-sm rounded-lg px-3 py-2.5 ${
              message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {message.text}
            </div>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            The person will see the invite when they sign up or log in with this email.
          </p>
        </form>
      </div>

      {/* Members list */}
      <div className="card max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Team Members</h2>
          <span className="badge-gray">{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div className="py-8 text-center">
            <div className="skeleton h-4 w-32 mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                    <span className="text-sm font-medium">
                      {(m.profiles?.display_name || m.invited_email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {m.profiles?.display_name || m.invited_email}
                      </p>
                      <span className={`${roleBadge(m.role)} text-[10px]`}>
                        {roleIcon(m.role)} {m.role}
                      </span>
                      {!m.accepted && <span className="badge-yellow text-[10px]">Pending</span>}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{m.profiles?.email || m.invited_email}</p>
                  </div>
                </div>

                {m.role !== "owner" && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.id, e.target.value as "admin" | "member")}
                      className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
