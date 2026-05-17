import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Leaderboard } from "@/components/Leaderboard";
import { AICoach } from "@/components/AICoach";
import { CheckersBoard } from "@/components/CheckersBoard";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { Player } from "@/lib/checkers";

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

function Index() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [turn, setTurn] = useState<Player>("p1");
  const [moveNumber, setMoveNumber] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleTurn = useCallback((p: Player, n: number) => {
    setTurn(p);
    setMoveNumber(n);
  }, []);

  const handleEnd = useCallback(() => {
    setGameOver(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav onUpgrade={() => setUpgradeOpen(true)} />

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">Live Table · Est. 2024</div>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-none">
            The quiet art of <span className="italic text-[var(--emerald-deep)]">checkers</span>.
          </h1>
          <div className="hairline mx-auto w-40 mt-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-8 items-start">
          <Leaderboard />

          <div className="flex justify-center">
            <CheckersBoard onGameEnd={handleEnd} onTurnChange={handleTurn} />
          </div>

          <AICoach enabled={gameOver} moveNumber={moveNumber} turn={turn} />
        </div>

        <footer className="mt-20 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>© ChronoCheckers Strategy Academy</span>
          <span>Almaty · Astana · Karaganda</span>
          <span>Crafted with restraint</span>
        </footer>
      </main>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
