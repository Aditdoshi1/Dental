"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shareCollection, removeShare } from "@/app/app/[shopSlug]/collections/actions";
import type { CollectionShare, Profile } from "@/types/database";
import { Share2, Loader2, X } from "lucide-react";

interface ShareWithProfile extends CollectionShare {
  profiles: Pick<Profile, "display_name" | "email">;
}

interface TeamMember {
  user_id: string;
  profiles: Pick<Profile, "display_name" | "email">;
}

interface Props {
  shopSlug: string;
  collectionId: string;
  shares: ShareWithProfile[];
  teamMembers: TeamMember[];
  currentUserId: string;
}

export default function SharePanel({
  shopSlug,
  collectionId,
  shares,
  teamMembers,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState<"read" | "readwrite">("read");
  const [sharing, setSharing] = useState(false);
  const [, startTransition] = useTransition();

  const sharedUserIds = shares.map((s) => s.user_id);
  const availableMembers = teamMembers.filter(
    (m) => m.user_id !== currentUserId && !sharedUserIds.includes(m.user_id)
  );

  async function handleShare() {
    if (!selectedUserId) return;
    setSharing(true);
    try {
      await shareCollection(shopSlug, collectionId, selectedUserId, permission);
      setSelectedUserId("");
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setSharing(false);
    }
  }

  async function handleRemove(shareId: string) {
    try {
      await removeShare(shopSlug, shareId, collectionId);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove share");
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-slate-500" />
        <h2 className="font-semibold text-slate-900">Sharing</h2>
      </div>

      {shares.length > 0 && (
        <div className="space-y-2 mb-4">
          {shares.map((share) => (
            <div key={share.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-2.5">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{share.profiles.display_name}</p>
                <p className="text-[11px] text-slate-400">
                  {share.profiles.email} &middot;{" "}
                  <span className={share.permission === "readwrite" ? "text-brand-600" : "text-slate-500"}>
                    {share.permission === "readwrite" ? "Can edit" : "View only"}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleRemove(share.id)}
                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableMembers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Select team member...</option>
            {availableMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles.display_name} ({m.profiles.email})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "read" | "readwrite")}
              className="input-field text-sm flex-1"
            >
              <option value="read">Can view</option>
              <option value="readwrite">Can edit</option>
            </select>
            <button
              onClick={handleShare}
              disabled={!selectedUserId || sharing}
              className="btn-primary text-sm"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          {shares.length > 0 ? "All team members have access." : "No team members to share with."}
        </p>
      )}
    </div>
  );
}
