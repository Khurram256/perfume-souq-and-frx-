import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminLock,
  usePerfumes,
  useOffers,
  useReviews,
  useSpotlight,
  useSettings,
  useSiteContent,
  useCategories,
  useAnalyticsEvents,
  useOrderIntents,
  useBackInStockRequests,
  useUpdateBackInStockStatus,
  useBrands,
  useAllVariants,
  usePromotions,
  useBundles,
} from "@/lib/api/queries";
import { useAuthUser } from "@/lib/admin/session";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PerfumeEditor } from "@/components/admin/PerfumeEditor";
import type { Perfume } from "@/lib/api/queries";
import { THEMES, applyTheme, DEFAULT_THEME } from "@/components/ThemeEngine";
import { listAdminRoles, addAdminRole, removeAdminRole } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin_/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — The Perfume Souq" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

// "requests" (back-in-stock) is intentionally not in the primary nav array
// below — it's still a fully working panel, reachable via a small link in
// the header, per the spec's "remove from navigation... unless data is
// required internally" instruction (data/functionality is kept, just not a
// top-level tab). Promotions and Bundles are folded into the Offers tab
// (OffersHub) as internal segments rather than separate tabs.
type Tab = "perfumes" | "offers" | "hero" | "spotlight" | "reviews" | "content" | "theme" | "settings" | "analytics" | "requests" | "administrators";
type AdminRole = "owner" | "admin" | "editor" | "analyst" | null;

function useMyAdminRole(userId: string | undefined, isOwner: boolean) {
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (isOwner) {
      setRole("owner");
      setLoading(false);
      return;
    }
    supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as AdminRole) ?? null);
        setLoading(false);
      });
  }, [userId, isOwner]);
  return { role, loading };
}

function Dashboard() {
  const { user, loading } = useAuthUser();
  const { data: lock, isLoading: lockLoading, refetch: refetchLock } = useAdminLock();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("perfumes");

  const isOwner = !!user && lock?.admin_user_id === user.id;
  const { role, loading: roleLoading } = useMyAdminRole(user?.id, isOwner);
  const isMember = isOwner || !!role;
  const canWrite = isOwner || role === "admin" || role === "editor";

  useEffect(() => {
    if (loading || lockLoading || roleLoading) return;
    if (!user || !isMember) {
      navigate({ to: "/admin" as any });
    }
  }, [user, isMember, loading, lockLoading, roleLoading, navigate]);

  const signOut = async () => {
    if (isOwner) await supabase.rpc("release_admin_lock");
    await supabase.auth.signOut();
    await refetchLock();
    toast.success("Signed out.");
    navigate({ to: "/admin" as any });
  };

  if (loading || lockLoading || roleLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-gold text-[10px] uppercase tracking-[0.5em]">
        Loading…
      </div>
    );
  }

  const tabs: Tab[] = [
    "perfumes",
    "offers",
    "hero",
    "spotlight",
    "reviews",
    "content",
    "theme",
    "settings",
    "analytics",
    ...(isOwner ? (["administrators"] as Tab[]) : []),
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 bg-obsidian/95 px-6 py-4 backdrop-blur-md">
        <div>
          <p className="text-[9px] uppercase tracking-[0.5em] text-gold/70">The Perfume Souq</p>
          <h1 className="font-display text-xl italic text-gradient-gold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.35em] text-gold/70 hover:text-gold"
          >
            View Site
          </Link>
          <button
            onClick={() => setTab("requests")}
            className={`text-[10px] uppercase tracking-[0.35em] transition ${tab === "requests" ? "text-gold" : "text-gold/50 hover:text-gold"}`}
          >
            Back-in-Stock Requests
          </button>
          <button
            onClick={signOut}
            className="rounded-sm border border-gold/40 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-gold hover:bg-gold hover:text-obsidian"
          >
            Sign Out
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border px-6 py-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-4 py-1.5 text-[10px] uppercase tracking-[0.35em] transition ${tab === t ? "bg-gold text-obsidian" : "text-foreground/60 hover:text-gold"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {tab === "perfumes" && <PerfumesPanel />}
        {tab === "offers" && <OffersHub />}
        {tab === "spotlight" && <SpotlightPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "hero" && <HeroPanel />}
        {tab === "content" && <ContentPanel />}
        {tab === "theme" && <ThemePanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "analytics" && <AnalyticsPanel />}
        {tab === "requests" && <BackInStockPanel />}
        {tab === "administrators" && <AdministratorsPanel />}
      </section>
    </main>
  );
}

