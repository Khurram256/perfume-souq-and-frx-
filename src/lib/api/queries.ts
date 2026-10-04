import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- categories ---------------- */
export type Category = { id: string; name: string; slug: string; sort_order: number };

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,sort_order")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
  staleTime: 60_000,
});

export function useCategories() {
  return useQuery(categoriesQuery);
}

/* ---------------- perfumes ---------------- */
// Public-safe columns only — deliberately excludes `source_notes` (private
// admin audit text) and `needs_confirmation` (admin-only flag). RLS is
// row-level, not column-level, so `select("*")` here would ship both to
// every visitor's network tab regardless of whether the UI renders them.
// The admin dashboard uses usePerfumesAdmin() below instead, which does
// select those two columns.
const PUBLIC_PERFUME_COLUMNS =
  "id,name,slug,tagline,description,category_id,family,price_pkr,image_url,top_notes,heart_notes,base_notes," +
  "in_stock,featured,spotlight_eligible,rating_longevity,rating_sillage,rating_projection,rating_versatility," +
  "rating_compliment,rating_uniqueness,rating_sweetness,rating_freshness,rating_warmth,best_season,occasion," +
  "tag_family,tag_intensity,tag_mood,tag_season,tag_occasion,tag_gender,sort_order,brand_id,gender,concentration," +
  "status,new_arrival,sku,meta_title,meta_description,og_image_url,main_accords,sale_price_pkr,stock_quantity," +
  "image_status,image_storage_path,launch_year,perfumer";

export type Perfume = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category_id: string | null;
  family: string | null;
  price_pkr: number;
  image_url: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  in_stock: boolean;
  featured: boolean;
  spotlight_eligible: boolean;
  rating_longevity: number;
  rating_sillage: number;
  rating_projection: number;
  rating_versatility: number;
  rating_compliment: number;
  rating_uniqueness: number;
  rating_sweetness: number;
  rating_freshness: number;
  rating_warmth: number;
  best_season: string | null;
  occasion: string | null;
  tag_family: string | null;
  tag_intensity: string | null;
  tag_mood: string | null;
  tag_season: string | null;
  tag_occasion: string | null;
  tag_gender: string | null;
  sort_order: number;
  brand_id: string | null;
  gender: "men" | "women" | "unisex" | null;
  concentration: string | null;
  status: "draft" | "published" | "archived";
  new_arrival: boolean;
  sku: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  main_accords: string[];
  launch_year: number | null;
  perfumer: string | null;
  sale_price_pkr: number | null;
  stock_quantity: number | null;
  image_status: "missing" | "uploaded";
  image_storage_path: string | null;
  // Admin-only — present only when fetched via usePerfumesAdmin().
  needs_confirmation?: boolean;
  source_notes?: string | null;
};

export const perfumesQuery = queryOptions({
  queryKey: ["perfumes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("perfumes")
      .select(PUBLIC_PERFUME_COLUMNS)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as Perfume[];
  },
  staleTime: 60_000,
});

export function usePerfumes() {
  return useQuery(perfumesQuery);
}

// Admin dashboard only — includes needs_confirmation and source_notes so
// the Perfumes panel can show the "Needs Confirmation" flag and filter by
// it. Never import this into a customer-facing page.
export function usePerfumesAdmin() {
  return useQuery({
    queryKey: ["perfumes", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Perfume[];
    },
  });
}

export const perfumeBySlugQuery = (slug: string | undefined) =>
  queryOptions({
    queryKey: ["perfume", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.from("perfumes").select(PUBLIC_PERFUME_COLUMNS).eq("slug", slug as string).maybeSingle();
      if (error) throw error;
      return data as unknown as Perfume | null;
    },
    staleTime: 60_000,
  });

export function usePerfumeBySlug(slug: string | undefined) {
  return useQuery(perfumeBySlugQuery(slug));
}

/* ---------------- brands ---------------- */
export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_image_url: string | null;
  origin_country: string | null;
  story: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  is_active: boolean;
};

// Storefront-facing: active brands only, independent of the caller's auth
// state — filtered at the query level (not just relying on RLS) so this
// hook is safe to reuse from anywhere without needing to reason about who's
// signed in. Every public filter/page (Shop, brand pages, quiz, compare)
// uses this.
export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Brand[];
  },
  staleTime: 60_000,
});

export function useBrands() {
  return useQuery(brandsQuery);
}

