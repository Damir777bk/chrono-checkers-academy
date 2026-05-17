import { Sparkles } from "lucide-react";

interface Props {
  onUpgrade: () => void;
}

export function TopNav({ onUpgrade }: Props) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-gradient-emerald flex items-center justify-center ring-1 ring-[var(--gold)]/50">
            <span className="font-display text-[var(--gold)] text-lg leading-none">C</span>
          </div>
          <div>
            <div className="font-display text-base leading-tight">ChronoCheckers</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground leading-tight">
              Strategy Academy
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <a className="hover:text-foreground transition-colors" href="#">Play</a>
          <a className="hover:text-foreground transition-colors" href="#">Lessons</a>
          <a className="hover:text-foreground transition-colors" href="#">Tournaments</a>
          <a className="hover:text-foreground transition-colors" href="#">Library</a>
        </nav>

        <button
          onClick={onUpgrade}
          className="group relative flex items-center gap-2 px-5 py-2 rounded-sm bg-gradient-gold text-[var(--charcoal)] text-[11px] uppercase tracking-[0.2em] font-semibold shadow-luxe hover:shadow-piece transition-all overflow-hidden"
        >
          <span className="absolute inset-0 gold-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">Academy Pro · $9/mo</span>
        </button>
      </div>
    </header>
  );
}
