import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  getAllMoves,
  getMovesFrom,
  initialBoard,
  type Board,
  type Move,
  type Player,
  type Pos,
} from "@/lib/checkers";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const INITIAL_TIME_MS = 3 * 60 * 1000;

function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  roomId: string;
  /** Local player's color. Host = "p1" (White), Guest = "p2" (Charcoal). */
  localPlayer: Player;
  onGameEnd?: (winner: Player | "draw", meta: { mode: "online" }) => void;
  onTurnChange?: (player: Player, moveNum: number) => void;
  onNewGame?: () => void;
  onOpponentJoined?: () => void;
}

type MovePayload = {
  move: Move;
  moveCount: number;
  // Active player's remaining clock at the moment they completed the move.
  timeP1: number;
  timeP2: number;
};

type TickPayload = { timeP1: number; timeP2: number };

/**
 * Online checkers board synchronised over a Supabase Realtime channel.
 *
 * Wire protocol (per room channel "room:<id>"):
 *  - presence: tracks { player: "p1" | "p2" } per client
 *  - broadcast "move"  : MovePayload  — sent by mover after applyMove
 *  - broadcast "tick"  : TickPayload  — sent by active player ~3x/sec
 *  - broadcast "reset" : {}           — sent by either player to reset
 *
 * Only the player whose turn it is can move; off-turn clicks are no-ops.
 */