// Admin-only: every brand, active or not, so the management panel and the
// perfume brand picker can see (and reactivate) inactive ones. RLS still
// requires an authenticated admin session for this to return anything
// beyond the active rows every anonymous visitor can already see.
export function useBrandsAdmin() {
  return useQuery({
    queryKey: ["brands", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("sort_order").order("name");
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });
}

export const brandBySlugQuery = (slug: string | undefined) =>
  queryOptions({
    queryKey: ["brand", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").eq("slug", slug as string).maybeSingle();
      if (error) throw error;
      return data as Brand | null;
    },
    staleTime: 60_000,
  });

export function useBrandBySlug(slug: string | undefined) {
  return useQuery(brandBySlugQuery(slug));
}

/* ---------------- product variants ---------------- */
export type ProductVariant = {
  id: string;
  perfume_id: string;
  size_label: string;
  size_ml: number | null;
  price_pkr: number;
  sku: string | null;
  in_stock: boolean;
  stock_quantity: number | null;
  is_default: boolean;
  sort_order: number;
};

export const variantsQuery = (perfumeId: string | undefined) =>
  queryOptions({
    queryKey: ["variants", perfumeId],
    enabled: !!perfumeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("perfume_id", perfumeId as string)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
    staleTime: 60_000,
  });

export function useVariants(perfumeId: string | undefined) {
  return useQuery(variantsQuery(perfumeId));
}

export const allVariantsQuery = queryOptions({
  queryKey: ["variants", "all"],
  queryFn: async () => {
    const { data, error } = await supabase.from("product_variants").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as ProductVariant[];
  },
  staleTime: 60_000,
});

export function useAllVariants() {
  return useQuery(allVariantsQuery);
}

/* ---------------- promotions (discount engine) ---------------- */
export const promotionsQuery = (opts?: { includeInactive?: boolean }) =>
  queryOptions({
    queryKey: ["promotions", opts?.includeInactive ? "all" : "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*, targets:promotion_targets(target_type,target_id)");
      if (error) throw error;
      return (data ?? []) as import("@/lib/pricing").Promotion[];
    },
    staleTime: 60_000,
  });

export function usePromotions(opts?: { includeInactive?: boolean }) {
  return useQuery(promotionsQuery(opts));
}

/* ---------------- back-in-stock requests ---------------- */
export function useSubmitBackInStock() {
  return useMutation({
    mutationFn: async (input: { perfumeId: string; variantId?: string; email?: string; phone?: string }) => {
      const { error } = await supabase.from("back_in_stock_requests").insert({
        perfume_id: input.perfumeId,
        variant_id: input.variantId ?? null,
        contact_email: input.email?.trim() || null,
        contact_phone: input.phone?.trim() || null,
      });
      if (error) throw error;
    },
  });
}

export type BackInStockRequest = {
  id: string;
  perfume_id: string;
  variant_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: "pending" | "contacted" | "resolved";
  created_at: string;
};

export function useBackInStockRequests() {
  return useQuery({
    queryKey: ["back_in_stock_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("back_in_stock_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BackInStockRequest[];
    },
  });
}

export function useUpdateBackInStockStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: BackInStockRequest["status"] }) => {
      const { error } = await supabase.from("back_in_stock_requests").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["back_in_stock_requests"] }),
  });
}

/* ---------------- media (Souq in Motion, etc.) ---------------- */
export type MediaItem = {
  id: string;
  url: string;
  kind: "image" | "video";
  section: "visions" | "souq_in_motion" | "instagram" | "general";
  caption: string | null;
  alt_text: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
};

export function useMedia(section: MediaItem["section"], opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ["media", section, opts?.includeInactive ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("media").select("*").eq("section", section).order("sort_order");
      if (!opts?.includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MediaItem[];
    },
  });
}

/* ---------------- order intents ---------------- */
export type OrderIntentLine = {
  perfumeId: string;
  variantId: string | null;
  name: string;
  sizeLabel: string;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  lineTotal: number;
  promotionName: string | null;
};
export type OrderStatus = "draft" | "whatsapp_opened" | "submitted" | "confirmed" | "processing" | "completed" | "cancelled";
export type OrderIntent = {
  id: string;
  order_ref: string;
  customer_phone: string;
  customer_name: string | null;
  delivery_address: string | null;
  location_link: string | null;
  note: string | null;
  items: OrderIntentLine[];
  subtotal_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  status: OrderStatus;
  created_at: string;
};