/* ---------------- Perfumes ---------------- */
function PerfumesPanel() {
  const { data: perfumes = [], refetch } = usePerfumes();
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Perfume | null | "new">(null);
  const [pendingDelete, setPendingDelete] = useState<Perfume | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggleStock = async (id: string, next: boolean) => {
    const { error } = await supabase.from("perfumes").update({ in_stock: next }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "In stock" : "Marked out of stock");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
    }
  };
  const updatePrice = async (id: string, price: number) => {
    const { error } = await supabase.from("perfumes").update({ price_pkr: price }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Price updated");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("perfumes").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setPendingDelete(null);
      refetch();
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl italic">Perfumes ({perfumes.length})</h2>
        <button
          onClick={() => setEditing("new")}
          className="btn-gold px-5 py-2 text-[10px] uppercase tracking-[0.4em]"
        >
          + Add Perfume
        </button>
      </div>
      <div className="space-y-3">
        {perfumes.map((p) => (
          <div
            key={p.id}
            className="glass-card grid grid-cols-1 items-center gap-4 rounded-sm p-4 md:grid-cols-[80px_1fr_120px_140px_90px_90px_70px]"
          >
            <div className="h-16 w-16 overflow-hidden bg-obsidian">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
              )}
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-gold/70">{p.family}</p>
              <p className="font-display text-lg italic">{p.name}</p>
            </div>
            <input
              type="number"
              defaultValue={p.price_pkr}
              onBlur={(e) => {
                const v = parseInt(e.target.value);
                if (v && v !== p.price_pkr) updatePrice(p.id, v);
              }}
              className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
            <span className="text-sm text-gold">{formatPKR(p.price_pkr)}</span>
            <button
              onClick={() => toggleStock(p.id, !p.in_stock)}
              className={`rounded-sm border px-3 py-2 text-[9px] uppercase tracking-[0.3em] ${p.in_stock ? "border-gold/40 text-gold" : "border-foreground/30 text-foreground/50"}`}
            >
              {p.in_stock ? "In Stock" : "Out"}
            </button>
            <button
              onClick={() => setEditing(p)}
              className="text-[9px] uppercase tracking-[0.3em] text-gold/80 hover:text-gold"
            >
              Edit
            </button>
            <button
              onClick={() => setPendingDelete(p)}
              className="text-[9px] uppercase tracking-[0.3em] text-red-400/80 hover:text-red-400"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <PerfumeEditor
          perfume={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refetch();
            qc.invalidateQueries({ queryKey: ["perfumes"] });
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This permanently removes the perfume and cannot be undone. Consider marking it Out of Stock instead if you might restore it later."
        confirmLabel="Delete Permanently"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ---------------- Offers Hub (Banners / Discounts / Bundles) ----------------
   Consolidates the old separate Promotions and Bundles admin tabs under one
   Offers section, per spec — "Remove the separate Promotions section...
   Consolidate relevant commercial functionality under Offers." Nothing about
   the underlying tables/panels changed, just the navigation surface. */
function OffersHub() {
  const [segment, setSegment] = useState<"banners" | "discounts" | "bundles">("discounts");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl italic">Offers</h2>
        <p className="mt-1 text-xs text-foreground/50">Discounts, bundles, and promotional banners — all in one place.</p>
      </div>
      <div className="flex gap-2 border-b border-border pb-4">
        {(
          [
            { id: "discounts", label: "Discounts" },
            { id: "bundles", label: "Bundles" },
            { id: "banners", label: "Banners" },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setSegment(s.id)}
            className={`rounded-sm px-4 py-2 text-[10px] uppercase tracking-[0.3em] transition ${segment === s.id ? "bg-gold text-obsidian" : "border border-gold/25 text-foreground/60 hover:text-gold"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {segment === "discounts" && <PromotionsPanel />}
      {segment === "bundles" && <BundlesPanel />}
      {segment === "banners" && <OffersPanel />}
    </div>
  );
}

/* ---------------- Offer Banners (announcement/slide-in/popup/inline) ---------------- */
function OffersPanel() {
  const { data: offers = [], refetch } = useOffers({ includeInactive: true });
  const [form, setForm] = useState({
    title: "",
    body: "",
    placement: "announcement",
    accent: "#c9a961",
    cta_label: "",
    cta_href: "#collection",
  });

  const create = async () => {
    if (!form.title.trim()) return;
    const { error } = await supabase.from("offers").insert({
      title: form.title,
      body: form.body || null,
      placement: form.placement,
      accent_color: form.accent,
      cta_label: form.cta_label || null,
      cta_href: form.cta_href || null,
      active: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Offer live");
      setForm({ ...form, title: "", body: "" });
      refetch();
    }
  };
  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("offers").update({ active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const del = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("offers").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      setPendingDelete(null);
      refetch();
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-sm p-6">
        <h3 className="mb-4 font-display text-xl italic">Create Offer</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            placeholder="Title (e.g. Free Delivery)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Body (optional)"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <select
            value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="announcement">Announcement Bar (top)</option>
            <option value="slide_in">Slide-in Banner (bottom right)</option>
            <option value="popup">Popup Modal (on load)</option>
            <option value="inline">Inline Card (in page flow)</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">
              Accent
            </label>
            <input
              type="color"
              value={form.accent}
              onChange={(e) => setForm({ ...form, accent: e.target.value })}
              className="h-9 w-16 rounded-sm border border-border"
            />
          </div>
          <input
            placeholder="Button label (optional)"
            value={form.cta_label}
            onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Button link (e.g. #collection)"
            value={form.cta_href}
            onChange={(e) => setForm({ ...form, cta_href: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={create}
          className="btn-gold mt-4 px-6 py-2 text-[10px] uppercase tracking-[0.4em]"
        >
          Publish Offer
        </button>
      </div>

      <div>
        <h3 className="mb-3 font-display text-xl italic">
          Active & Draft Offers ({offers.length})
        </h3>
        <div className="space-y-2">
          {offers.map((o) => (
            <div
              key={o.id}
              className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-sm p-4"
            >
              <div>
                <span
                  className="mr-3 rounded-sm px-2 py-0.5 text-[9px] uppercase tracking-[0.3em]"
                  style={{ background: o.accent_color, color: "#000" }}
                >
                  {o.placement}
                </span>
                <span className="font-display text-lg italic">{o.title}</span>
                {o.body && <span className="ml-2 text-xs text-foreground/60">— {o.body}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(o.id, o.active)}
                  className={`rounded-sm border px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${o.active ? "border-gold text-gold" : "border-foreground/30 text-foreground/50"}`}
                >
                  {o.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => setPendingDelete({ id: o.id, title: o.title })}
                  className="text-[9px] uppercase tracking-[0.3em] text-red-400/80 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!offers.length && (
            <p className="text-sm text-foreground/50">No offers yet. Create one above.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title}"?`}
        description="This offer will stop showing on the site immediately."
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ---------------- Promotions (discount engine) ---------------- */
type TargetType = "all" | "product" | "brand" | "category";

function PromotionsPanel() {
  const { data: promotions = [], refetch } = usePromotions({ includeInactive: true });
  const { data: perfumes = [] } = usePerfumes();
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();

  const [form, setForm] = useState({
    name: "",
    customer_description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    badge_text: "",
    terms: "",
    stackable: false,
    priority: 0,
    starts_at: "",
    ends_at: "",
    targetType: "all" as TargetType,
    targetId: "",
    productIds: [] as string[],
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const create = async () => {
    if (!form.name.trim()) return;
    const { data: promo, error } = await supabase
      .from("promotions")
      .insert({
        name: form.name.trim(),
        customer_description: form.customer_description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        badge_text: form.badge_text || null,
        terms: form.terms || null,
        stackable: form.stackable,
        priority: form.priority,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        active: true,
      })
      .select("id")
      .single();
    if (error || !promo) {
      toast.error(error?.message ?? "Failed to create promotion");
      return;
    }

    const targets: { promotion_id: string; target_type: string; target_id: string | null }[] =
      form.targetType === "product"
        ? form.productIds.map((id) => ({ promotion_id: promo.id, target_type: "product", target_id: id }))
        : form.targetType === "all"
          ? [{ promotion_id: promo.id, target_type: "all", target_id: null }]
          : [{ promotion_id: promo.id, target_type: form.targetType, target_id: form.targetId || null }];

    if (form.targetType !== "all" && !targets.length) {
      toast.error("Select at least one target");
      return;
    }

    const { error: targetError } = await supabase.from("promotion_targets").insert(targets);
    if (targetError) {
      toast.error(targetError.message);
      return;
    }
    toast.success("Promotion created");
    setForm({ ...form, name: "", customer_description: "", badge_text: "", terms: "", productIds: [] });
    refetch();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("promotions").update({ active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const del = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("promotions").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      setPendingDelete(null);
      refetch();
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-sm p-6">
        <h3 className="mb-4 font-display text-xl italic">Create Promotion</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            placeholder="Name (e.g. Father's Day 10%)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Customer-facing description (optional)"
            value={form.customer_description}
            onChange={(e) => setForm({ ...form, customer_description: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <select
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
            className="rounded-sm border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="percentage">Percentage Off</option>
            <option value="fixed">Fixed Amount Off (PKR)</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Discount value"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Badge text (e.g. 10% OFF)"
            value={form.badge_text}
            onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Terms (optional)"
            value={form.terms}
            onChange={(e) => setForm({ ...form, terms: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">Starts (optional)</label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">Ends (optional)</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground/70">
            <input type="checkbox" checked={form.stackable} onChange={(e) => setForm({ ...form, stackable: e.target.checked })} />
            Stackable with other promotions
          </label>
          <div>
            <label className="mb-1 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">Priority (higher wins if not stackable)</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">Applies To</label>
          <div className="flex flex-wrap gap-2">
            {(["all", "product", "brand", "category"] as TargetType[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, targetType: t, targetId: "", productIds: [] })}
                className={`rounded-sm px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${form.targetType === t ? "bg-gold text-obsidian" : "border border-gold/25 text-foreground/60"}`}
              >
                {t === "all" ? "Sitewide" : t}
              </button>
            ))}
          </div>

          {form.targetType === "brand" && (
            <select
              value={form.targetId}
              onChange={(e) => setForm({ ...form, targetId: e.target.value })}
              className="mt-3 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a brand…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          {form.targetType === "category" && (
            <select
              value={form.targetId}
              onChange={(e) => setForm({ ...form, targetId: e.target.value })}
              className="mt-3 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {form.targetType === "product" && (
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-sm border border-border p-3">
              {perfumes.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-foreground/70">
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        productIds: e.target.checked ? [...form.productIds, p.id] : form.productIds.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={create} className="btn-gold mt-4 px-6 py-2 text-[10px] uppercase tracking-[0.4em]">
          Create Promotion
        </button>
      </div>

      <div>
        <h3 className="mb-3 font-display text-xl italic">All Promotions ({promotions.length})</h3>
        <div className="space-y-2">
          {promotions.map((p: any) => (
            <div key={p.id} className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
              <div>
                <p className="font-display italic">{p.name}</p>
                <p className="text-[10px] text-foreground/50">
                  {p.discount_type === "percentage" ? `${p.discount_value}% off` : `${formatPKR(p.discount_value)} off`}
                  {p.stackable ? " · stackable" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(p.id, p.active)}
                  className={`rounded-sm border px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${p.active ? "border-gold/40 text-gold" : "border-foreground/30 text-foreground/50"}`}
                >
                  {p.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                  className="text-[9px] uppercase tracking-[0.3em] text-red-400/80 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!promotions.length && <p className="text-sm text-foreground/50">No promotions yet.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This promotion stops applying immediately."
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ---------------- Bundles ---------------- */
function BundlesPanel() {
  const { data: bundles = [], refetch } = useBundles();
  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();

  const [form, setForm] = useState({
    name: "",
    description: "",
    bundle_price_pkr: 0,
    items: [] as { variantId: string; quantity: number }[],
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const addItem = () => {
    const firstVariant = variants[0];
    if (!firstVariant) return;
    setForm({ ...form, items: [...form.items, { variantId: firstVariant.id, quantity: 1 }] });
  };

  const create = async () => {
    if (!form.name.trim() || !form.items.length) {
      toast.error("Add a name and at least one item");
      return;
    }
    const { data: bundle, error } = await supabase
      .from("bundles")
      .insert({ name: form.name.trim(), description: form.description || null, bundle_price_pkr: form.bundle_price_pkr, active: true })
      .select("id")
      .single();
    if (error || !bundle) {
      toast.error(error?.message ?? "Failed to create bundle");
      return;
    }
    const { error: itemError } = await supabase.from("bundle_items").insert(
      form.items.map((i) => ({ bundle_id: bundle.id, variant_id: i.variantId, quantity: i.quantity }))
    );
    if (itemError) {
      toast.error(itemError.message);
      return;
    }
    toast.success("Bundle created");
    setForm({ name: "", description: "", bundle_price_pkr: 0, items: [] });
    refetch();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("bundles").update({ active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const del = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("bundles").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      setPendingDelete(null);
      refetch();
    }
  };

  const variantLabel = (id: string) => {
    const v = variants.find((x) => x.id === id);
    const p = perfumes.find((x) => x.id === v?.perfume_id);
    return v ? `${p?.name ?? "?"} (${v.size_label})` : id;
  };

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-sm p-6">
        <h3 className="mb-4 font-display text-xl italic">Create Bundle</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            placeholder="Bundle name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="Bundle price (PKR)"
            value={form.bundle_price_pkr}
            onChange={(e) => setForm({ ...form, bundle_price_pkr: Number(e.target.value) })}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">Items</label>
          {form.items.map((item, idx) => (
            <div key={idx} className="mb-2 flex items-center gap-2">
              <select
                value={item.variantId}
                onChange={(e) => {
                  const next = [...form.items];
                  next[idx] = { ...next[idx], variantId: e.target.value };
                  setForm({ ...form, items: next });
                }}
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{variantLabel(v.id)}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => {
                  const next = [...form.items];
                  next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                  setForm({ ...form, items: next });
                }}
                className="w-20 rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
              />
              <button
                onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}
                className="text-[9px] uppercase tracking-[0.3em] text-red-400/80"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addItem} className="text-[10px] uppercase tracking-[0.3em] text-gold/80 hover:text-gold">
            + Add Item
          </button>
        </div>

        <button onClick={create} className="btn-gold mt-4 px-6 py-2 text-[10px] uppercase tracking-[0.4em]">
          Create Bundle
        </button>
      </div>

      <div>
        <h3 className="mb-3 font-display text-xl italic">All Bundles ({bundles.length})</h3>
        <div className="space-y-2">
          {bundles.map((b) => (
            <div key={b.id} className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
              <div>
                <p className="font-display italic">{b.name}</p>
                <p className="text-[10px] text-foreground/50">{formatPKR(b.bundle_price_pkr)} · {b.items.length} item(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(b.id, b.active)}
                  className={`rounded-sm border px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${b.active ? "border-gold/40 text-gold" : "border-foreground/30 text-foreground/50"}`}
                >
                  {b.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => setPendingDelete({ id: b.id, name: b.name })}
                  className="text-[9px] uppercase tracking-[0.3em] text-red-400/80 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!bundles.length && <p className="text-sm text-foreground/50">No bundles yet.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This bundle stops showing immediately."
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ---------------- Spotlight ---------------- */
function SpotlightPanel() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: spotlight, refetch } = useSpotlight();
  const [desc, setDesc] = useState("");
  useEffect(() => {
    setDesc(spotlight?.description_override ?? "");
  }, [spotlight?.description_override]);

  const save = async (perfume_id: string) => {
    const { error } = await supabase
      .from("spotlight")
      .update({ perfume_id, description_override: desc || null })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else {
      toast.success("Spotlight updated");
      refetch();
    }
  };
  const saveDesc = async () => {
    const { error } = await supabase
      .from("spotlight")
      .update({ description_override: desc || null })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("Description saved");
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl italic">Maison Spotlight</h2>
      <div className="glass-card rounded-sm p-6">
        <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-gold">Currently featured</p>
        <select
          value={spotlight?.perfume_id ?? ""}
          onChange={(e) => save(e.target.value)}
          className="w-full rounded-sm border border-gold/40 bg-background px-3 py-3 text-sm text-foreground"
        >
          <option value="">— select —</option>
          {perfumes
            .filter((p) => p.spotlight_eligible)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.family}
              </option>
            ))}
        </select>
        <p className="mt-6 mb-2 text-[10px] uppercase tracking-[0.4em] text-gold">
          Description override (leave blank for perfume's own)
        </p>
        <textarea
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={saveDesc}
          className="btn-gold mt-3 px-6 py-2 text-[10px] uppercase tracking-[0.4em]"
        >
          Save Description
        </button>
      </div>
    </div>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsPanel() {
  const { data: reviews = [], refetch } = useReviews({ includeUnapproved: true });
  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(approved ? "Approved" : "Unapproved");
      refetch();
    }
  };
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const del = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("reviews").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      setPendingDelete(null);
      refetch();
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Reviews ({reviews.length})</h2>
      {reviews.map((r) => (
        <div key={r.id} className="glass-card rounded-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-gold">
                {r.name} · {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              <p className="mt-2 text-sm italic text-foreground/80">"{r.body}"</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setApproved(r.id, !r.approved)}
                className={`rounded-sm border px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${r.approved ? "border-gold text-gold" : "border-foreground/30 text-foreground/60"}`}
              >
                {r.approved ? "Approved" : "Approve"}
              </button>
              <button
                onClick={() => setPendingDelete({ id: r.id, name: r.name })}
                className="text-[9px] uppercase tracking-[0.3em] text-red-400/80 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
      {!reviews.length && <p className="text-sm text-foreground/50">No reviews yet.</p>}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete review from "${pendingDelete?.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ---------------- Hero ---------------- */
const HERO_KEYS = [
  "hero.eyebrow",
  "hero.headline",
  "hero.description",
  "hero.cta_primary_label",
  "hero.cta_primary_href",
  "hero.cta_secondary_label",
  "hero.cta_secondary_href",
  "hero.featured_perfume_id",
  "hero.promo_ribbon",
  "hero.visible",
] as const;

function HeroPanel() {
  const { data: content = {}, refetch } = useSiteContent();
  const { data: perfumes = [] } = usePerfumes();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const k of HERO_KEYS) next[k] = content[k] ?? "";
    setDrafts(next);
  }, [content]);

  const set = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));

  const saveAll = async () => {
    setSaving(true);
    const rows = HERO_KEYS.map((key) => ({ key, value: drafts[key] ?? "" }));
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Hero saved — live immediately");
      refetch();
    }
  };

  const featuredPerfume = perfumes.find((p) => p.id === drafts["hero.featured_perfume_id"]);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Hero Section</h2>
      <p className="text-xs text-foreground/50">
        Controls the homepage's first screen. Selecting a Featured Perfume automatically pulls its name, price, image, and stock status — no code changes needed.
      </p>

      <div className="glass-card space-y-4 rounded-sm p-6">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Eyebrow (small label above headline)</label>
          <input
            value={drafts["hero.eyebrow"] ?? ""}
            onChange={(e) => set("hero.eyebrow", e.target.value)}
            placeholder="The Souq — Est. 2026"
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Headline</label>
          <textarea
            rows={2}
            value={drafts["hero.headline"] ?? ""}
            onChange={(e) => set("hero.headline", e.target.value)}
            placeholder="A scent is the silence you leave behind"
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Supporting Description (optional)</label>
          <textarea
            rows={2}
            value={drafts["hero.description"] ?? ""}
            onChange={(e) => set("hero.description", e.target.value)}
            placeholder="Rare, authentic fragrances from respected maisons, thoughtfully selected."
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Promotional Ribbon (optional, shown above eyebrow)</label>
          <input
            value={drafts["hero.promo_ribbon"] ?? ""}
            onChange={(e) => set("hero.promo_ribbon", e.target.value)}
            placeholder="Leave blank to hide"
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Primary CTA Label</label>
            <input
              value={drafts["hero.cta_primary_label"] ?? ""}
              onChange={(e) => set("hero.cta_primary_label", e.target.value)}
              placeholder="Shop Now"
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Primary CTA Destination</label>
            <input
              value={drafts["hero.cta_primary_href"] ?? ""}
              onChange={(e) => set("hero.cta_primary_href", e.target.value)}
              placeholder="/shop"
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Secondary CTA Label</label>
            <input
              value={drafts["hero.cta_secondary_label"] ?? ""}
              onChange={(e) => set("hero.cta_secondary_label", e.target.value)}
              placeholder="Find Your Signature Scent"
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Secondary CTA Destination</label>
            <input
              value={drafts["hero.cta_secondary_href"] ?? ""}
              onChange={(e) => set("hero.cta_secondary_href", e.target.value)}
              placeholder="#quiz"
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Featured Perfume</label>
          <select
            value={drafts["hero.featured_perfume_id"] ?? ""}
            onChange={(e) => set("hero.featured_perfume_id", e.target.value)}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">None — use fallback artwork</option>
            {perfumes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.in_stock ? "" : " (out of stock)"}</option>
            ))}
          </select>
          {featuredPerfume && (
            <p className="mt-2 text-[10px] text-foreground/50">
              Will show: {featuredPerfume.name} — {formatPKR(featuredPerfume.price_pkr)} — links to /product/{featuredPerfume.slug}
              {!featuredPerfume.in_stock && " — currently out of stock"}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={drafts["hero.visible"] !== "false"}
            onChange={(e) => set("hero.visible", e.target.checked ? "true" : "false")}
          />
          Hero section visible
        </label>

        <button onClick={saveAll} disabled={saving} className="btn-gold px-6 py-2 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40">
          {saving ? "Saving…" : "Save Hero"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Content ---------------- */
function ContentPanel() {
  const { data: content = {}, refetch } = useSiteContent();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    setDrafts(content);
  }, [content]);

  const save = async (key: string) => {
    const { error } = await supabase.from("site_content").upsert({ key, value: drafts[key] ?? "" });
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      refetch();
    }
  };

  const keys = Object.keys(drafts).sort();
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Site Text</h2>
      <p className="text-xs text-foreground/50">
        Edit any text string on the site. Inline "click-to-edit" mode ships next.
      </p>
      {keys.map((k) => (
        <div key={k} className="glass-card rounded-sm p-4">
          <label className="mb-2 block text-[10px] uppercase tracking-[0.4em] text-gold/70">
            {k}
          </label>
          <textarea
            rows={2}
            value={drafts[k] ?? ""}
            onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
          <button
            onClick={() => save(k)}
            className="mt-2 rounded-sm border border-gold/40 px-4 py-1.5 text-[9px] uppercase tracking-[0.35em] text-gold hover:bg-gold hover:text-obsidian"
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Theme ---------------- */
function ThemePanel() {
  const { data: content = {}, refetch } = useSiteContent();
  const active = content["theme.active"] || DEFAULT_THEME;
  const [saving, setSaving] = useState<string | null>(null);

  const select = async (id: string) => {
    setSaving(id);
    applyTheme(id); // instant local preview
    const { error } = await supabase.from("site_content").upsert({ key: "theme.active", value: id });
    setSaving(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Theme applied site-wide");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl italic">Website Theme</h2>
        <p className="mt-2 text-xs text-foreground/50">
          Applied instantly across every page — no code changes, no redeploy.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            disabled={saving === t.id}
            className={`glass-card rounded-sm p-5 text-left transition ${active === t.id ? "border-gold" : ""}`}
          >
            <div className="mb-4 flex h-16 overflow-hidden rounded-sm border border-border">
              <div className="flex-1" style={{ background: t.swatch[0] }} />
              <div className="flex-1" style={{ background: t.swatch[1] }} />
            </div>
            <p className="font-display text-lg italic">{t.label}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-gold/70">
              {active === t.id ? "Active" : saving === t.id ? "Applying…" : "Set as Active"}
            </p>
          </button>
        ))}
      </div>
      <p className="text-xs text-foreground/40">
        3 of the planned 6 presets are live. Additional themes (Forest Emerald, Matte Charcoal, Sandstone
        Beige) and a customer-facing light/dark toggle are not yet built.
      </p>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsPanel() {
  const { data: settings, refetch } = useSettings();
  const [wa, setWa] = useState("");
  const [ig, setIg] = useState("");
  const [comm, setComm] = useState("");
  useEffect(() => {
    if (settings) {
      setWa(settings.whatsapp_number);
      setIg(settings.instagram_handle);
      setComm(settings.community_link ?? "");
    }
  }, [settings]);
  const save = async () => {
    const { error } = await supabase
      .from("settings")
      .update({ whatsapp_number: wa, instagram_handle: ig, community_link: comm || null })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else {
      toast.success("Settings saved");
      refetch();
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Settings</h2>
      <div className="glass-card space-y-4 rounded-sm p-6">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">
            WhatsApp Number (international, no +)
          </label>
          <input
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="923228408507"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">
            Instagram Handle (no @)
          </label>
          <input
            value={ig}
            onChange={(e) => setIg(e.target.value)}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="theperfumesouq.pk"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">
            WhatsApp Community Link (blank hides the button)
          </label>
          <input
            value={comm}
            onChange={(e) => setComm(e.target.value)}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="https://chat.whatsapp.com/…"
          />
        </div>
        <button
          onClick={save}
          className="btn-gold px-6 py-2 text-[10px] uppercase tracking-[0.4em]"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

/* ---------------- Analytics ---------------- */
const RANGE_OPTIONS = [
  { label: "Today", days: 1 },
  { label: "Last 5 Days", days: 5 },
  { label: "Last 10 Days", days: 10 },
  { label: "Last 30 Days", days: 30 },
];

function AnalyticsPanel() {
  const [days, setDays] = useState(5);
  const { data: events = [], isLoading } = useAnalyticsEvents(days);
  const { data: perfumes = [] } = usePerfumes();
  const { data: orders = [] } = useOrderIntents(25);

  const perfumeName = (id: string | null) => perfumes.find((p) => p.id === id)?.name ?? "Unknown";

  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;
  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const productViews = events.filter((e) => e.event_type === "product_view");
  const whatsappClicks = events.filter((e) => e.event_type === "whatsapp_click");
  const quizStarts = events.filter((e) => e.event_type === "quiz_start").length;
  const quizCompletes = events.filter((e) => e.event_type === "quiz_complete").length;
  const compareAdds = events.filter((e) => e.event_type === "compare_add").length;

  const countBy = (rows: typeof events) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!r.perfume_id) continue;
      map.set(r.perfume_id, (map.get(r.perfume_id) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const topViewed = countBy(productViews);
  const topWhatsapp = countBy(whatsappClicks);

  const viewToClickRate = productViews.length ? Math.round((whatsappClicks.length / productViews.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl italic">Analytics</h2>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-sm px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${days === r.days ? "bg-gold text-obsidian" : "border border-gold/25 text-foreground/60"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/50">Loading…</p>
      ) : !events.length ? (
        <p className="text-sm text-foreground/50">No activity recorded yet for this range.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Page Views", value: pageViews },
              { label: "Unique Visitors", value: uniqueSessions },
              { label: "Product Views", value: productViews.length },
              { label: "WhatsApp Clicks", value: whatsappClicks.length },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-sm p-5 text-center">
                <p className="font-display text-3xl italic text-gradient-gold">{s.value}</p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="glass-card rounded-sm p-5 text-center">
              <p className="font-display text-2xl italic text-gradient-gold">{viewToClickRate}%</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/50">View → WhatsApp Rate</p>
            </div>
            <div className="glass-card rounded-sm p-5 text-center">
              <p className="font-display text-2xl italic text-gradient-gold">
                {quizStarts ? Math.round((quizCompletes / quizStarts) * 100) : 0}%
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/50">
                Quiz Completion ({quizCompletes}/{quizStarts})
              </p>
            </div>
            <div className="glass-card rounded-sm p-5 text-center">
              <p className="font-display text-2xl italic text-gradient-gold">{compareAdds}</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/50">Products Compared</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="glass-card rounded-sm p-6">
              <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-gold/70">Most Viewed Perfumes</p>
              {topViewed.length ? (
                <ul className="space-y-2">
                  {topViewed.map(([id, count]) => (
                    <li key={id} className="flex items-center justify-between text-sm">
                      <span>{perfumeName(id)}</span>
                      <span className="text-foreground/50">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground/40">No product views yet.</p>
              )}
            </div>
            <div className="glass-card rounded-sm p-6">
              <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-gold/70">Most Ordered via WhatsApp</p>
              {topWhatsapp.length ? (
                <ul className="space-y-2">
                  {topWhatsapp.map(([id, count]) => (
                    <li key={id} className="flex items-center justify-between text-sm">
                      <span>{perfumeName(id)}</span>
                      <span className="text-foreground/50">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground/40">No WhatsApp clicks yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="glass-card rounded-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold/70">Recent WhatsApp Orders</p>
          <span className="text-[10px] text-foreground/40">{orders.length} recorded</span>
        </div>
        {orders.length === 0 ? (
          <p className="text-xs text-foreground/40">No WhatsApp orders recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-b-0">
                <div>
                  <span className="font-mono text-xs text-gold">{o.order_ref}</span>
                  <span className="ml-3 text-foreground/60">{o.customer_phone}</span>
                  {o.customer_name && <span className="ml-2 text-foreground/40">· {o.customer_name}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-foreground/40">{new Date(o.created_at).toLocaleString()}</span>
                  <span className="text-foreground/60">{o.items?.length ?? 0} item(s)</span>
                  <span className="text-gradient-gold font-display">{formatPKR(o.total_pkr)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Back-in-Stock Requests ---------------- */
function BackInStockPanel() {
  const { data: requests = [], isLoading } = useBackInStockRequests();
  const { data: perfumes = [] } = usePerfumes();
  const updateStatus = useUpdateBackInStockStatus();

  const perfumeName = (id: string) => perfumes.find((p) => p.id === id)?.name ?? "Unknown Product";

  const setStatus = async (id: string, status: "pending" | "contacted" | "resolved") => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Back-in-Stock Requests</h2>
      <p className="text-xs text-foreground/50">Customers waiting to be notified when an out-of-stock perfume returns.</p>

      {isLoading ? (
        <p className="text-sm text-foreground/50">Loading…</p>
      ) : !requests.length ? (
        <p className="text-sm text-foreground/50">No requests yet.</p>
      ) : (
        <div className="glass-card divide-y divide-border rounded-sm">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-display text-lg italic">{perfumeName(r.perfume_id)}</p>
                <p className="text-xs text-foreground/60">{r.contact_email || r.contact_phone}</p>
                <p className="text-[9px] uppercase tracking-[0.3em] text-foreground/40">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(["pending", "contacted", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r.id, s)}
                    className={`rounded-sm px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${r.status === s ? "bg-gold text-obsidian" : "border border-gold/25 text-foreground/60"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Administrators (Owner only) ---------------- */
type AdminRoleRow = { id: string; user_id: string; email: string; role: string; created_at: string };

function AdministratorsPanel() {
  const [rows, setRows] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "analyst">("editor");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAdminRoles();
      setRows(data as AdminRoleRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load administrators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await addAdminRole({ data: { email: email.trim(), role } });
      toast.success(`${email.trim()} granted ${role} access`);
      setEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add administrator");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeAdminRole({ data: { userId } });
      toast.success("Access revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke access");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl italic">Administrators</h2>
      <p className="text-xs text-foreground/50">
        Grant staff access without sharing the Owner login. Admin and Editor can manage the catalogue; Analyst is read-only (analytics access only).
      </p>

      <div className="glass-card space-y-4 rounded-sm p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">
              Email (must already have an account)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.4em] text-gold/70">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !email.trim()}
            className="btn-gold px-6 py-2 text-[10px] uppercase tracking-[0.4em] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Adding…" : "Grant Access"}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-sm p-6">
        {loading ? (
          <p className="text-sm text-foreground/50">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground/50">No additional administrators yet — only the Owner account has access.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm">{r.email}</p>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-gold/70">{r.role}</p>
                </div>
                <button
                  onClick={() => handleRemove(r.user_id)}
                  className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 hover:text-destructive"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
