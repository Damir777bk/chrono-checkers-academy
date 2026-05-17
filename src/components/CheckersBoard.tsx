import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  emptyEvents,
  getAllMoves,
  getMovesFrom,
  initialBoard,
  pickAIMove,
  pickBestMoveFor,
  type Board,
  type Difficulty,
  type MatchEvents,
  type Move,
  type Player,
  type Pos,
} from "@/lib/checkers";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type Mode = "local" | "ai";

interface Props {
  onGameEnd?: (
    winner: Player | "draw",
    meta: { mode: "local" | "ai"; difficulty?: string },
    events: MatchEvents,
  ) => void;
  onTurnChange?: (player: Player, moveNum: number) => void;
  onNewGame?: () => void;
  /** Increment to request a fresh coach hint for the side currently to move. */
  hintToken?: number;
  /** Fires when a hint is computed (or cleared with null). */
  onHintComputed?: (move: Move | null) => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  novice: "Novice AI",
  cyber: "Cyber-Bot",
  grandmaster: "Grandmaster AI",
};

type TimeControl = "zen" | "blitz" | "rapid";

const TIME_CONTROL_MS: Record<TimeControl, number> = {
  zen: 0,
  blitz: 3 * 60 * 1000,
  rapid: 10 * 60 * 1000,
};
const TIME_CONTROL_LABEL: Record<TimeControl, string> = {
  zen: "Zen Mode",
  blitz: "Blitz · 3 min",
  rapid: "Rapid · 10 min",
};

function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Hot-seat / vs-AI checkers board.
 * - Local 2-Player: P1 and P2 alternate clicking.
 * - Battle AI: P1 (player) vs P2 (AI). Difficulty configurable.
 * Rule enforcement (forced capture, multi-jump, kings) lives in lib/checkers.
 */
