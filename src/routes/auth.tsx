import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Sign In · ChronoCheckers Academy" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
});

const CITIES = ["Almaty", "Astana", "Karaganda"] as const;

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState<(typeof CITIES)[number]>("Almaty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    // already signed in
    setTimeout(() => navigate({ to: "/" }), 0);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username: username || email.split("@")[0], city },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">ChronoCheckers</div>
          <h1 className="font-display text-4xl mt-2">Strategy Academy</h1>
          <div className="hairline mx-auto w-32 mt-4" />
        </Link>

        <div className="bg-card border border-border rounded-sm shadow-luxe p-8">
          <Tabs
            value={mode}
            onValueChange={(v) => { setMode(v as "signin" | "signup"); setError(null); }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/40 border border-border rounded-sm p-1 mb-6">
              <TabsTrigger
                value="signin"
                className="rounded-sm text-[10px] uppercase tracking-[0.3em] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--gold)]/40 transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-sm text-[10px] uppercase tracking-[0.3em] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[var(--gold)]/40 transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-4 animate-in fade-in duration-200">
              <TabsContent value="signin" className="space-y-4 mt-0">
                <Field label="Email">
                  <input
                    type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password" required minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <Field label="Display Name">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Aizhan M."
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password" required minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Select City">
                  <div className="relative">
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value as (typeof CITIES)[number])}
                      className={cn(inputCls, "appearance-none pr-9 cursor-pointer")}
                    >
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold)] text-xs">▾</span>
                  </div>
                </Field>
              </TabsContent>

              {error && (
                <div className="text-xs text-destructive border-l-2 border-destructive pl-3 py-1">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 rounded-sm text-[11px] uppercase tracking-[0.25em] font-medium bg-primary text-primary-foreground border border-[var(--gold)]/40 hover:bg-[var(--emerald-forest)] hover:border-[var(--gold)] transition-all disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>
          </Tabs>

          <Link to="/" className="block text-center mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
            ← Back to board
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--gold)] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
