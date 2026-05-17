import { useEffect } from "react";
import { X, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const benefits = [
  { title: "Unlimited AI Coach Insights", desc: "Real-time tactical analysis on every move, not just end-of-game." },
  { title: "Advanced Strategy Curriculum", desc: "47 master classes from Grandmasters across Eurasia." },
  { title: "Custom Marble Themes", desc: "Onyx, Carrara, Verde Alpi — hand-crafted board aesthetics." },
  { title: "Opening Repertoire Builder", desc: "Train and memorize personalized opening trees." },
  { title: "Tournament Eligibility", desc: "Compete in seasonal ranked tournaments with Elo certification." },
];

export function UpgradeModal({ open, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-piece-place"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--charcoal)]/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-card border border-border rounded-sm shadow-luxe animate-modal-rise"
      >
        {/* Gold corner accents */}
        <span className="absolute top-0 left-0 w-8 h-px bg-[var(--gold)]" />
        <span className="absolute top-0 left-0 w-px h-8 bg-[var(--gold)]" />
        <span className="absolute top-0 right-0 w-8 h-px bg-[var(--gold)]" />
        <span className="absolute top-0 right-0 w-px h-8 bg-[var(--gold)]" />
        <span className="absolute bottom-0 left-0 w-8 h-px bg-[var(--gold)]" />
        <span className="absolute bottom-0 left-0 w-px h-8 bg-[var(--gold)]" />
        <span className="absolute bottom-0 right-0 w-8 h-px bg-[var(--gold)]" />
        <span className="absolute bottom-0 right-0 w-px h-8 bg-[var(--gold)]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-10">
          <div className="text-center mb-8">
            <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">Academy Pro</div>
            <h2 className="font-display text-4xl mt-3 leading-tight">
              Master the game.
              <br />
              <span className="italic text-[var(--emerald-deep)]">Quietly.</span>
            </h2>
            <div className="hairline mx-auto w-32 my-6" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              An invitation-quality membership for serious students of checkers strategy.
            </p>
          </div>

          <ul className="space-y-4 mb-8">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Check className="w-3 h-3 text-[var(--charcoal)]" strokeWidth={3} />
                </span>
                <div>
                  <div className="text-sm font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{b.desc}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border pt-6 flex items-end justify-between gap-6">
            <div>
              <div className="font-display text-3xl tabular-nums">
                $9<span className="text-base text-muted-foreground font-sans">/month</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                Cancel anytime · 14-day trial
              </div>
            </div>
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs uppercase tracking-[0.25em] font-medium border border-[var(--gold)] hover:bg-[var(--emerald-forest)] transition-colors">
              Begin Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