export function useOrderIntents(limit = 50) {
  return useQuery({
    queryKey: ["order_intents", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_intents")
        .select("id,order_ref,customer_phone,customer_name,delivery_address,location_link,note,items,subtotal_pkr,discount_pkr,total_pkr,status,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as OrderIntent[];
    },
  });
}

/* ---------------- analytics events ---------------- */
const SESSION_KEY = "tps_session_v1";
export function getSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "whatsapp_click"
  | "quiz_start"
  | "quiz_complete"
  | "compare_add"
  | "offer_view"
  | "offer_click"
  | "bundle_view"
  | "ad_view"
  | "ad_click";

export function trackEvent(
  eventType: AnalyticsEventType,
  fields?: {
    perfumeId?: string;
    variantId?: string;
    promotionId?: string;
    bundleId?: string;
    sourcePath?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // Fire-and-forget — never block or throw into the calling UI flow.
  supabase
    .from("analytics_events")
    .insert({
      event_type: eventType,
      session_id: getSessionId(),
      perfume_id: fields?.perfumeId ?? null,
      variant_id: fields?.variantId ?? null,
      promotion_id: fields?.promotionId ?? null,
      bundle_id: fields?.bundleId ?? null,
      source_path: fields?.sourcePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
      metadata: (fields?.metadata ?? {}) as import("@/integrations/supabase/types").Json,
    })
    .then(({ error }) => {
      if (error) console.warn("trackEvent failed", error.message);
    });
}

export type AnalyticsEventRow = {
  event_type: AnalyticsEventType;
  perfume_id: string | null;
  variant_id: string | null;
  promotion_id: string | null;
  bundle_id: string | null;
  session_id: string;
  created_at: string;
};

export function useAnalyticsEvents(days: number) {
  return useQuery({
    queryKey: ["analytics_events", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type,perfume_id,variant_id,promotion_id,bundle_id,session_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as AnalyticsEventRow[];
    },
  });
}

/* ---------------- spotlight ---------------- */
export const spotlightQuery = queryOptions({
  queryKey: ["spotlight"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("spotlight")
      .select("perfume_id, description_override")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data as { perfume_id: string | null; description_override: string | null } | null;
  },
  staleTime: 60_000,
});

export function useSpotlight() {
  return useQuery(spotlightQuery);
}

/* ---------------- offers ---------------- */
export type OfferPlacement = "announcement" | "slide_in" | "popup" | "inline";
export type Offer = {
  id: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: OfferPlacement;
  accent_color: string;
  active: boolean;
  sort_order: number;
};

export function useOffers(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ["offers", opts?.includeInactive ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("offers").select("*").order("sort_order");
      if (!opts?.includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Offer[];
    },
  });
}

/* ---------------- reviews ---------------- */
export type Review = {
  id: string;
  name: string;
  rating: number;
  body: string;
  approved: boolean;
  created_at: string;
};

export function useReviews(opts?: { includeUnapproved?: boolean }) {
  return useQuery({
    queryKey: ["reviews", opts?.includeUnapproved ? "all" : "approved"],
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id,name,rating,body,approved,created_at")
        .order("created_at", { ascending: false });
      if (!opts?.includeUnapproved) q = q.eq("approved", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; rating: number; body: string }) => {
      const { error } = await supabase.from("reviews").insert({
        name: input.name.trim(),
        rating: input.rating,
        body: input.body.trim(),
        approved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

/* ---------------- site_content ---------------- */
export const siteContentQuery = queryOptions({
  queryKey: ["site_content"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_content").select("key,value");
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value ?? "";
    return map;
  },
  staleTime: 60_000,
});

export function useSiteContent() {
  return useQuery(siteContentQuery);
}

// `|| fallback`, not `?? fallback`: several site_content rows (hero CTA
// label/href among them) are stored as empty strings rather than being
// absent, and no caller ever wants "" to mean something different from
// "not configured, use the default" — that gap was silently blanking the
// hero's CTA buttons entirely (empty label, empty href).
export function useContent(key: string, fallback = "") {
  const { data } = useSiteContent();
  return data?.[key] || fallback;
}

/* ---------------- settings ---------------- */
export type Settings = {
  whatsapp_number: string;
  instagram_handle: string;
  community_link: string | null;
};

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("whatsapp_number,instagram_handle,community_link")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return (data ?? {
      whatsapp_number: "923228408507",
      instagram_handle: "theperfumesouq.pk",
      community_link: null,
    }) as Settings;
  },
  staleTime: 60_000,
});

export function useSettings() {
  return useQuery(settingsQuery);
}

/* ---------------- admin lock ---------------- */
export function useAdminLock() {
  return useQuery({
    queryKey: ["admin_lock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_lock")
        .select("admin_email,admin_user_id,claimed_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        admin_email: string | null;
        admin_user_id: string | null;
        claimed_at: string | null;
      } | null;
    },
  });
}
