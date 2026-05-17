import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { Leaderboard } from "@/components/Leaderboard";
import { AICoach } from "@/components/AICoach";
import { CheckersBoard } from "@/components/CheckersBoard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Toaster } from "@/components/ui/sonner";
import type { Player } from "@/lib/checkers";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ChronoCheckers · Strategy Academy" },
      {
        name: "description",
        content:
          "A premium checkers academy. Train with an AI Grandmaster coach, climb the Kazakhstan national leaderboard, and master the game.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
});

type Outcome = "win" | "loss" | "draw";

function Index() {
  const { user, profile, refreshProfile } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [turn, setTurn] = useState<Player>("p1");
  const [moveNumber, setMoveNumber] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const handleTurn = useCallback((p: Player, n: number) => {
    setTurn(p);
    setMoveNumber(n);
  }, []);

  const handleEnd = useCallback(
    async (winner: Player | "draw", meta: { mode: "local" | "ai"; difficulty?: string }) => {
      setGameOver(true);
      const result: Outcome = winner === "draw" ? "draw" : winner === "p1" ? "win" : "loss";
      setOutcome(result);

      if (!user || !profile) return;

      // Cyber-rating change
      const delta = result === "win" ? 18 : result === "loss" ? -12 : 2;
      const newRating = Math.max(0, profile.rating + delta);
      const newWins = profile.wins + (result === "win" ? 1 : 0);
      const newLosses = profile.losses + (result === "loss" ? 1 : 0);

      const [{ error: gErr }, { error: pErr }] = await Promise.all([
        supabase.from("games").insert({
          user_id: user.id,
          opponent_type: meta.mode === "ai" ? "ai" : "local",
          difficulty: meta.difficulty ?? null,
          result,
          moves: moveNumber,
          rating_change: delta,
        }),
        supabase
          .from("profiles")
          .update({ rating: newRating, wins: newWins, losses: newLosses })
          .eq("id", user.id),
      ]);

      if (gErr || pErr) {
        toast.error("Failed to save match result");
        return;
      }
      await refreshProfile();
      toast.success(
        result === "win"
          ? `Victory · +${delta} cyber-rating`
          : result === "draw"
          ? `Draw · +${delta} cyber-rating`
          : `Defeat · ${delta} cyber-rating`
      );
    },
    [user, profile, moveNumber, refreshProfile]
  );

  const handleNewGame = useCallback(() => {
    setGameOver(false);
    setOutcome(null);
    setGameKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav onUpgrade={() => setUpgradeOpen(true)} />

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
            Live Table · Est. 2024
          </div>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-none">
            The quiet art of{" "}
            <span className="italic text-[var(--emerald-deep)]">checkers</span>.
          </h1>
          <div className="hairline mx-auto w-40 mt-6" />
          {!user && (
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-4">
              Sign in to track ratings and climb the national leaderboard
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-8 items-start">
          <Leaderboard />

          <div className="flex justify-center">
            <CheckersBoard
              onGameEnd={handleEnd}
              onTurnChange={handleTurn}
              onNewGame={handleNewGame}
            />
          </div>

          <AICoach
            enabled={gameOver}
            moveNumber={moveNumber}
            turn={turn}
            outcome={outcome}
            resetKey={gameKey}
          />
        </div>

        <footer className="mt-20 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>© ChronoCheckers Strategy Academy</span>
          <span>Almaty · Astana · Karaganda</span>
          <span>Crafted with restraint</span>
        </footer>
      </main>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <Toaster />
    </div>
  );
}