export function CheckersBoard({
  onGameEnd,
  onTurnChange,
  onNewGame,
  hintToken,
  onHintComputed,
}: Props) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Player>("p1");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [hint, setHint] = useState<Move | null>(null);

  const [mode, setMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("cyber");
  const [aiThinking, setAiThinking] = useState(false);

  // Time control: Zen (no clock), Blitz (3 min), Rapid (10 min).
  const [timeControl, setTimeControl] = useState<TimeControl>("blitz");
  const timed = timeControl !== "zen";
  const initialClockMs = TIME_CONTROL_MS[timeControl];
  const [timeP1, setTimeP1] = useState<number>(initialClockMs);
  const [timeP2, setTimeP2] = useState<number>(initialClockMs);
  const [timeoutLoss, setTimeoutLoss] = useState<Player | null>(null);

  // Match telemetry for the AI Coach.
  const eventsRef = useRef<MatchEvents>(emptyEvents());
  const prevP1KingsRef = useRef<number>(0);

  const legalForSelected = useMemo<Move[]>(
    () => (selected ? getMovesFrom(board, turn, selected) : []),
    [board, turn, selected]
  );

  // Helper: build a finalised events snapshot at game end.
  const finalizeEvents = useCallback(
    (winnerVal: Player | "draw", finalMoves: number): MatchEvents => {
      const ev = eventsRef.current;
      ev.totalMoves = finalMoves;
      ev.earlyDefeat = winnerVal === "p2" && finalMoves < 15;
      return { ...ev };
    },
    [],
  );

  // End-of-game detection.
  useEffect(() => {
    onTurnChange?.(turn, moveCount);
    if (winner) return;
    if (!getAllMoves(board, turn).length) {
      const w: Player = turn === "p1" ? "p2" : "p1";
      setWinner(w);
      onGameEnd?.(
        w,
        { mode, difficulty: mode === "ai" ? difficulty : undefined },
        finalizeEvents(w, moveCount),
      );
    }
  }, [turn, board, winner, moveCount, onGameEnd, onTurnChange, mode, difficulty, finalizeEvents]);

  // Track P1 king losses: when P1's king count drops between renders.
  useEffect(() => {
    let kings = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.player === "p1" && p.king) kings++;
      }
    if (kings < prevP1KingsRef.current) {
      eventsRef.current.kingLossesP1 += prevP1KingsRef.current - kings;
    }
    prevP1KingsRef.current = kings;
  }, [board]);

  // AI driver: when it's p2's turn in AI mode, think for ~1s then play.
  useEffect(() => {
    if (winner || mode !== "ai" || turn !== "p2") return;
    setAiThinking(true);
    const t = setTimeout(() => {
      const move = pickAIMove(board, difficulty);
      if (move) {
        setBoard((b) => applyMove(b, move));
        setMoveCount((n) => n + 1);
        setTurn("p1");
      }
      setAiThinking(false);
    }, 1000);
    return () => {
      clearTimeout(t);
      setAiThinking(false);
    };
  }, [turn, mode, difficulty, board, winner]);

  const humanCanClick = !winner && !aiThinking && (mode === "local" || turn === "p1");

  const clearHint = useCallback(() => {
    setHint((prev) => {
      if (prev) onHintComputed?.(null);
      return null;
    });
  }, [onHintComputed]);

  const handleSquareClick = useCallback(
    (r: number, c: number) => {
      if (!humanCanClick) return;
      // Any user interaction clears an active hint highlight.
      clearHint();
      const piece = board[r][c];

      if (selected) {
        const move = legalForSelected.find((m) => m.to.r === r && m.to.c === c);
        if (move) {
          setBoard((b) => applyMove(b, move));
          setSelected(null);
          setMoveCount((n) => n + 1);
          setTurn((t) => (t === "p1" ? "p2" : "p1"));
          return;
        }
      }

      if (piece && piece.player === turn) {
        // Detect "missed capture": user grabbed a piece that has no legal move
        // because a mandatory capture exists for a different piece.
        if (turn === "p1") {
          const all = getAllMoves(board, "p1");
          const hasJumps = all.some((m) => m.captures.length > 0);
          const pieceMoves = all.filter((m) => m.from.r === r && m.from.c === c);
          if (hasJumps && pieceMoves.length === 0) {
            eventsRef.current.missedCaptures += 1;
          }
        }
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    },
    [board, humanCanClick, legalForSelected, selected, turn, clearHint]
  );

  // Compute a coach hint whenever the parent bumps hintToken.
  const lastHintTokenRef = useRef<number | undefined>(hintToken);
  useEffect(() => {
    if (hintToken === undefined) return;
    if (hintToken === lastHintTokenRef.current) return;
    lastHintTokenRef.current = hintToken;
    if (winner || aiThinking) return;
    const move = pickBestMoveFor(board, turn);
    setHint(move);
    onHintComputed?.(move);
  }, [hintToken, board, turn, winner, aiThinking, onHintComputed]);

  const reset = useCallback(() => {
    setBoard(initialBoard());
    setTurn("p1");
    setSelected(null);
    setMoveCount(0);
    setWinner(null);
    setAiThinking(false);
    setHint(null);
    onHintComputed?.(null);
    setTimeP1(initialClockMs);
    setTimeP2(initialClockMs);
    setTimeoutLoss(null);
    eventsRef.current = emptyEvents();
    prevP1KingsRef.current = 0;
    onNewGame?.();
  }, [onNewGame, initialClockMs]);

  // Clock timer: tick the active player's clock unless game over / AI thinking / Zen mode.
  useEffect(() => {
    if (!timed || winner || aiThinking) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      if (turn === "p1") {
        setTimeP1((prev: number) => {
          const next = Math.max(0, prev - delta);
          if (timeControl === "blitz" && next < 30000) eventsRef.current.blitzPressureP1 = true;
          return next;
        });
      } else {
        setTimeP2((prev: number) => Math.max(0, prev - delta));
      }
    }, 100);
    return () => clearInterval(id);
  }, [turn, winner, aiThinking, timed, timeControl]);

  // Detect timeout loss (skipped in Zen mode).
  useEffect(() => {
    if (!timed || winner) return;
    if (timeP1 <= 0) {
      setTimeoutLoss("p1");
      setWinner("p2");
      onGameEnd?.(
        "p2",
        { mode, difficulty: mode === "ai" ? difficulty : undefined },
        finalizeEvents("p2", moveCount),
      );
    } else if (timeP2 <= 0) {
      setTimeoutLoss("p2");
      setWinner("p1");
      onGameEnd?.(
        "p1",
        { mode, difficulty: mode === "ai" ? difficulty : undefined },
        finalizeEvents("p1", moveCount),
      );
    }
  }, [timeP1, timeP2, winner, mode, difficulty, onGameEnd, moveCount, finalizeEvents, timed]);

  // Reset the board when the user switches mode, difficulty, or time control mid-game.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, timeControl]);

  const isTarget = (r: number, c: number) =>
    legalForSelected.some((m) => m.to.r === r && m.to.c === c);

  const statusLabel = winner
    ? winner === "draw"
      ? "Draw"
      : winner === "p1"
      ? "Victory · White"
      : "Victory · Charcoal"
    : aiThinking
    ? `${DIFFICULTY_LABEL[difficulty]} is thinking…`
    : turn === "p1"
    ? "White to move"
    : mode === "ai"
    ? `${DIFFICULTY_LABEL[difficulty]} to move`
    : "Charcoal to move";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Mode selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full max-w-[640px]">
        <div
          role="tablist"
          aria-label="Game mode"
          className="inline-flex rounded-sm border border-border bg-card p-0.5 shadow-luxe"
        >
          {(["local", "ai"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-2 text-[10px] uppercase tracking-[0.25em] rounded-[2px] transition-all",
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "local" ? "Local 2-Player" : "Battle AI"}
            </button>
          ))}
        </div>

        {mode === "ai" && (
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className={cn(
                "appearance-none pl-4 pr-9 py-2 text-[10px] uppercase tracking-[0.25em]",
                "bg-card border border-border rounded-sm shadow-luxe",
                "text-foreground cursor-pointer transition-colors",
                "hover:border-[var(--gold)]/60 focus:outline-none focus:border-[var(--gold)]"
              )}
            >
              <option value="novice">Novice AI</option>
              <option value="cyber">Cyber-Bot</option>
              <option value="grandmaster">Grandmaster AI</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold)] text-xs">
              ▾
            </span>
          </div>
        )}

        <div className="relative">
          <select
            value={timeControl}
            onChange={(e) => setTimeControl(e.target.value as TimeControl)}
            aria-label="Time control"
            className={cn(
              "appearance-none pl-4 pr-9 py-2 text-[10px] uppercase tracking-[0.25em]",
              "bg-card border border-border rounded-sm shadow-luxe",
              "text-foreground cursor-pointer transition-colors",
              "hover:border-[var(--gold)]/60 focus:outline-none focus:border-[var(--gold)]"
            )}
          >
            <option value="zen">{TIME_CONTROL_LABEL.zen}</option>
            <option value="blitz">{TIME_CONTROL_LABEL.blitz}</option>
            <option value="rapid">{TIME_CONTROL_LABEL.rapid}</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold)] text-xs">
            ▾
          </span>
        </div>

        <div className="sm:ml-auto">
          <button
            onClick={reset}
            className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-3">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full ring-1 ring-[var(--gold)]/60 transition-colors",
              turn === "p1" ? "bg-[oklch(0.97_0.012_85)]" : "bg-[oklch(0.2_0.012_250)]",
              aiThinking && "animate-pulse"
            )}
          />
          <span className={cn("transition-opacity", aiThinking && "text-[var(--gold)]")}>
            {statusLabel}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
          Move {moveCount}
        </div>
      </div>

      {/* Dual game clock (hidden in Zen mode) */}
      {timed && (
      <div className="flex items-stretch justify-between gap-3 w-full max-w-[640px]">
        {(["p1", "p2"] as const).map((p) => {
          const ms = p === "p1" ? timeP1 : timeP2;
          const isActive = !winner && turn === p && !aiThinking;
          const low = ms <= 30000;
          const label =
            p === "p1" ? "White" : mode === "ai" ? DIFFICULTY_LABEL[difficulty] : "Charcoal";
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
                  {p === "p1" ? "Player 1" : mode === "ai" ? "AI Opponent" : "Player 2"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/80">
                  {label}
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
      )}

      <div className="relative p-5 rounded-sm bg-gradient-to-b from-[oklch(0.22_0.012_250)] to-[oklch(0.14_0.01_250)] shadow-luxe">
        <div className="absolute inset-3 rounded-sm pointer-events-none ring-1 ring-[var(--gold)]/40" />


        <div
          className={cn(
            "grid grid-cols-8 grid-rows-8 w-[min(80vw,560px)] h-[min(80vw,560px)] aspect-square shadow-piece rounded-[2px] overflow-hidden transition-opacity duration-300",
            aiThinking && "opacity-90"
          )}
        >
          {board.map((row, r) =>
            row.map((piece, c) => {
              const dark = (r + c) % 2 === 1;
              const sel = selected?.r === r && selected?.c === c;
              const target = isTarget(r, c);
              const hintFrom = hint && hint.from.r === r && hint.from.c === c;
              const hintTo = hint && hint.to.r === r && hint.to.c === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={cn(
                    "relative flex items-center justify-center transition-colors",
                    dark ? "square-dark" : "square-light"
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

                  {hintTo && (
                    <span
                      className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--gold)] bg-[var(--gold)]/15 animate-hint-pulse pointer-events-none"
                      aria-label="Coach suggested destination"
                    />
                  )}

                  {piece && (
                    <div
                      className={cn(
                        "relative w-[78%] h-[78%] rounded-full animate-piece-place shadow-piece",
                        piece.player === "p1" ? "marble-ivory" : "marble-charcoal",
                        sel && "animate-select-pulse",
                        hintFrom && "ring-4 ring-[var(--gold)] shadow-[0_0_24px_6px_var(--gold)] animate-hint-pulse"
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
        <span>{mode === "ai" ? DIFFICULTY_LABEL[difficulty] : "Hot-Seat"}</span>
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
                {timeoutLoss === "p1" ? "Defeat by Timeout" : "Victory by Timeout"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {timeoutLoss === "p1"
                  ? "Your clock reached 00:00. In Blitz, tempo is everything."
                  : `${mode === "ai" ? DIFFICULTY_LABEL[difficulty] : "Charcoal"}'s clock reached 00:00. Tempo prevails.`}
              </p>
              <div className="flex items-center gap-6 mt-2 font-mono tabular-nums text-sm">
                <span className="text-muted-foreground">
                  White <span className={cn("ml-2", timeoutLoss === "p1" ? "text-destructive" : "text-foreground")}>{formatClock(timeP1)}</span>
                </span>
                <span className="w-px h-4 bg-border" />
                <span className="text-muted-foreground">
                  Charcoal <span className={cn("ml-2", timeoutLoss === "p2" ? "text-destructive" : "text-foreground")}>{formatClock(timeP2)}</span>
                </span>
              </div>
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

