import { useCallback, useEffect, useMemo, useState } from "react";
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

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface Props {
  onGameEnd?: (winner: Player | "draw") => void;
  onTurnChange?: (player: Player, moveNum: number) => void;
}

/**
 * Hot-seat checkers board: P1 (White / Ivory) and P2 (Charcoal) take
 * alternating turns on the same screen. Implements:
 *   - Diagonal forward moves for men; any-distance diagonals for kings
 *   - Mandatory captures with multi-jump chains
 *   - King promotion when reaching the far rank (with glowing crown)
 *   - Pulsing ring on the selected piece and glowing dots on legal targets
 *
 * All rule enforcement lives in src/lib/checkers.ts (getAllMoves filters
 * to capture moves when any exist; multi-jumps are returned as a single
 * Move with the full capture list, so a click on a far landing square
 * resolves the whole chain at once).
 */
export function CheckersBoard({ onGameEnd, onTurnChange }: Props) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Player>("p1");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);

  // Legal moves for the currently selected piece (already capture-filtered).
  const legalForSelected = useMemo<Move[]>(
    () => (selected ? getMovesFrom(board, turn, selected) : []),
    [board, turn, selected]
  );

  // Detect end-of-game: the player to move has no legal options.
  useEffect(() => {
    onTurnChange?.(turn, moveCount);
    if (winner) return;
    const moves = getAllMoves(board, turn);
    if (!moves.length) {
      const w: Player = turn === "p1" ? "p2" : "p1";
      setWinner(w);
      onGameEnd?.(w);
    }
  }, [turn, board, winner, moveCount, onGameEnd, onTurnChange]);

  const handleSquareClick = useCallback(
    (r: number, c: number) => {
      if (winner) return;
      const piece = board[r][c];

      // If a piece is already selected, try to play a move to (r, c).
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

      // Otherwise select one of the current player's own pieces.
      if (piece && piece.player === turn) {
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    },
    [board, legalForSelected, selected, turn, winner]
  );

  const reset = () => {
    setBoard(initialBoard());
    setTurn("p1");
    setSelected(null);
    setMoveCount(0);
    setWinner(null);
  };

  const isTarget = (r: number, c: number) =>
    legalForSelected.some((m) => m.to.r === r && m.to.c === c);

  const statusLabel = winner
    ? winner === "draw"
      ? "Draw"
      : winner === "p1"
      ? "Victory · White"
      : "Victory · Charcoal"
    : turn === "p1"
    ? "White to move"
    : "Charcoal to move";

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-3">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full ring-1 ring-[var(--gold)]/60",
              turn === "p1" ? "bg-[oklch(0.97_0.012_85)]" : "bg-[oklch(0.2_0.012_250)]"
            )}
          />
          {statusLabel}
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
        >
          New Game
        </button>
      </div>

      <div className="relative p-5 rounded-sm bg-gradient-to-b from-[oklch(0.22_0.012_250)] to-[oklch(0.14_0.01_250)] shadow-luxe">
        <div className="absolute inset-3 rounded-sm pointer-events-none ring-1 ring-[var(--gold)]/40" />

        <div className="grid grid-cols-8 grid-rows-8 w-[min(80vw,560px)] h-[min(80vw,560px)] aspect-square shadow-piece rounded-[2px] overflow-hidden">
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

                  {/* Legal-move hint: glowing gold dot on reachable squares */}
                  {target && !piece && (
                    <span className="absolute w-3 h-3 rounded-full bg-[var(--gold)] animate-hint-pulse" />
                  )}
                  {/* Capture-landing hint with a ring when the destination
                      happens to also be the start of a chain (rare visual cue) */}
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
                          {/* Crown glyph for kings (Дамки) */}
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
        <span>Move {moveCount}</span>
        <span className="w-px h-3 bg-border" />
        <span>Hot-Seat · Forced Capture · Multi-Jump</span>
      </div>
    </div>
  );
}
