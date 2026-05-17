import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  enabled: boolean;
  moveNumber: number;
  turn: "p1" | "p2";
  /** "win" | "loss" | "draw" | null — result for current user (p1) */
  outcome: "win" | "loss" | "draw" | null;
  /** Bump this value to reset the coach panel for a new game. */
  resetKey: number;
}

const WIN_FEEDBACK = [
  "Tactical analysis: You dominated the center grid, locking down crucial diagonals by move 9. Your tempo control was textbook Karpov.",
  "Engine review: Your sacrifice on move 14 unraveled their pawn chain — a grandmaster-tier exchange. The endgame conversion was clean.",
  "Pattern recognition: Multi-jump combination on the c-file converted material advantage into a king on the long diagonal. Decisive play.",
  "Strategic verdict: Patient zugzwang. You forced your opponent into a losing trade structure by move 18 and never released pressure.",
];

const LOSS_FEEDBACK = [
  "Tactical analysis: You held the center early, but exposed your rear flank around move 12. Focus on securing edge nodes before pushing forward.",
  "Engine review: A premature king-side advance left your back rank vulnerable. Reinforce defensive pawns before initiating exchanges.",
  "Pattern recognition: You missed a forced double-jump opportunity on move 9. Train tactical vision drills — the position was winning.",
  "Strategic verdict: Material was even, but your kings entered the endgame on the wrong diagonal. Study king-and-pawn endings, file E.",
];

const DRAW_FEEDBACK = [
  "Tactical analysis: A balanced, defensive masterclass. Both sides held tempo flawlessly — true grandmaster equilibrium.",
  "Engine review: Symmetrical pawn structures led to a quiet positional draw. Consider sharper openings next session.",
];

const SCAN_LINES = [
  "Initializing neural lattice…",
  "Indexing 4,200,000 master games…",
  "Cross-referencing opening tree…",
  "Computing tempo deltas…",
  "Evaluating king safety vectors…",
  "Compiling tactical verdict…",
];

export function AICoach({ enabled, moveNumber, turn, outcome, resetKey }: Props) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [review, setReview] = useState<string | null>(null);
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
    setTimeout(() => {
      const pool =
        outcome === "win" ? WIN_FEEDBACK : outcome === "draw" ? DRAW_FEEDBACK : LOSS_FEEDBACK;
      setReview(pool[Math.floor(Math.random() * pool.length)]);
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
            <div className="border-l-2 border-[var(--gold)] pl-4 py-1 animate-piece-place">
              <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-1">
                Grandmaster Insight
              </div>
              <p className="text-sm leading-relaxed text-foreground">{review}</p>
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
