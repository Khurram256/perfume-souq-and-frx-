import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveVariantPrice, isPromotionLiveNow, type Promotion } from "@/lib/pricing";

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

const inputSchema = z.object({
  phone: z.string().min(6).max(40),
  name: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  sessionId: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1).max(50),
});

// wa.me needs international format (country code, no +, no leading 0).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "92" + digits.slice(1); // local PK -> intl
  return digits;
}

function makeOrderRef(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `TPS-${ymd}-${suffix}`;
}

export type RecordedOrderLine = {
  perfumeId: string;
  variantId: string;
  name: string;
  sizeLabel: string;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  lineTotal: number;
  promotionName: string | null;
};

// Public checkout action. Recomputes every price server-side from the live
// catalogue + active promotions (client-sent prices are ignored), records a
// WhatsApp order INTENT with a unique reference, and returns the trusted
// totals for the message. Uses the service-role client — which never reaches
// the browser — to write the row (there is no public insert policy).
export const recordOrderIntent = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (phone.length < 10) throw new Error("Please enter a valid phone number.");

    const variantIds = [...new Set(data.items.map((i) => i.variantId))];
    const { data: variants, error: vErr } = await supabaseAdmin
      .from("product_variants")
      .select("id, size_label, price_pkr, in_stock, perfume:perfumes(id, name, brand_id, category_id)")
      .in("id", variantIds);
    if (vErr) throw new Error(vErr.message);

    const { data: promoRows, error: pErr } = await supabaseAdmin
      .from("promotions")
      .select("*, targets:promotion_targets(target_type,target_id)");
    if (pErr) throw new Error(pErr.message);
    const promotions = ((promoRows ?? []) as unknown as Promotion[]).filter(
      (p) => isPromotionLiveNow(p) && p.discount_type !== "bundle"
    );

    const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

    const lines: RecordedOrderLine[] = [];
    let subtotal = 0;
    let total = 0;
    const offerIds = new Set<string>();

    for (const item of data.items) {
      const v = variantById.get(item.variantId) as
        | { id: string; size_label: string; price_pkr: number; in_stock: boolean; perfume: { id: string; name: string; brand_id: string | null; category_id: string | null } | null }
        | undefined;
      if (!v || !v.perfume) throw new Error("One or more items are no longer available.");
      if (!v.in_stock) throw new Error(`"${v.perfume.name}" (${v.size_label}) is out of stock.`);

      const priced = resolveVariantPrice(v.price_pkr, promotions, {
        perfumeId: v.perfume.id,
        variantId: v.id,
        brandId: v.perfume.brand_id,
        categoryId: v.perfume.category_id,
      });
      priced.appliedPromotions.forEach((pr) => offerIds.add(pr.id));

      const lineTotal = priced.finalPrice * item.quantity;
      subtotal += priced.originalPrice * item.quantity;
      total += lineTotal;
      lines.push({
        perfumeId: v.perfume.id,
        variantId: v.id,
        name: v.perfume.name,
        sizeLabel: v.size_label,
        quantity: item.quantity,
        originalPrice: priced.originalPrice,
        finalPrice: priced.finalPrice,
        lineTotal,
        promotionName: priced.appliedPromotions[0]?.name ?? null,
      });
    }

    const discount = Math.max(0, subtotal - total);

    // Insert with a unique reference, retrying on the (rare) collision.
    let orderRef = "";
    let lastErr: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = makeOrderRef();
      const { error: insErr } = await supabaseAdmin.from("order_intents").insert({
        order_ref: candidate,
        customer_phone: phone,
        customer_name: data.name ?? null,
        note: data.note ?? null,
        items: lines as unknown as import("@/integrations/supabase/types").Json,
        subtotal_pkr: subtotal,
        discount_pkr: discount,
        total_pkr: total,
        offer_ids: [...offerIds],
        session_id: data.sessionId ?? null,
      });
      if (!insErr) {
        orderRef = candidate;
        break;
      }
      lastErr = insErr.message;
      if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message);
    }
    if (!orderRef) throw new Error(lastErr ?? "Could not create the order reference. Please try again.");

    return { orderRef, phone, lines, subtotal, discount, total };
  });
