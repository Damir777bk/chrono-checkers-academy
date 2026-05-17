import { useEffect, useMemo, useState } from "react";
import {
  applyMove,
  bestAIMove,
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

export function CheckersBoard({ onGameEnd, onTurnChange }: Props) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Player>("p1");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);

  const legalForSelected = useMemo<Move[]>(
    () => (selected ? getMovesFrom(board, turn, selected) : []),
    [board, turn, selected]
  );

  useEffect(() => {
    onTurnChange?.(turn, moveCount);
    const moves = getAllMoves(board, turn);
    if (!moves.length && !winner) {
      const w: Player = turn === "p1" ? "p2" : "p1";
      setWinner(w);
      onGameEnd?.(w);
      return;
    }
    if (turn === "p2" && !winner) {
      const t = setTimeout(() => {
        const ai = bestAIMove(board, 3);
        if (ai) {
          setBoard((b) => applyMove(b, ai));
          setMoveCount((n) => n + 1);
          setTurn("p1");
        }
      }, 550);
      return () => clearTimeout(t);
    }
  }, [turn, board, winner, moveCount, onGameEnd, onTurnChange]);

  const handleSquareClick = (r: number, c: number) => {
    if (winner || turn !== "p1") return;
    const piece = board[r][c];
    if (selected) {
      const move = legalForSelected.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        setBoard((b) => applyMove(b, move));
        setSelected(null);
        setMoveCount((n) => n + 1);
        setTurn("p2");
        return;
      }
    }
    if (piece && piece.player === "p1") {
      setSelected({ r, c });
    } else {
      setSelected(null);
    }
  };

  const reset = () => {
    setBoard(initialBoard());
    setTurn("p1");
    setSelected(null);
    setMoveCount(0);
    setWinner(null);
  };

  const isTarget = (r: number, c: number) => legalForSelected.some((m) => m.to.r === r && m.to.c === c);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {winner
            ? winner === "draw"
              ? "Draw"
              : winner === "p1"
              ? "Victory · White"
              : "Victory · Charcoal"
            : turn === "p1"
            ? "White to move"
            : "Charcoal thinking…"}
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
        >
          New Game
        </button>
      </div>

      <div className="relative p-5 rounded-sm bg-gradient-to-b from-[oklch(0.22_0.012_250)] to-[oklch(0.14_0.01_250)] shadow-luxe">
        {/* Inner gold hairline frame */}
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
                    dark ? "square-dark" : "square-light",
                    sel && "ring-2 ring-inset ring-[var(--gold)]",
                  )}
                >
                  {/* Coordinates */}
                  {c === 0 && (
                    <span className={cn(
                      "absolute top-1 left-1 text-[9px] font-medium tracking-wider",
                      dark ? "text-[var(--gold-soft)]/70" : "text-[var(--charcoal)]/40"
                    )}>{8 - r}</span>
                  )}
                  {r === 7 && (
                    <span className={cn(
                      "absolute bottom-0.5 right-1 text-[9px] font-medium tracking-wider",
                      dark ? "text-[var(--gold-soft)]/70" : "text-[var(--charcoal)]/40"
                    )}>{FILES[c]}</span>
                  )}

                  {target && (
                    <span className="absolute w-3 h-3 rounded-full bg-[var(--gold)]/70 animate-piece-place" />
                  )}

                  {piece && (
                    <div
                      className={cn(
                        "relative w-[78%] h-[78%] rounded-full animate-piece-place",
                        piece.player === "p1" ? "marble-ivory" : "marble-charcoal",
                        "shadow-piece"
                      )}
                    >
                      {/* Gold rim */}
                      <span className="absolute inset-0 rounded-full ring-[1.5px] ring-[var(--gold)]/80" />
                      <span className="absolute inset-[10%] rounded-full ring-[1px] ring-[var(--gold)]/40" />
                      {piece.king && (
                        <span className="absolute inset-0 flex items-center justify-center font-display text-[1.4em] text-[var(--gold)]">
                          ★
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
        <span>Standard Rules · Forced Capture</span>
      </div>
    </div>
  );
}
