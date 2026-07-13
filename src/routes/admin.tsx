import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLock } from "@/lib/api/queries";
import { useAuthUser } from "@/lib/admin/session";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { user, loading } = useAuthUser();
  const { data: lock, refetch, isLoading: lockLoading } = useAdminLock();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && lock?.admin_user_id === user.id) {
      navigate({ to: "/admin/dashboard" as any });
    }
  }, [user, lock, loading, navigate]);

  const isClaimed = !!lock?.admin_user_id;
  const claimedEmail = lock?.admin_email ?? "";
  const someoneElseSignedIn = isClaimed && user && lock?.admin_user_id !== user.id;

  const doAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClaimed && email.trim().toLowerCase() !== claimedEmail.toLowerCase()) {
      toast.error("This dashboard is currently locked to another admin.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      if (!isClaimed) {
        const { data: claimed, error: claimErr } = await supabase.rpc("claim_admin_lock");
        if (claimErr) throw claimErr;
        if (!claimed) {
          await supabase.auth.signOut();
          toast.error("This dashboard was just claimed by another admin.");
          return;
        }
      } else if (signInData.user?.id !== lock?.admin_user_id) {
        await supabase.auth.signOut();
        toast.error("This dashboard is locked to another admin.");
        return;
      }
      await refetch();
      toast.success("Welcome, admin.");
      navigate({ to: "/admin/dashboard" as any });
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || lockLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-obsidian text-gold text-[10px] uppercase tracking-[0.5em]">Loading…</div>;
  }

  return (
    <main className="grain relative flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="text-[10px] uppercase tracking-[0.5em] text-gold/70 hover:text-gold">
            ← Return to the Souq
          </Link>
        </div>
        <div className="glass-card rounded-sm border border-gold/30 p-10">
          <p className="mb-3 text-center text-[10px] uppercase tracking-[0.5em] text-gold">The Perfume Souq</p>
          <h1 className="text-center font-display text-3xl italic text-gradient-gold">Admin Sign In</h1>
          <div className="mx-auto mt-6 h-px w-20" style={{ background: "var(--gradient-gold)" }} />

          {isClaimed && (
            <p className="mt-6 rounded-sm border border-gold/20 bg-obsidian/60 px-4 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-gold/80">
              Locked to <span className="text-gold">{claimedEmail}</span>
            </p>
          )}
          {!isClaimed && (
            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/50">
              Dashboard is unclaimed. First sign-in becomes the sole admin.
            </p>
          )}

          {someoneElseSignedIn ? (
            <div className="mt-8 space-y-4 text-center">
              <p className="text-sm text-foreground/70">Signed in as a non-admin account.</p>
              <button
                onClick={async () => { await supabase.auth.signOut(); refetch(); }}
                className="btn-gold w-full py-3 text-[10px] uppercase tracking-[0.4em]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={doAuth} className="mt-8 space-y-4">
              <input
                type="email" required placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-gold"
              />
              <input
                type="password" required minLength={8} placeholder="Password (min 8)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-gold"
              />
              <button disabled={busy} className="btn-gold w-full py-3 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40">
                {busy ? "…" : mode === "signup" ? "Create Admin Account" : "Sign In"}
              </button>
              {!isClaimed && (
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="w-full text-center text-[10px] uppercase tracking-[0.4em] text-gold/70 hover:text-gold"
                >
                  {mode === "signup" ? "Already have an account? Sign in" : "First time? Create admin account"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
