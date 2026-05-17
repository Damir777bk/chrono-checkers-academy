import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES, type ThemeId } from "@/lib/themes";

interface Props {
  current: ThemeId;
  isPremium: boolean;
  onSelect: (id: ThemeId) => void;
}

export function ThemeSelector({ current, isPremium, onSelect }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground mr-2">
        Board Theme
      </span>
      {THEMES.map((t) => {
        const locked = t.premium && !isPremium;
        const active = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            title={`${t.name}${locked ? " · Premium" : ""}`}
            className={cn(
              "group relative flex items-center gap-2 px-3 py-2 rounded-sm border transition-all",
              active
                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                : "border-border hover:border-[var(--gold)]/60",
            )}
          >
            <span className="relative w-8 h-8 rounded-sm overflow-hidden ring-1 ring-border">
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${t.swatch[0]} 0 50%, ${t.swatch[1]} 50% 100%)`,
                }}
              />
              {locked && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-[var(--gold)]" />
                </span>
              )}
              {active && !locked && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--gold)] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[var(--charcoal)]" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/90">
                {t.name}
              </span>
              <span className="text-[9px] text-muted-foreground">{t.tagline}</span>
            </span>
            {t.premium && (
              <span className="text-[8px] uppercase tracking-[0.25em] text-[var(--gold)] font-semibold ml-1">
                Pro
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
