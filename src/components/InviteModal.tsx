import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  url: string;
  waiting: boolean;
  onClose: () => void;
}

/**
 * Modal shown to the host after generating a multiplayer room.
 * Displays the shareable invite URL and a "waiting for opponent" spinner
 * until the second player connects via Supabase Realtime presence.
 */
export function InviteModal({ open, url, waiting, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-md w-[90%] rounded-sm border border-[var(--gold)]/50 bg-card p-8 shadow-luxe animate-scale-in">
        <div className="absolute inset-2 rounded-sm pointer-events-none ring-1 ring-[var(--gold)]/30" />
        <div className="flex flex-col items-center text-center gap-5">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
            Private Table · Multiplayer
          </span>
          <h2 className="font-serif text-3xl tracking-tight text-foreground">
            Invite a Friend
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Share this link. Your opponent plays as Charcoal. The table opens
            the moment they join.
          </p>

          <div className="w-full flex items-stretch border border-border rounded-sm overflow-hidden">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-background/40 px-3 py-2 text-xs font-mono text-foreground/80 outline-none truncate"
            />
            <button
              onClick={copy}
              className={cn(
                "px-4 text-[10px] uppercase tracking-[0.25em] transition-colors",
                copied
                  ? "bg-[var(--emerald-deep)] text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>

          {waiting && (
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                Waiting for opponent to join…
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
          >
            {waiting ? "Cancel" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
