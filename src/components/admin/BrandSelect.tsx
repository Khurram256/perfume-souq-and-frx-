import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "@/lib/api/queries";
import { normalizeBrandName } from "./BrandEditor";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const inputCls = "w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-gold";

// Searchable brand dropdown with inline "+ Add New Brand" creation, shared
// by the normal Add/Edit Perfume form. Filters by name as you type; typing
// a name with no match surfaces "Add New Brand" directly instead of a dead
// end. New brands are created here (case/hyphen/space-normalized duplicate
// check first) and reported back via onBrandCreated so the caller can
// refresh its own brand list/cache.
export function BrandSelect({
  brands,
  value,
  onChange,
  onBrandCreated,
}: {
  brands: Brand[];
  value: string;
  onChange: (brandId: string) => void;
  onBrandCreated?: (brand: Brand) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = brands.find((b) => b.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const exactMatch = brands.some((b) => normalizeBrandName(b.name) === normalizeBrandName(query));

  const createBrand = async () => {
    const name = query.trim();
    if (!name) return;
    const normalized = normalizeBrandName(name);
    const existing = brands.find((b) => normalizeBrandName(b.name) === normalized);
    if (existing) {
      onChange(existing.id);
      setQuery("");
      setOpen(false);
      return;
    }
    setCreating(true);
    try {
      const { data: created, error } = await supabase
        .from("brands")
        .insert({ name, slug: slugify(name) })
        .select()
        .single();
      if (error) {
        toast.error(error.message.includes("duplicate") || error.message.includes("unique") ? "That brand already exists." : error.message);
        return;
      }
      onBrandCreated?.(created as Brand);
      onChange(created.id);
      toast.success(`"${created.name}" added.`);
      setQuery("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={selected ? "" : "text-foreground/40"}>{selected?.name ?? "— select a brand —"}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-foreground/50" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[90] mt-1 w-full rounded-sm border border-gold/30 bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands…"
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChange(b.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={`block w-full rounded-sm px-3 py-2 text-left text-sm ${b.id === value ? "bg-gold/15 text-gold" : "text-foreground/80 hover:bg-gold/10"}`}
              >
                {b.name}
              </button>
            ))}
            {!filtered.length && !query.trim() && (
              <p className="px-3 py-2 text-xs text-foreground/40">No brands yet — add one below.</p>
            )}
          </div>
          {query.trim() && !exactMatch && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={createBrand}
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-gold/40 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-gold hover:bg-gold/10 disabled:opacity-40"
              >
                {creating ? "Creating…" : `+ Add New Brand "${query.trim()}"`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
