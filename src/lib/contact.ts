// Defaults; overridden at runtime by the `settings` row from Supabase.
export const WHATSAPP_NUMBER = "923228408507"; // 0322 8408507 in international form
export const WHATSAPP_COMMUNITY_URL = ""; // empty = hidden until admin sets one
export const INSTAGRAM_URL = "https://instagram.com/theperfumesouq.pk";
export const INSTAGRAM_HANDLE = "@theperfumesouq.pk";
export const CONTACT_PHONE_DISPLAY = "0322 8408507";
export const CONTACT_PHONE_TEL = "+923228408507";

export function waLink(number: string, message: string) {
  const clean = (number || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
