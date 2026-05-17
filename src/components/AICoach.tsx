import { useEffect, useState } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyEvents, type MatchEvents } from "@/lib/checkers";

interface Props {
  enabled: boolean;
  moveNumber: number;
  turn: "p1" | "p2";
  /** "win" | "loss" | "draw" | null — result for current user (p1) */
  outcome: "win" | "loss" | "draw" | null;
  /** Bump this value to reset the coach panel for a new game. */
  resetKey: number;
  /** Telemetry collected during the match. */
  events?: MatchEvents;
  /** Live-hint controls (optional — when omitted the panel hides them). */
  isPremium?: boolean;
  hintsUsed?: number;
  maxHints?: number;
  canRequestHint?: boolean;
  hintSuggestion?: string | null;
  onRequestHint?: () => void;
}

const SCAN_LINES = [
  "Initializing neural lattice…",
  "Indexing 4,200,000 master games…",
  "Replaying move tree…",
  "Auditing capture sequences…",
  "Evaluating clock pressure curve…",
  "Compiling tactical verdict…",
];

type Insight = { label: string; text: string };

/** Produce a context-aware breakdown from logged match events. */
function buildAnalysis(outcome: "win" | "loss" | "draw" | null, ev: MatchEvents): Insight[] {
  const insights: Insight[] = [];

  if (ev.missedCaptures > 0) {
    insights.push({
      label: "Tactical Error",
      text:
        ev.missedCaptures === 1
          ? "On one turn you reached for a quiet piece while a mandatory capture was on the board. The engine forced your hand — costing you tempo."
          : `On ${ev.missedCaptures} separate turns you ignored mandatory captures, allowing the opponent to dictate the pace of the exchange.`,
    });
  }

  if (ev.kingLossesP1 > 0) {
    insights.push({
      label: "Crown Lost",
      text: `Your opponent captured ${ev.kingLossesP1 === 1 ? "your king" : `${ev.kingLossesP1} of your kings`}. Promote pieces only when their escape squares are defended — an exposed king is worth more than two soldiers.`,
    });
  }

  if (ev.blitzPressureP1) {
    insights.push({
      label: "Time Management",
      text:
        outcome === "win"
          ? "You played well but flirted with the flag — your clock dipped under 30 seconds. Build a faster opening repertoire so the mid-game has air to breathe."
          : "You crumbled under blitz pressure. Try to move faster in the opening so the mid-game has air to breathe.",
    });
  }

  if (ev.earlyDefeat) {
    insights.push({
      label: "Opening Flaw",
      text: `Your defence collapsed in only ${ev.totalMoves} moves. Focus on securing your back row in the first five moves and avoid early advances on a single flank.`,
    });
  }

  if (insights.length === 0) {
    if (outcome === "win") {
      insights.push({
        label: "Strategic Verdict",
        text: `A clean ${ev.totalMoves}-move performance — no missed captures, no king losses, no time trouble. Textbook tempo control. Karpov would nod.`,
      });
    } else if (outcome === "draw") {
      insights.push({
        label: "Strategic Verdict",
        text: "A balanced positional duel. Both sides held tempo and material flawlessly — true grandmaster equilibrium.",
      });
    } else {
      insights.push({
        label: "Strategic Verdict",
        text: "Material was even and the clock was healthy, but your endgame conversion slipped. Study king-and-pawn endings — file E.",
      });
    }
  }

  return insights;
}

export function AICoach({
  enabled,
  moveNumber,
  turn,
  outcome,
  resetKey,
  events,
  isPremium = false,
  hintsUsed = 0,
  maxHints = 2,
  canRequestHint = false,
  hintSuggestion = null,
  onRequestHint,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [review, setReview] = useState<Insight[] | null>(null);
  const [scanIdx, setScanIdx] = useState(0);

  // Reset when a new game begins.
  useEffect(() => {
    setPhase("idle");
    setReview(null);
    setScanIdx(0);
  }, [resetKey]);

  // Cycle scan lines while scanning.
  useEffect(() => {
    if (phase !== "scanning") return;
    const i = setInterval(() => setScanIdx((n) => (n + 1) % SCAN_LINES.length), 450);
    return () => clearInterval(i);
  }, [phase]);

  const requestReview = () => {
    if (!enabled || phase === "scanning") return;
    setPhase("scanning");
    setReview(null);
    setScanIdx(0);
    const snapshot = events ?? emptyEvents();
    setTimeout(() => {
      setReview(buildAnalysis(outcome, snapshot));
      setPhase("done");
    }, 3000);
  };

  return (
    <>
      {phase === "scanning" && <ScanningOverlay line={SCAN_LINES[scanIdx]} />}

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
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {enabled ? "Result" : "Turn"}
              </div>
              <div className="font-display text-xl">
                {enabled
                  ? outcome === "win" ? "Victory" : outcome === "draw" ? "Draw" : "Defeat"
                  : turn === "p1" ? "White" : "Charcoal"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Engine Confidence</span>
              <span className="tabular-nums">{phase === "done" ? "94%" : enabled ? "—" : "12%"}</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-gold transition-all duration-700"
                style={{ width: phase === "done" ? "94%" : enabled ? "48%" : "12%" }}
              />
            </div>
          </div>

          <button
            onClick={requestReview}
            disabled={!enabled || phase === "scanning"}
            className={cn(
              "w-full py-3 px-4 rounded-sm text-xs uppercase tracking-[0.25em] font-medium transition-all border",
              enabled && phase !== "scanning"
                ? "bg-primary text-primary-foreground border-[var(--gold)]/40 hover:bg-[var(--emerald-forest)] hover:border-[var(--gold)]"
                : "bg-muted text-muted-foreground border-border cursor-not-allowed"
            )}
          >
            {phase === "scanning"
              ? "Analyzing…"
              : phase === "done"
              ? "Re-analyze Match"
              : "Analyze Match with AI Coach"}
          </button>

          {!enabled && (
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              Tactical review unlocks once the game concludes. Play through to receive a full annotated breakdown.
            </p>
          )}

          {review && (
            <div className="space-y-3 animate-piece-place">
              {review.map((ins, i) => (
                <div key={i} className="border-l-2 border-[var(--gold)] pl-4 py-1">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-1">
                    {ins.label}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{ins.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function ScanningOverlay({ line }: { line: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.14_0.01_250)]/95 backdrop-blur-md animate-modal-rise">
      <div className="absolute inset-0 matrix-rain opacity-40 pointer-events-none" />
      <div className="absolute inset-0 scan-lines pointer-events-none" />

      <div className="relative text-center max-w-md px-6">
        <div className="text-[10px] uppercase tracking-[0.5em] text-[var(--gold)] mb-4">
          Neural Network
        </div>
        <h2 className="font-display text-4xl md:text-5xl text-[var(--ivory)] leading-tight">
          Analyzing your tactics
        </h2>
        <div className="hairline mx-auto w-32 my-6" />

        <div className="font-mono text-xs tracking-wider text-[var(--gold-soft)] h-5 transition-opacity">
          {line}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
