import { Sparkles, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

interface Props {
  onUpgrade: () => void;
}

export function TopNav({ onUpgrade }: Props) {
  const { profile, user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-gradient-emerald flex items-center justify-center ring-1 ring-[var(--gold)]/50">
            <span className="font-display text-[var(--gold)] text-lg leading-none">C</span>
          </div>
          <div>
            <div className="font-display text-base leading-tight">ChronoCheckers</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground leading-tight">
              Strategy Academy
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <a className="hover:text-foreground transition-colors" href="#">Play</a>
          <a className="hover:text-foreground transition-colors" href="#">Lessons</a>
          <a className="hover:text-foreground transition-colors" href="#">Tournaments</a>
        </nav>

        <div className="flex items-center gap-4">
          {user && profile ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium leading-tight">{profile.username}</div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground leading-tight">
                  {profile.city} · {profile.rating}
                </div>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[var(--gold)]/50 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={onUpgrade}
            className="group relative flex items-center gap-2 px-5 py-2 rounded-sm bg-gradient-gold text-[var(--charcoal)] text-[11px] uppercase tracking-[0.2em] font-semibold shadow-luxe hover:shadow-piece transition-all overflow-hidden"
          >
            <span className="absolute inset-0 gold-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Academy Pro · $9/mo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