export function OnlineCheckersBoard({
  roomId,
  localPlayer,
  onGameEnd,
  onTurnChange,
  onNewGame,
  onOpponentJoined,
}: Props) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Player>("p1");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [timeP1, setTimeP1] = useState(INITIAL_TIME_MS);
  const [timeP2, setTimeP2] = useState(INITIAL_TIME_MS);
  const [timeoutLoss, setTimeoutLoss] = useState<Player | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  // Refs let the tick interval read latest clocks without re-subscribing.
  const timeP1Ref = useRef(timeP1);
  const timeP2Ref = useRef(timeP2);
  timeP1Ref.current = timeP1;
  timeP2Ref.current = timeP2;

  const myTurn = turn === localPlayer && !winner && opponentConnected;

  const legalForSelected = useMemo<Move[]>(
    () => (selected && myTurn ? getMovesFrom(board, turn, selected) : []),
    [board, turn, selected, myTurn]
  );

  // ───────── Realtime subscription ─────────
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: localPlayer } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Opponent present if the other key exists.
        const otherKey = localPlayer === "p1" ? "p2" : "p1";
        const hasOther = Boolean(state[otherKey]);
        setOpponentConnected((prev) => {
          if (hasOther && !prev) onOpponentJoined?.();
          return hasOther;
        });
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const p = payload as MovePayload;
        setBoard((b) => applyMove(b, p.move));
        setMoveCount(p.moveCount);
        setTimeP1(p.timeP1);
        setTimeP2(p.timeP2);
        setTurn((t) => (t === "p1" ? "p2" : "p1"));
        setSelected(null);
      })
      .on("broadcast", { event: "tick" }, ({ payload }) => {
        const p = payload as TickPayload;
        setTimeP1(p.timeP1);
        setTimeP2(p.timeP2);
      })
      .on("broadcast", { event: "reset" }, () => {
        setBoard(initialBoard());
        setTurn("p1");
        setSelected(null);
        setMoveCount(0);
        setWinner(null);
        setTimeoutLoss(null);
        setTimeP1(INITIAL_TIME_MS);
        setTimeP2(INITIAL_TIME_MS);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ player: localPlayer, joinedAt: Date.now() });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, localPlayer, onOpponentJoined]);

  // ───────── End-of-game (no legal moves) ─────────
  useEffect(() => {
    onTurnChange?.(turn, moveCount);
    if (winner || !opponentConnected) return;
    if (!getAllMoves(board, turn).length) {
      const w: Player = turn === "p1" ? "p2" : "p1";
      setWinner(w);
      onGameEnd?.(w, { mode: "online" });
    }
  }, [turn, board, winner, moveCount, opponentConnected, onTurnChange, onGameEnd]);

  // ───────── Local blitz timer (only active player ticks + broadcasts) ─────────
  useEffect(() => {
    if (winner || !opponentConnected) return;
    if (turn !== localPlayer) return; // only mover owns the clock
    let last = Date.now();
    let sinceBroadcast = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      sinceBroadcast += delta;
      if (turn === "p1") {
        setTimeP1((prev) => Math.max(0, prev - delta));
      } else {
        setTimeP2((prev) => Math.max(0, prev - delta));
      }
      if (sinceBroadcast >= 300) {
        sinceBroadcast = 0;
        channelRef.current?.send({
          type: "broadcast",
          event: "tick",
          payload: { timeP1: timeP1Ref.current, timeP2: timeP2Ref.current },
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [turn, localPlayer, winner, opponentConnected]);

  // ───────── Timeout detection ─────────
  useEffect(() => {
    if (winner || !opponentConnected) return;
    if (timeP1 <= 0) {
      setTimeoutLoss("p1");
      setWinner("p2");
      onGameEnd?.("p2", { mode: "online" });
    } else if (timeP2 <= 0) {
      setTimeoutLoss("p2");
      setWinner("p1");
      onGameEnd?.("p1", { mode: "online" });
    }
  }, [timeP1, timeP2, winner, opponentConnected, onGameEnd]);

  const handleSquareClick = useCallback(
    (r: number, c: number) => {
      if (!myTurn) return;
      const piece = board[r][c];

      if (selected) {
        const move = legalForSelected.find((m) => m.to.r === r && m.to.c === c);
        if (move) {
          const newBoard = applyMove(board, move);
          const newCount = moveCount + 1;
          setBoard(newBoard);
          setSelected(null);
          setMoveCount(newCount);
          setTurn((t) => (t === "p1" ? "p2" : "p1"));
          channelRef.current?.send({
            type: "broadcast",
            event: "move",
            payload: {
              move,
              moveCount: newCount,
              timeP1: timeP1Ref.current,
              timeP2: timeP2Ref.current,
            } satisfies MovePayload,
          });
          return;
        }
      }

      if (piece && piece.player === turn) {
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    },
    [board, myTurn, legalForSelected, selected, turn, moveCount]
  );

  const reset = useCallback(() => {
    setBoard(initialBoard());
    setTurn("p1");
    setSelected(null);
    setMoveCount(0);
    setWinner(null);
    setTimeoutLoss(null);
    setTimeP1(INITIAL_TIME_MS);
    setTimeP2(INITIAL_TIME_MS);
    channelRef.current?.send({ type: "broadcast", event: "reset", payload: {} });
    onNewGame?.();
  }, [onNewGame]);

  const isTarget = (r: number, c: number) =>
    legalForSelected.some((m) => m.to.r === r && m.to.c === c);

  const youLabel = localPlayer === "p1" ? "White" : "Charcoal";
  const oppLabel = localPlayer === "p1" ? "Charcoal" : "White";

  const statusLabel = !opponentConnected
    ? "Awaiting opponent…"
    : winner
    ? winner === "draw"
      ? "Draw"
      : (winner === localPlayer ? `Victory · ${youLabel}` : `Defeat · ${oppLabel}`)
    : myTurn
    ? "Your move"
    : "Opponent's move";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-sm border border-[var(--gold)]/40 bg-card">
          <span className={cn("w-2 h-2 rounded-full", opponentConnected ? "bg-[var(--emerald-deep)] animate-pulse" : "bg-muted-foreground/40")} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/80">
            Multiplayer · You are {youLabel}
          </span>
        </div>
        <button
          onClick={reset}
          className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-3">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full ring-1 ring-[var(--gold)]/60",
              turn === "p1" ? "bg-[oklch(0.97_0.012_85)]" : "bg-[oklch(0.2_0.012_250)]",
              myTurn && "animate-pulse"
            )}
          />
          <span className={cn(myTurn && "text-[var(--gold)]")}>{statusLabel}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
          Move {moveCount}
        </div>
      </div>

      {/* Blitz dual timer */}
      <div className="flex items-stretch justify-between gap-3 w-full max-w-[640px]">
        {(["p1", "p2"] as const).map((p) => {
          const ms = p === "p1" ? timeP1 : timeP2;
          const isActive = !winner && turn === p && opponentConnected;
          const low = ms <= 30000;
          const isYou = p === localPlayer;
          return (
            <div
              key={p}
              className={cn(
                "flex-1 flex items-center justify-between px-5 py-3 rounded-sm border bg-card transition-all",
                isActive
                  ? "border-[var(--gold)]/70 shadow-luxe"
                  : "border-border/60 opacity-60"
              )}
            >
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                  {isYou ? "You" : "Opponent"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/80">
                  {p === "p1" ? "White" : "Charcoal"}
                </span>
              </div>
              <span
                className={cn(
                  "font-mono tabular-nums text-3xl tracking-[0.15em] transition-colors",
                  low ? "text-destructive" : isActive ? "text-[var(--gold)]" : "text-foreground/70",
                  isActive && "animate-pulse"
                )}
              >
                {formatClock(ms)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Board (visually flip for guest so their pieces are on the bottom) */}
      <div className="relative p-5 rounded-sm bg-gradient-to-b from-[oklch(0.22_0.012_250)] to-[oklch(0.14_0.01_250)] shadow-luxe">
        <div className="absolute inset-3 rounded-sm pointer-events-none ring-1 ring-[var(--gold)]/40" />
        <div
          className={cn(
            "grid grid-cols-8 grid-rows-8 w-[min(80vw,560px)] h-[min(80vw,560px)] aspect-square shadow-piece rounded-[2px] overflow-hidden transition-opacity duration-300",
            !myTurn && !winner && "opacity-95",
            localPlayer === "p2" && "rotate-180"
          )}
        >
          {board.map((row, r) =>
            row.map((piece, c) => {
              const dark = (r + c) % 2 === 1;
              const sel = selected?.r === r && selected?.c === c;
              const target = isTarget(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  disabled={!myTurn}
                  className={cn(
                    "relative flex items-center justify-center transition-colors",
                    dark ? "square-dark" : "square-light",
                    !myTurn && "cursor-not-allowed",
                    localPlayer === "p2" && "rotate-180"
                  )}
                >
                  {c === 0 && (
                    <span
                      className={cn(
                        "absolute top-1 left-1 text-[9px] font-medium tracking-wider",
                        dark ? "text-[var(--gold-soft)]/70" : "text-[var(--charcoal)]/40"
                      )}
                    >
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 text-[9px] font-medium tracking-wider",
                        dark ? "text-[var(--gold-soft)]/70" : "text-[var(--charcoal)]/40"
                      )}
                    >
                      {FILES[c]}
                    </span>
                  )}

                  {target && !piece && (
                    <span className="absolute w-3 h-3 rounded-full bg-[var(--gold)] animate-hint-pulse" />
                  )}
                  {target && piece && (
                    <span className="absolute inset-2 rounded-full ring-2 ring-[var(--gold)] animate-hint-pulse pointer-events-none" />
                  )}

                  {piece && (
                    <div
                      className={cn(
                        "relative w-[78%] h-[78%] rounded-full animate-piece-place shadow-piece",
                        piece.player === "p1" ? "marble-ivory" : "marble-charcoal",
                        sel && "animate-select-pulse"
                      )}
                    >
                      <span className="absolute inset-0 rounded-full ring-[1.5px] ring-[var(--gold)]/80" />
                      <span className="absolute inset-[10%] rounded-full ring-[1px] ring-[var(--gold)]/40" />
                      {piece.king && (
                        <span className="absolute inset-0 flex items-center justify-center animate-king-glow">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-1/2 h-1/2 text-[var(--gold)]"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8zm2.6 13h12.8v1.2H5.6V21z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>Room · {roomId.slice(0, 8)}</span>
        <span className="w-px h-3 bg-border" />
        <span>Forced Capture · Multi-Jump</span>
      </div>

      {/* Timeout modal */}
      {timeoutLoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-[90%] rounded-sm border border-[var(--gold)]/50 bg-card p-8 shadow-luxe animate-scale-in">
            <div className="absolute inset-2 rounded-sm pointer-events-none ring-1 ring-[var(--gold)]/30" />
            <div className="flex flex-col items-center text-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
                Blitz · Time Expired
              </span>
              <h2 className="font-serif text-3xl tracking-tight text-foreground">
                {timeoutLoss === localPlayer ? "Defeat by Timeout" : "Victory by Timeout"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                In Blitz, tempo is everything.
              </p>
              <button
                onClick={reset}
                className="mt-4 px-6 py-2.5 text-[10px] uppercase tracking-[0.3em] bg-primary text-primary-foreground rounded-sm shadow-luxe hover:opacity-90 transition-opacity"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
