import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
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
  type OrderStatus,
  useBackInStockRequests,
  useUpdateBackInStockStatus,
  useBrands,
  useAllVariants,
  usePromotions,
  useMedia,
  type MediaItem,
} from "@/lib/api/queries";
import { useAuthUser } from "@/lib/admin/session";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PerfumeEditor } from "@/components/admin/PerfumeEditor";
import type { Perfume } from "@/lib/api/queries";
import { THEMES, applyTheme, DEFAULT_THEME } from "@/components/ThemeEngine";
import { ThemeToggle } from "@/components/ThemeToggle";
import { listAdminRoles, addAdminRole, removeAdminRole, uploadPerfumeImage } from "@/lib/api/admin.functions";

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
type Tab = "perfumes" | "offers" | "motion" | "hero" | "spotlight" | "reviews" | "content" | "theme" | "settings" | "analytics" | "orders" | "requests" | "administrators";
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
    "motion",
    "hero",
    "spotlight",
    "reviews",
    "content",
    "theme",
    "settings",
    "analytics",
    "orders",
  ];

  // Administrators is deliberately not a visible tab (per spec — "remove
  // the Administrators option from the visible dashboard navigation") but
  // the panel, its server-side authorization, and RLS are all untouched;
  // the Owner reaches it via the small header link below, same pattern as
  // Back-in-Stock Requests.
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const todayLabel = new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 bg-obsidian/95 px-6 py-4 backdrop-blur-md">
        <div>
          <p className="text-[9px] uppercase tracking-[0.5em] text-gold/70">The Perfume Souq</p>
          <h1 className="font-display text-xl italic text-gradient-gold">
            {greeting}
            {isOwner ? ", Owner" : ""}
          </h1>
          <p className="mt-0.5 text-[10px] text-foreground/50">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle forceLight />
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
          {isOwner && (
            <button
              onClick={() => setTab("administrators")}
              className={`text-[10px] uppercase tracking-[0.35em] transition ${tab === "administrators" ? "text-gold" : "text-gold/50 hover:text-gold"}`}
            >
              Administrators
            </button>
          )}
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
        {tab === "motion" && <SouqInMotionPanel />}
        {tab === "spotlight" && <SpotlightPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "hero" && <HeroPanel />}
        {tab === "content" && <ContentPanel />}
        {tab === "theme" && <ThemePanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "analytics" && <AnalyticsPanel />}
        {tab === "orders" && <OrdersPanel />}
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
  const { data: brands = [] } = useBrands();
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
          brands={brands}
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

