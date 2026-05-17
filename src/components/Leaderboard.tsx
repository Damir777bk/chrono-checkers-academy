import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  username: string;
  city: string;
  rating: number;
  wins: number;
  losses: number;
}

export function Leaderboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,city,rating,wins,losses")
        .order("rating", { ascending: false })
        .limit(10);
      setRows((data as Row[]) ?? []);
    };
    load();

    const ch = supabase
      .channel("profiles-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [profile?.rating]);

  return (
    <aside className="bg-card border border-border rounded-sm shadow-luxe overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Kazakhstan</div>
        <h2 className="font-display text-2xl mt-1">National Leaderboard</h2>
        <p className="text-xs text-muted-foreground mt-1">Live ratings · Season XII</p>
      </div>
      <div className="hairline mx-5" />

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-muted-foreground italic">
          No challengers yet. Be the first to enter the academy.
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((p, i) => {
            const isMe = user?.id === p.id;
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors",
                  isMe ? "bg-[var(--gold)]/10" : "hover:bg-secondary/60"
                )}
              >
                <span className="font-display text-lg w-6 text-[var(--gold)] tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {p.username}
                    {isMe && <span className="text-[8px] uppercase tracking-widest text-[var(--gold)]">You</span>}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{p.rating}</div>
                  <div className="text-[10px] tabular-nums text-muted-foreground">
                    {p.wins}W · {p.losses}L
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
