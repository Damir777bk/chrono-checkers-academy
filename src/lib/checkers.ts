export type Player = "p1" | "p2";

/** Telemetry the AI Coach uses to produce context-aware feedback. */
export type MatchEvents = {
  missedCaptures: number;
  kingLossesP1: number;
  blitzPressureP1: boolean;
  earlyDefeat: boolean;
  totalMoves: number;
};

export const emptyEvents = (): MatchEvents => ({
  missedCaptures: 0,
  kingLossesP1: 0,
  blitzPressureP1: false,
  earlyDefeat: false,
  totalMoves: 0,
});
export type Piece = { player: Player; king: boolean };
export type Board = (Piece | null)[][]; // 8x8, row 0 top

export type Pos = { r: number; c: number };
export type Move = {
  from: Pos;
  to: Pos;
  captures: Pos[];
};

export const initialBoard = (): Board => {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: "p2", king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: "p1", king: false };
    }
  }
  return b;
};

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const directions = (piece: Piece): [number, number][] => {
  if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return piece.player === "p1" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
};

const cloneBoard = (b: Board): Board => b.map((row) => row.map((p) => (p ? { ...p } : null)));

function getJumpsFrom(board: Board, r: number, c: number, piece: Piece): Move[] {
  const results: Move[] = [];
  const recurse = (b: Board, cr: number, cc: number, p: Piece, path: Pos[], caps: Pos[]) => {
    let extended = false;
    for (const [dr, dc] of directions(p)) {
      const mr = cr + dr, mc = cc + dc;
      const lr = cr + 2 * dr, lc = cc + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const mid = b[mr]?.[mc];
      if (!mid || mid.player === p.player) continue;
      if (b[lr][lc]) continue;
      if (caps.some((x) => x.r === mr && x.c === mc)) continue;
      extended = true;
      const nb = cloneBoard(b);
      nb[mr][mc] = null;
      nb[cr][cc] = null;
      const becameKing = !p.king && ((p.player === "p1" && lr === 0) || (p.player === "p2" && lr === 7));
      const np: Piece = { player: p.player, king: p.king || becameKing };
      nb[lr][lc] = np;
      const newPath = [...path, { r: lr, c: lc }];
      const newCaps = [...caps, { r: mr, c: mc }];
      // King-promotion ends jump chain (standard rule)
      if (becameKing) {
        results.push({ from: path[0], to: { r: lr, c: lc }, captures: newCaps });
      } else {
        const before = results.length;
        recurse(nb, lr, lc, np, newPath, newCaps);
        if (results.length === before) {
          results.push({ from: path[0], to: { r: lr, c: lc }, captures: newCaps });
        }
      }
    }
    if (!extended && caps.length > 0) {
      // already pushed by parent
    }
  };
  recurse(board, r, c, piece, [{ r, c }], []);
  return results;
}

export function getAllMoves(board: Board, player: Player): Move[] {
  const jumps: Move[] = [];
  const simple: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.player !== player) continue;
      const js = getJumpsFrom(board, r, c, p);
      if (js.length) jumps.push(...js);
      else {
        for (const [dr, dc] of directions(p)) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && !board[nr][nc]) {
            simple.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [] });
          }
        }
      }
    }
  }
  return jumps.length ? jumps : simple;
}

export function getMovesFrom(board: Board, player: Player, from: Pos): Move[] {
  const all = getAllMoves(board, player);
  return all.filter((m) => m.from.r === from.r && m.from.c === from.c);
}

export function applyMove(board: Board, move: Move): Board {
  const b = cloneBoard(board);
  const piece = b[move.from.r][move.from.c];
  if (!piece) return b;
  b[move.from.r][move.from.c] = null;
  for (const cap of move.captures) b[cap.r][cap.c] = null;
  const becameKing =
    !piece.king && ((piece.player === "p1" && move.to.r === 0) || (piece.player === "p2" && move.to.r === 7));
  b[move.to.r][move.to.c] = { player: piece.player, king: piece.king || becameKing };
  return b;
}

export function evaluate(board: Board): number {
  let s = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = (p.king ? 2.5 : 1) + (p.player === "p2" ? r * 0.03 : (7 - r) * 0.03);
      s += p.player === "p2" ? v : -v;
    }
  return s;
}

export type Difficulty = "novice" | "cyber" | "grandmaster";

/** Pick a move for the AI (always plays p2). Mandatory captures are already
 *  enforced by getAllMoves (returns only jumps when any are available). */
export function pickAIMove(board: Board, difficulty: Difficulty): Move | null {
  const moves = getAllMoves(board, "p2");
  if (!moves.length) return null;

  if (difficulty === "novice") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === "cyber") {
    // Greedy heuristic: maximise captures gained and minimise pieces left
    // exposed to the opponent's reply. Small random tiebreaker.
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const after = applyMove(board, m);
      const gain = m.captures.length * 10;
      const replies = getAllMoves(after, "p1");
      const exposure = replies.reduce((s, r) => s + r.captures.length, 0);
      const promo = !board[m.from.r][m.from.c]?.king && m.to.r === 7 ? 4 : 0;
      const score = gain + promo - exposure * 3 + Math.random() * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  // Grandmaster: minimax with alpha-beta pruning.
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const score = minimax(applyMove(board, m), 3, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluate(board);
  const player: Player = maximizing ? "p2" : "p1";
  const moves = getAllMoves(board, player);
  if (!moves.length) return maximizing ? -1000 : 1000;
  if (maximizing) {
    let v = -Infinity;
    for (const m of moves) {
      v = Math.max(v, minimax(applyMove(board, m), depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, v);
      if (beta <= alpha) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (const m of moves) {
      v = Math.min(v, minimax(applyMove(board, m), depth - 1, alpha, beta, true));
      beta = Math.min(beta, v);
      if (beta <= alpha) break;
    }
    return v;
  }
}
