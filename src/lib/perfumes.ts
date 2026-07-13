// Legacy static catalog kept ONLY as a fallback for the quiz/comparison components.
// The live site reads perfumes from Supabase via src/lib/api/queries.ts.
import p1 from "@/assets/perfume-1.png";
import p3 from "@/assets/perfume-3.png";
import p5 from "@/assets/perfume-5.png";

export type Family = "Oriental & Amber" | "Floral";
export type Gender = "Masculine" | "Feminine" | "Unisex";
export type Mood = "Daily" | "Special";
export type Profile = "Fresh" | "Sweet" | "Smoky" | "Floral";

export interface Perfume {
  id: string; img: string; name: string; note: string; price: number;
  family: Family; gender: Gender; mood: Mood; profile: Profile;
  bestSeller?: boolean; spotlight?: boolean;
  notes: { top: string[]; heart: string[]; base: string[] };
  longevity: number; sillage: number; season: string; occasion: string;
}

export const PERFUMES: Perfume[] = [
  { id: "p1", img: p1, name: "Nuit d'Obsidienne", price: 38500, family: "Oriental & Amber",
    note: "Midnight amber. Raw silk. A whisper of smoke.",
    gender: "Unisex", mood: "Special", profile: "Smoky", bestSeller: true,
    notes: { top: ["Black Pepper", "Bergamot"], heart: ["Iris", "Saffron"], base: ["Amber", "Oud", "Vanilla"] },
    longevity: 9, sillage: 8, season: "Autumn / Winter", occasion: "Evening" },
  { id: "p5", img: p5, name: "Sang Royal", price: 62000, family: "Oriental & Amber",
    note: "Bordeaux velvet. Tobacco flower. Old wood.",
    gender: "Masculine", mood: "Special", profile: "Smoky", spotlight: true, bestSeller: true,
    notes: { top: ["Cognac", "Saffron"], heart: ["Tobacco Flower", "Black Rose"], base: ["Oud", "Cedar", "Amber"] },
    longevity: 10, sillage: 9, season: "Autumn / Winter", occasion: "Statement" },
  { id: "p3", img: p3, name: "Rose Femme", price: 29500, family: "Floral",
    note: "Damascena petal pressed against black leather.",
    gender: "Feminine", mood: "Special", profile: "Floral", bestSeller: true,
    notes: { top: ["Pink Pepper", "Lychee"], heart: ["Damask Rose", "Peony"], base: ["Leather", "Patchouli", "Musk"] },
    longevity: 8, sillage: 7, season: "Spring / Autumn", occasion: "Romantic" },
];

export const FAMILIES: Family[] = ["Floral", "Oriental & Amber"];
