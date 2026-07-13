// Defaults; overridden at runtime by the `settings` row from Supabase.
export const WHATSAPP_NUMBER = "923228408507"; // 0322 8408507 in international form
export const WHATSAPP_COMMUNITY_URL = ""; // empty = hidden until admin sets one
export const INSTAGRAM_URL = "https://instagram.com/theperfumesouq.pk";
export const INSTAGRAM_HANDLE = "@theperfumesouq.pk";
export const CONTACT_PHONE_DISPLAY = "0322 8408507";
export const CONTACT_PHONE_TEL = "+923228408507";

// wa.me requires the full international number (country code, no leading 0,
// no +, no spaces). Pakistani mobile numbers are commonly entered in local
// form (0XXXXXXXXXX, 11 digits) — normalize that case so a stored/typed
// local-format number doesn't silently produce a dead WhatsApp link.
export function normalizeWhatsAppNumber(number: string): string {
  const digits = (number || "").replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return "92" + digits.slice(1);
  }
  return digits;
}

export function waLink(number: string, message: string) {
  const clean = normalizeWhatsAppNumber(number);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
