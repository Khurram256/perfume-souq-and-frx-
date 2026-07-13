import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- categories ---------------- */
export type Category = { id: string; name: string; slug: string; sort_order: number };

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

/* ---------------- perfumes ---------------- */
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
  best_season: string | null;
  occasion: string | null;
  tag_family: string | null;
  tag_intensity: string | null;
  tag_mood: string | null;
  tag_season: string | null;
  tag_occasion: string | null;
  tag_gender: string | null;
  sort_order: number;
};

export function usePerfumes() {
  return useQuery({
    queryKey: ["perfumes"],
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

/* ---------------- spotlight ---------------- */
export function useSpotlight() {
  return useQuery({
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
  });
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
      const { error } = await supabase
        .from("reviews")
        .insert({ name: input.name.trim(), rating: input.rating, body: input.body.trim(), approved: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

/* ---------------- site_content ---------------- */
export function useSiteContent() {
  return useQuery({
    queryKey: ["site_content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("key,value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value ?? "";
      return map;
    },
  });
}

export function useContent(key: string, fallback = "") {
  const { data } = useSiteContent();
  return data?.[key] ?? fallback;
}

/* ---------------- settings ---------------- */
export type Settings = {
  whatsapp_number: string;
  instagram_handle: string;
  community_link: string | null;
};

export function useSettings() {
  return useQuery({
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
  });
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
      return data as { admin_email: string | null; admin_user_id: string | null; claimed_at: string | null } | null;
    },
  });
}
