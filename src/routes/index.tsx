import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { Leaderboard } from "@/components/Leaderboard";
import { AICoach } from "@/components/AICoach";
import { CheckersBoard } from "@/components/CheckersBoard";
import { OnlineCheckersBoard } from "@/components/OnlineCheckersBoard";
import { InviteModal } from "@/components/InviteModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Toaster } from "@/components/ui/sonner";
import { emptyEvents, type MatchEvents, type Move, type Player } from "@/lib/checkers";
import { THEMES, type ThemeId } from "@/lib/themes";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const squareName = (r: number, c: number) => `${FILES[c]}${8 - r}`;

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

/** Multiplayer session info derived from URL + sessionStorage host marker. */
type RoomInfo = { id: string; role: Player };

function Index() {
  const { user, profile, refreshProfile } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<ThemeId>("classic");
  const isPremium = profile?.is_premium === true;
  const themeClass = THEMES.find((t) => t.id === theme)?.className ?? "";

  const handleThemeSelect = useCallback(
    (id: ThemeId) => {
      const t = THEMES.find((x) => x.id === id);
      if (!t) return;
      if (t.premium && !isPremium) {
        setUpgradeReason(
          "Unlock custom premium themes and unlimited AI Coaching for just $9/mo.",
        );
        setUpgradeOpen(true);
        return;
      }
      setTheme(id);
    },
    [isPremium],
  );

  const openGenericUpgrade = useCallback(() => {
    setUpgradeReason(undefined);
    setUpgradeOpen(true);
  }, []);
  const [turn, setTurn] = useState<Player>("p1");
  const [moveNumber, setMoveNumber] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvents>(() => emptyEvents());
  const [gameKey, setGameKey] = useState(0);

  // Multiplayer state
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  // Live Coach Hints
  const MAX_FREE_HINTS = 2;
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintToken, setHintToken] = useState(0);
  const [hintSuggestion, setHintSuggestion] = useState<string | null>(null);

  const handleRequestHint = useCallback(() => {
    if (!isPremium && hintsUsed >= MAX_FREE_HINTS) {
      setUpgradeReason(
        "Unlock unlimited live hints and master your strategy with Pro!",
      );
      setUpgradeOpen(true);
      return;
    }
    if (!isPremium) setHintsUsed((n) => n + 1);
    setHintToken((t) => t + 1);
  }, [isPremium, hintsUsed]);

  const handleHintComputed = useCallback((move: Move | null) => {
    if (!move) {
      setHintSuggestion(null);
      return;
    }
    const from = squareName(move.from.r, move.from.c);
    const to = squareName(move.to.r, move.to.c);
    const verb = move.captures.length > 0
      ? `capture toward ${to}`
      : `advance to ${to}`;
    setHintSuggestion(
      `Coach suggests: ${verb} from ${from} — strongest line on the board right now.`,
    );
  }, []);

  // Detect ?room= in URL on mount (client-only). Host marker is in sessionStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("room");
    if (!rid) return;
    const isHost = sessionStorage.getItem(`cc:host:${rid}`) === "1";
    setRoom({ id: rid, role: isHost ? "p1" : "p2" });
    setInviteUrl(`${window.location.origin}${window.location.pathname}?room=${rid}`);
    if (isHost) setInviteOpen(true);
  }, []);

  const handleInvite = useCallback(() => {
    if (typeof window === "undefined") return;
    const rid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 12);
    sessionStorage.setItem(`cc:host:${rid}`, "1");
    const url = `${window.location.origin}${window.location.pathname}?room=${rid}`;
    window.history.replaceState(null, "", `?room=${rid}`);
    setInviteUrl(url);
    setRoom({ id: rid, role: "p1" });
    setOpponentJoined(false);
    setInviteOpen(true);
  }, []);

  const leaveRoom = useCallback(() => {
    if (typeof window === "undefined") return;
    if (room) sessionStorage.removeItem(`cc:host:${room.id}`);
    window.history.replaceState(null, "", window.location.pathname);
    setRoom(null);
    setInviteOpen(false);
    setOpponentJoined(false);
  }, [room]);

  const handleTurn = useCallback((p: Player, n: number) => {
    setTurn(p);
    setMoveNumber(n);
  }, []);

  const handleEnd = useCallback(
    async (
      winner: Player | "draw",
      meta: { mode: "local" | "ai" | "online"; difficulty?: string },
      events?: MatchEvents,
    ) => {
      setGameOver(true);
      // For online matches, the local player's color determines win/loss.
      const myColor: Player = meta.mode === "online" && room ? room.role : "p1";
      const result: Outcome =
        winner === "draw" ? "draw" : winner === myColor ? "win" : "loss";
      setOutcome(result);
      setMatchEvents(events ?? { ...emptyEvents(), totalMoves: moveNumber });

      if (!user || !profile) return;

      const delta = result === "win" ? 18 : result === "loss" ? -12 : 2;
      const newRating = Math.max(0, profile.rating + delta);
      const newWins = profile.wins + (result === "win" ? 1 : 0);
      const newLosses = profile.losses + (result === "loss" ? 1 : 0);

      const [{ error: gErr }, { error: pErr }] = await Promise.all([
        supabase.from("games").insert({
          user_id: user.id,
          opponent_type: meta.mode,
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
    [user, profile, moveNumber, refreshProfile, room]
  );

  const handleNewGame = useCallback(() => {
    setGameOver(false);
    setOutcome(null);
    setMatchEvents(emptyEvents());
    setGameKey((k) => k + 1);
    setHintsUsed(0);
    setHintSuggestion(null);
  }, []);

  const handleOpponentJoined = useCallback(() => {
    setOpponentJoined(true);
    setInviteOpen(false);
    toast.success("Opponent joined — table is live");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav onUpgrade={openGenericUpgrade} />

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

          {/* Multiplayer controls */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {!room ? (
              <button
                onClick={handleInvite}
                className="px-5 py-2.5 text-[10px] uppercase tracking-[0.3em] bg-primary text-primary-foreground rounded-sm shadow-luxe hover:opacity-90 transition-opacity"
              >
                Invite a Friend
              </button>
            ) : (
              <>
                <button
                  onClick={() => setInviteOpen(true)}
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.3em] border border-[var(--gold)]/50 text-[var(--gold)] rounded-sm hover:bg-[var(--gold)]/10 transition-colors"
                >
                  Show Invite Link
                </button>
                <button
                  onClick={leaveRoom}
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Leave Room
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-8 items-start">
          <Leaderboard />

          <div className="flex flex-col items-center">
            <ThemeSelector
              current={theme}
              isPremium={isPremium}
              onSelect={handleThemeSelect}
            />
            <div className={themeClass}>
              {room ? (
                <OnlineCheckersBoard
                  key={`${room.id}-${gameKey}`}
                  roomId={room.id}
                  localPlayer={room.role}
                  onGameEnd={handleEnd}
                  onTurnChange={handleTurn}
                  onNewGame={handleNewGame}
                  onOpponentJoined={handleOpponentJoined}
                />
              ) : (
                <CheckersBoard
                  onGameEnd={handleEnd}
                  onTurnChange={handleTurn}
                  onNewGame={handleNewGame}
                  hintToken={hintToken}
                  onHintComputed={handleHintComputed}
                />
              )}
            </div>
          </div>

          <AICoach
            enabled={gameOver}
            moveNumber={moveNumber}
            turn={turn}
            outcome={outcome}
            resetKey={gameKey}
            events={matchEvents}
            isPremium={isPremium}
            hintsUsed={hintsUsed}
            maxHints={MAX_FREE_HINTS}
            canRequestHint={!gameOver && !room && turn === "p1"}
            hintSuggestion={hintSuggestion}
            onRequestHint={room ? undefined : handleRequestHint}
          />
        </div>

        <footer className="mt-20 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>© ChronoCheckers Strategy Academy</span>
          <span>Almaty · Astana · Karaganda</span>
          <span>Crafted with restraint</span>
        </footer>
      </main>

      <InviteModal
        open={inviteOpen}
        url={inviteUrl}
        waiting={!opponentJoined}
        onClose={() => setInviteOpen(false)}
      />
      <UpgradeModal
        open={upgradeOpen}
        reason={upgradeReason}
        onClose={() => setUpgradeOpen(false)}
      />
      <Toaster />
    </div>
  );
}
