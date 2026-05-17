import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyMove,
  getAllMoves,
  getMovesFrom,
  initialBoard,
  pickAIMove,
  type Board,
  type Difficulty,
  type Move,
  type Player,
  type Pos,
} from "@/lib/checkers";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type Mode = "local" | "ai";

interface Props {
  onGameEnd?: (winner: Player | "draw", meta: { mode: "local" | "ai"; difficulty?: string }) => void;
  onTurnChange?: (player: Player, moveNum: number) => void;
  onNewGame?: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  novice: "Novice AI",
  cyber: "Cyber-Bot",
  grandmaster: "Grandmaster AI",
};

/**
 * Hot-seat / vs-AI checkers board.
 * - Local 2-Player: P1 and P2 alternate clicking.
 * - Battle AI: P1 (player) vs P2 (AI). Difficulty configurable.
 * Rule enforcement (forced capture, multi-jump, kings) lives in lib/checkers.
 */
export function CheckersBoard({ onGameEnd, onTurnChange, onNewGame }: Props) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Player>("p1");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);

  const [mode, setMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("cyber");
  const [aiThinking, setAiThinking] = useState(false);

  const legalForSelected = useMemo<Move[]>(
    () => (selected ? getMovesFrom(board, turn, selected) : []),
    [board, turn, selected]
  );

  // End-of-game detection.
  useEffect(() => {
    onTurnChange?.(turn, moveCount);
    if (winner) return;
    if (!getAllMoves(board, turn).length) {
      const w: Player = turn === "p1" ? "p2" : "p1";
      setWinner(w);
      onGameEnd?.(w, { mode, difficulty: mode === "ai" ? difficulty : undefined });
    }
  }, [turn, board, winner, moveCount, onGameEnd, onTurnChange, mode, difficulty]);

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

  const handleSquareClick = useCallback(
    (r: number, c: number) => {
      if (!humanCanClick) return;
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
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    },
    [board, humanCanClick, legalForSelected, selected, turn]
  );

  const reset = useCallback(() => {
    setBoard(initialBoard());
    setTurn("p1");
    setSelected(null);
    setMoveCount(0);
    setWinner(null);
    setAiThinking(false);
    onNewGame?.();
  }, [onNewGame]);

  // Reset the board when the user switches mode or difficulty mid-game.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty]);

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
        <span>{mode === "ai" ? DIFFICULTY_LABEL[difficulty] : "Hot-Seat"}</span>
        <span className="w-px h-3 bg-border" />
        <span>Forced Capture · Multi-Jump</span>
      </div>
    </div>
  );
}