/* ---------------- Souq in Motion (media gallery) ---------------- */
function SouqInMotionPanel() {
  const { data: items = [], refetch } = useMedia("souq_in_motion", { includeInactive: true });
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; caption: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => refetch();

  const addFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large — max 8MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadPerfumeImage({ data: { fileName: file.name, contentType: file.type, base64 } });
      const { error } = await supabase.from("media").insert({
        url: result.url,
        kind: "image",
        section: "souq_in_motion",
        sort_order: items.length,
        active: true,
      });
      if (error) throw new Error(error.message);
      toast.success("Added to Souq in Motion");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const update = async (id: string, patch: Partial<MediaItem>) => {
    const { error } = await supabase.from("media").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const move = async (item: MediaItem, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((v) => v.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from("media").update({ sort_order: other.sort_order }).eq("id", item.id),
      supabase.from("media").update({ sort_order: item.sort_order }).eq("id", other.id),
    ]);
    refresh();
  };

  const del = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("media").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      refresh();
    }
    setPendingDelete(null);
  };

  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl italic">Souq in Motion</h2>
          <p className="mt-1 text-xs text-foreground/50">The gallery shown in "The Souq in motion" homepage section.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={addFromFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-gold px-6 py-2 text-[10px] uppercase tracking-[0.4em] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Add Image"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sorted.map((item, i) => (
          <div key={item.id} className="glass-card flex flex-wrap items-center gap-3 rounded-sm p-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-card">
              <img src={item.url} alt={item.alt_text || ""} className="h-full w-full object-cover" />
            </div>
            <input
              placeholder="Caption (optional)"
              defaultValue={item.caption ?? ""}
              onBlur={(e) => update(item.id, { caption: e.target.value || null })}
              className="min-w-[140px] flex-1 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Alt text"
              defaultValue={item.alt_text ?? ""}
              onBlur={(e) => update(item.id, { alt_text: e.target.value || null })}
              className="min-w-[120px] flex-1 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Link (optional)"
              defaultValue={item.link_url ?? ""}
              onBlur={(e) => update(item.id, { link_url: e.target.value || null })}
              className="min-w-[120px] flex-1 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => update(item.id, { active: !item.active })}
              className={`rounded-sm border px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] ${item.active ? "border-gold/40 text-gold" : "border-foreground/30 text-foreground/50"}`}
            >
              {item.active ? "Active" : "Hidden"}
            </button>
            <button onClick={() => move(item, -1)} disabled={i === 0} className="text-foreground/50 hover:text-gold disabled:opacity-20">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => move(item, 1)} disabled={i === sorted.length - 1} className="text-foreground/50 hover:text-gold disabled:opacity-20">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPendingDelete({ id: item.id, caption: item.caption || "this item" })} className="text-red-400/70 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!sorted.length && <p className="text-sm text-foreground/50">No media yet — add an image to populate this section.</p>}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove "${pendingDelete?.caption}"?`}
        description="This image stops showing on the homepage immediately."
        confirmLabel="Remove"
        danger
        onConfirm={del}
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
  const [segment, setSegment] = useState<"banners" | "discounts">("discounts");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl italic">Offers</h2>
        <p className="mt-1 text-xs text-foreground/50">Discounts and promotional banners — all in one place.</p>
      </div>
      <div className="flex gap-2 border-b border-border pb-4">
        {(
          [
            { id: "discounts", label: "Discounts" },
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

      <div className="glass-card flex items-center justify-between rounded-sm p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold/70">WhatsApp Orders</p>
          <p className="mt-1 text-xs text-foreground/50">{orders.length} recorded — full detail, search and status updates live in the Orders tab.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Orders (dedicated section) ---------------- */
const ORDER_STATUSES: OrderStatus[] = ["draft", "whatsapp_opened", "submitted", "confirmed", "processing", "completed", "cancelled"];

function OrdersPanel() {
  const { data: orders = [], isLoading } = useOrderIntents(200);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const inProducts = o.items?.some((i) => i.name.toLowerCase().includes(q));
    return (
      o.order_ref.toLowerCase().includes(q) ||
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      o.customer_phone.includes(q) ||
      !!inProducts
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl italic">WhatsApp Orders</h2>
        <p className="mt-1 text-xs text-foreground/50">Every order intent recorded when a customer sends their cart to WhatsApp.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, customer, phone, or product…"
          className="min-w-[240px] flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/50">Loading…</p>
      ) : !filtered.length ? (
        <p className="text-sm text-foreground/50">{orders.length ? "No orders match this search/filter." : "No orders recorded yet."}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="glass-card rounded-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="text-left">
                  <span className="font-mono text-sm text-gold">{o.order_ref}</span>
                  <span className="ml-3 text-sm text-foreground/70">{o.customer_name || "—"}</span>
                  <span className="ml-3 text-xs text-foreground/50">{o.customer_phone}</span>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-foreground/40">{new Date(o.created_at).toLocaleString()}</span>
                  <span className="text-gradient-gold font-display text-sm">{formatPKR(o.total_pkr)}</span>
                  {/* Read-only — status is set by the checkout flow itself, not
                      editable from this dashboard (per spec: no misleading
                      status editor here). */}
                  <span className="rounded-sm border border-gold/40 bg-background px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gold">
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {expanded === o.id && (
                <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                  {o.delivery_address && <p><span className="text-foreground/50">Address:</span> {o.delivery_address}</p>}
                  {o.location_link && (
                    <p>
                      <span className="text-foreground/50">Location:</span>{" "}
                      <a href={o.location_link} target="_blank" rel="noreferrer" className="text-gold underline">
                        {o.location_link}
                      </a>
                    </p>
                  )}
                  {o.note && <p><span className="text-foreground/50">Note:</span> {o.note}</p>}
                  <div>
                    <p className="mb-1 text-[9px] uppercase tracking-[0.3em] text-foreground/40">Items</p>
                    <ul className="space-y-1">
                      {o.items.map((i, idx) => (
                        <li key={idx} className="flex justify-between text-xs text-foreground/70">
                          <span>{i.name} ({i.sizeLabel}) × {i.quantity}</span>
                          <span>{formatPKR(i.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {o.discount_pkr > 0 && (
                    <p className="text-xs text-foreground/60">
                      Subtotal {formatPKR(o.subtotal_pkr)} — Discount −{formatPKR(o.discount_pkr)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
