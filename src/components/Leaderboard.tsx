const players = [
  { rank: 1, name: "Aizhan Mukhamedi", city: "Almaty", elo: 2487, trend: "+12" },
  { rank: 2, name: "Daniyar Suleimenov", city: "Astana", elo: 2451, trend: "+8" },
  { rank: 3, name: "Yerlan Bekzhan", city: "Karaganda", elo: 2402, trend: "—" },
  { rank: 4, name: "Madina Orazbek", city: "Almaty", elo: 2378, trend: "+4" },
  { rank: 5, name: "Timur Karimov", city: "Astana", elo: 2341, trend: "-3" },
  { rank: 6, name: "Saule Nurlanovna", city: "Karaganda", elo: 2305, trend: "+15" },
  { rank: 7, name: "Arman Tasbolat", city: "Almaty", elo: 2289, trend: "+2" },
  { rank: 8, name: "Dinara Aitkozha", city: "Astana", elo: 2254, trend: "-1" },
];

export function Leaderboard() {
  return (
    <aside className="bg-card border border-border rounded-sm shadow-luxe overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Kazakhstan</div>
        <h2 className="font-display text-2xl mt-1">National Leaderboard</h2>
        <p className="text-xs text-muted-foreground mt-1">Top strategic minds · Season XII</p>
      </div>
      <div className="hairline mx-5" />
      <ol className="divide-y divide-border">
        {players.map((p) => (
          <li
            key={p.rank}
            className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/60 transition-colors group"
          >
            <span className="font-display text-lg w-6 text-[var(--gold)] tabular-nums">{p.rank}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.city}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">{p.elo}</div>
              <div
                className={
                  "text-[10px] tabular-nums " +
                  (p.trend.startsWith("+")
                    ? "text-[var(--emerald-deep)]"
                    : p.trend.startsWith("-")
                    ? "text-destructive"
                    : "text-muted-foreground")
                }
              >
                {p.trend}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
