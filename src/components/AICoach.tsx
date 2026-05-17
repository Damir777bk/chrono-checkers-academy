import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  enabled: boolean;
  moveNumber: number;
  turn: "p1" | "p2";
}

const insights = [
  "Charcoal's center pawn structure is unusually compact — exploit the diagonal weakness on file g.",
  "Your last move surrendered tempo. Consider sacrificing a piece on c5 to fork the king column.",
  "The endgame favors the player with kings on the long diagonal. Promote aggressively.",
  "Forcing a trade now simplifies the position toward a winning king-and-pawn endgame.",
];

export function AICoach({ enabled, moveNumber, turn }: Props) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestReview = () => {
    if (!enabled) return;
    setLoading(true);
    setReview(null);
    setTimeout(() => {
      setReview(insights[Math.floor(Math.random() * insights.length)]);
      setLoading(false);
    }, 1100);
  };

  return (
    <aside className="bg-card border border-border rounded-sm shadow-luxe overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Grandmaster</div>
        <h2 className="font-display text-2xl mt-1">AI Tactical Coach</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Trained on 4.2M master games · Neo-classical evaluation engine
        </p>
      </div>
      <div className="hairline mx-5" />

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="border border-border rounded-sm py-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Move</div>
            <div className="font-display text-xl tabular-nums">{moveNumber}</div>
          </div>
          <div className="border border-border rounded-sm py-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Turn</div>
            <div className="font-display text-xl">{turn === "p1" ? "White" : "Charcoal"}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Engine Confidence</span>
            <span className="tabular-nums">{enabled ? "94%" : "—"}</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-gold transition-all duration-700"
              style={{ width: enabled ? "94%" : "12%" }}
            />
          </div>
        </div>

        <button
          onClick={requestReview}
          disabled={!enabled || loading}
          className={cn(
            "w-full py-3 px-4 rounded-sm text-xs uppercase tracking-[0.25em] font-medium transition-all",
            "border",
            enabled
              ? "bg-primary text-primary-foreground border-[var(--gold)]/40 hover:bg-[var(--emerald-forest)] hover:border-[var(--gold)]"
              : "bg-muted text-muted-foreground border-border cursor-not-allowed"
          )}
        >
          {loading ? "Analyzing position…" : "Request AI Tactical Review"}
        </button>

        {!enabled && (
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            Tactical review unlocks once the game concludes. Play through to receive a full annotated breakdown of pivotal moments.
          </p>
        )}

        {review && (
          <div className="border-l-2 border-[var(--gold)] pl-4 py-1 animate-piece-place">
            <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-1">Insight</div>
            <p className="text-sm leading-relaxed text-foreground">{review}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
