import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLock } from "@/lib/api/queries";
import { useAuthUser } from "@/lib/admin/session";

// The public storefront has no customer-account system yet — the only
// accounts that can ever sign in here are the Owner (admin_lock) or a
// granted Admin/Editor/Analyst role. This shows a compact way back into the
// dashboard once signed in, rather than hiding it behind a URL only the
// admin happens to remember. Deliberately shows a short role label, never
// the raw email — a full address in the nav pill was the exact bug this
// replaces.
export function AccountMenu() {
  const { user, loading } = useAuthUser();
  const { data: lock } = useAdminLock();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isOwner = !!user && lock?.admin_user_id === user.id;

  useEffect(() => {
    if (!user || isOwner) return;
    supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRole(data?.role ?? null));
  }, [user, isOwner]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isMember = isOwner || !!role;
  if (loading || !user || !isMember) return null;

  const label = isOwner ? "Owner" : role ? role[0].toUpperCase() + role.slice(1) : "Admin";

  const signOut = async () => {
    if (isOwner) await supabase.rpc("release_admin_lock");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-gold transition hover:bg-gold/10"
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass-card absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-sm border border-gold/30 p-2"
            style={{ boxShadow: "var(--shadow-deep), var(--shadow-gold)" }}
          >
            <p className="truncate px-3 py-2 text-[9px] uppercase tracking-[0.3em] text-foreground/40">
              {user.email}
            </p>
            <Link
              to="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-[10px] uppercase tracking-[0.3em] text-foreground/80 hover:bg-gold/10 hover:text-gold"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Admin Dashboard
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-[10px] uppercase tracking-[0.3em] text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
