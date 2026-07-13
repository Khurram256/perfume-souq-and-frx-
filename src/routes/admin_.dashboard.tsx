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
} from "@/lib/api/queries";
import { useAuthUser } from "@/lib/admin/session";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PerfumeEditor } from "@/components/admin/PerfumeEditor";
import type { Perfume } from "@/lib/api/queries";

export const Route = createFileRoute("/admin_/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — The Perfume Souq" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

type Tab = "perfumes" | "offers" | "spotlight" | "reviews" | "content" | "settings";

function Dashboard() {
  const { user, loading } = useAuthUser();
  const { data: lock, isLoading: lockLoading, refetch: refetchLock } = useAdminLock();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("perfumes");

  useEffect(() => {
    if (loading || lockLoading) return;
    if (!user || lock?.admin_user_id !== user.id) {
      navigate({ to: "/admin" as any });
    }
  }, [user, lock, loading, lockLoading, navigate]);

  const signOut = async () => {
    await supabase.rpc("release_admin_lock");
    await supabase.auth.signOut();
    await refetchLock();
    toast.success("Signed out. Dashboard is unlocked.");
    navigate({ to: "/admin" as any });
  };

  if (loading || lockLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-gold text-[10px] uppercase tracking-[0.5em]">
        Loading…
      </div>
    );
  }

  const tabs: Tab[] = ["perfumes", "offers", "spotlight", "reviews", "content", "settings"];

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
        {tab === "offers" && <OffersPanel />}
        {tab === "spotlight" && <SpotlightPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "content" && <ContentPanel />}
        {tab === "settings" && <SettingsPanel />}
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

/* ---------------- Offers ---------------- */
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
          className="w-full rounded-sm border border-gold/40 bg-obsidian px-3 py-3 text-sm"
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
