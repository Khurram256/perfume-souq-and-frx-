#!/usr/bin/env node
// Perfume Souq catalogue import.
//
//   npm run seed:catalog              import + verify
//   npm run seed:catalog -- --dry-run validate the data only, write nothing
//   npm run seed:catalog -- --verify  verify what is already in the database
//
// Safe to run repeatedly:
//   - products are matched on slug (never duplicated); variants on
//     (perfume, size)
//   - image_url / image_status are NEVER written, so images uploaded later
//     through the admin panel survive a re-run
//   - on an existing product, status / needs_confirmation are left alone, and
//     on an existing variant in_stock / stock_quantity are left alone, so
//     decisions made in the admin panel (publishing a draft, marking a size
//     out of stock) are not undone
//   - nothing is ever deleted
//   - catalogue prices, sizes and fragrance data ARE re-applied, on purpose:
//     the master inventory is the source of truth for those
//
// Uses the service-role key from the environment, so it must only ever run
// on a trusted machine (it is never bundled into the site).

import { createClient } from "@supabase/supabase-js";
import { BRANDS, CATALOG } from "./catalog/catalog-data.mjs";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const VERIFY_ONLY = args.has("--verify");

/* ------------------------------ helpers ------------------------------ */

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const splitList = (s) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const GENDER = { M: "men", W: "women", U: "unisex" };
const TAG_GENDER = { men: "masculine", women: "feminine", unisex: "unisex" };

function parseSizes(spec) {
  return spec.split(",").map((part) => {
    const m = part.trim().match(/^(\d+)\s*ml\s*=\s*(\d+)$/i);
    if (!m) throw new Error(`Bad size spec "${part}"`);
    return { size_ml: Number(m[1]), size_label: `${m[1]}ml`, price_pkr: Number(m[2]) };
  }).sort((a, b) => a.size_ml - b.size_ml);
}

// The storefront's broad collection tabs (Floral / Oriental & Amber / ...)
// are driven by categories, while `family` keeps the exact fragrance family.
// This maps the exact family onto the nearest broad collection so imported
// perfumes appear under the right tab too.
function categorySlugFor(family, accords) {
  const f = (family ?? "").toLowerCase();
  if (f.includes("gourmand")) return "gourmand";
  if (f.includes("fougere")) return "fougere";
  if (f.includes("vanilla")) return "oriental-vanilla";
  if (f.includes("oriental") || f.includes("amber")) return "oriental-amber";
  if (f.startsWith("floral") || f.startsWith("chypre floral")) return "floral";
  if (f) return "woody-aromatic";
  return accords.some((a) => a.includes("floral")) ? "floral" : "woody-aromatic";
}

function slugFor(entry) {
  if (entry.slug) return entry.slug;
  const brand = BRANDS[entry.brand];
  const prefix = brand.prefix ?? brand.slug ?? slugify(brand.name);
  const nameSlug = slugify(entry.name);
  return nameSlug === prefix || nameSlug.startsWith(prefix + "-") ? nameSlug : `${prefix}-${nameSlug}`;
}

/* ------------------------- validation (no I/O) ------------------------ */

function buildRecords() {
  const problems = [];
  const seen = new Set();
  const records = CATALOG.map((e, index) => {
    if (!BRANDS[e.brand]) problems.push(`${e.name}: unknown brand key "${e.brand}"`);
    const slug = slugFor(e);
    if (seen.has(slug)) problems.push(`Duplicate slug "${slug}"`);
    seen.add(slug);
    const variants = parseSizes(e.sizes);
    const labels = variants.map((v) => v.size_label);
    if (new Set(labels).size !== labels.length) problems.push(`${e.name}: repeated size`);
    for (const v of variants) {
      if (!Number.isInteger(v.price_pkr) || v.price_pkr <= 0) problems.push(`${e.name}: bad price ${v.price_pkr}`);
    }
    const accords = splitList(e.accords);
    if (!accords.length) problems.push(`${e.name}: no accords`);
    if (!e.description) problems.push(`${e.name}: no description`);
    if (!GENDER[e.gender]) problems.push(`${e.name}: bad gender "${e.gender}"`);
    return {
      entry: e,
      index,
      slug,
      gender: GENDER[e.gender],
      accords,
      top: splitList(e.top),
      heart: splitList(e.heart),
      base: splitList(e.base),
      variants,
    };
  });
  return { records, problems };
}

/* ------------------------------ database ------------------------------ */

function connect() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env scripts/seed-catalog.mjs");
    process.exit(1);
  }
  // New-format sb_secret_ keys are opaque, not JWTs: they must go in the
  // apikey header only (same handling as src/integrations/supabase/client.server.ts).
  const isOpaque = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isOpaque && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

async function ensureColumns(db) {
  const a = await db.from("perfumes").select("launch_year,perfumer").limit(1);
  const b = await db.from("product_variants").select("size_ml").limit(1);
  if (a.error || b.error) {
    throw new Error(
      "The fragrance-attributes migration has not been applied " +
        "(supabase/migrations/20260921000000_fragrance_attributes.sql). " + (a.error?.message ?? b.error?.message),
    );
  }
}

async function upsertBrands(db) {
  const existing = must(await db.from("brands").select("id,name,slug"), "read brands");
  const bySlug = new Map(existing.map((b) => [b.slug, b]));
  const byName = new Map(existing.map((b) => [b.name.toLowerCase(), b]));
  const ids = {};
  let created = 0;
  for (const [key, b] of Object.entries(BRANDS)) {
    const slug = b.slug ?? slugify(b.name);
    const found = bySlug.get(slug) ?? byName.get(b.name.toLowerCase());
    if (found) {
      ids[key] = found.id;
      continue;
    }
    const row = must(await db.from("brands").insert({ name: b.name, slug }).select("id").single(), `create brand ${b.name}`);
    ids[key] = row.id;
    created++;
  }
  return { ids, created, reused: Object.keys(BRANDS).length - created };
}

async function importCatalog(db, records) {
  await ensureColumns(db);
  const { ids: brandIds, created: brandsCreated, reused: brandsReused } = await upsertBrands(db);

  const cats = must(await db.from("categories").select("id,slug"), "read categories");
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  const existing = must(await db.from("perfumes").select("id,slug").in("slug", records.map((r) => r.slug)), "read perfumes");
  const existingSlugs = new Set(existing.map((p) => p.slug));

  const baseRow = (r) => {
    const e = r.entry;
    return {
      slug: r.slug,
      name: e.name,
      brand_id: brandIds[e.brand],
      category_id: catId.get(categorySlugFor(e.family, r.accords)) ?? null,
      family: e.family,
      concentration: e.concentration ?? null,
      gender: r.gender,
      tag_gender: TAG_GENDER[r.gender],
      price_pkr: Math.min(...r.variants.map((v) => v.price_pkr)),
      description: e.description,
      top_notes: r.top,
      heart_notes: r.heart,
      base_notes: r.base,
      main_accords: r.accords,
      launch_year: e.year,
      perfumer: e.perfumer,
      in_stock: true,
      sort_order: r.index,
    };
  };
  // Fields that only apply the first time a product is created, so a re-run
  // never overrides an admin's later decision.
  const firstTime = (r) => ({
    status: r.entry.draft ? "draft" : "published",
    needs_confirmation: !!r.entry.draft,
    source_notes: r.entry.draft
      ? "Fragrance data was supplied without a verified source. Confirm family, year, notes and accords before publishing."
      : null,
  });

  const fresh = records.filter((r) => !existingSlugs.has(r.slug)).map((r) => ({ ...baseRow(r), ...firstTime(r) }));
  const known = records.filter((r) => existingSlugs.has(r.slug)).map(baseRow);
  if (fresh.length) must(await db.from("perfumes").insert(fresh), "insert perfumes");
  if (known.length) must(await db.from("perfumes").upsert(known, { onConflict: "slug" }), "update perfumes");

  const all = must(await db.from("perfumes").select("id,slug").in("slug", records.map((r) => r.slug)), "re-read perfumes");
  const idBySlug = new Map(all.map((p) => [p.slug, p.id]));

  const existingVariants = must(
    await db.from("product_variants").select("id,perfume_id,size_label").in("perfume_id", [...idBySlug.values()]),
    "read variants",
  );
  const variantKey = (pid, label) => `${pid}|${label}`;
  const existingByKey = new Map(existingVariants.map((v) => [variantKey(v.perfume_id, v.size_label), v.id]));

  const newVariants = [];
  const updates = [];
  for (const r of records) {
    const perfume_id = idBySlug.get(r.slug);
    const single = r.variants.length === 1;
    r.variants.forEach((v, i) => {
      const common = {
        size_ml: v.size_ml,
        price_pkr: v.price_pkr,
        // A lone size is simply the product. With several sizes there is no
        // default: the product page requires an explicit choice.
        is_default: single,
        sort_order: i,
      };
      const id = existingByKey.get(variantKey(perfume_id, v.size_label));
      if (id) updates.push({ id, ...common });
      else newVariants.push({ perfume_id, size_label: v.size_label, in_stock: true, ...common });
    });
  }
  if (newVariants.length) must(await db.from("product_variants").insert(newVariants), "insert variants");
  for (const u of updates) {
    const { id, ...patch } = u;
    must(await db.from("product_variants").update(patch).eq("id", id), "update variant");
  }

  return {
    productsCreated: fresh.length,
    productsUpdated: known.length,
    variantsCreated: newVariants.length,
    variantsUpdated: updates.length,
    brandsCreated,
    brandsReused,
  };
}

/* ------------------------------ verification ------------------------------ */

async function verify(db, records) {
  const failures = [];
  const check = (ok, msg) => {
    if (!ok) failures.push(msg);
  };

  const slugs = records.map((r) => r.slug);
  const perfumes = must(
    await db
      .from("perfumes")
      .select("id,slug,name,status,image_url,launch_year,gender,top_notes,heart_notes,base_notes,main_accords,brand:brands(name)")
      .in("slug", slugs),
    "verify perfumes",
  );
  const variants = must(
    await db.from("product_variants").select("perfume_id,size_label,size_ml,price_pkr").in("perfume_id", perfumes.map((p) => p.id)),
    "verify variants",
  );
  const bySlug = new Map(perfumes.map((p) => [p.slug, p]));
  const variantsOf = (slug) => variants.filter((v) => v.perfume_id === bySlug.get(slug)?.id);

  check(perfumes.length === records.length, `expected ${records.length} products, found ${perfumes.length}`);
  const expectedVariants = records.reduce((n, r) => n + r.variants.length, 0);
  check(variants.length === expectedVariants, `expected ${expectedVariants} variants, found ${variants.length}`);

  // Every stored price/size must equal the catalogue exactly.
  for (const r of records) {
    const stored = variantsOf(r.slug);
    for (const v of r.variants) {
      const hit = stored.find((s) => s.size_label === v.size_label);
      check(hit && hit.price_pkr === v.price_pkr && hit.size_ml === v.size_ml, `${r.entry.name} ${v.size_label}: price/size mismatch`);
    }
    const p = bySlug.get(r.slug);
    check(p?.main_accords?.length === r.accords.length, `${r.entry.name}: accords not stored as array`);
    check(p?.launch_year === r.entry.year, `${r.entry.name}: launch year`);
    check(!p?.image_url, `${r.entry.name}: an image is set (import must not add images)`);
  }

  // Name-level duplicates (same brand + same name).
  const nameKeys = perfumes.map((p) => `${p.brand?.name}|${p.name}`.toLowerCase());
  check(new Set(nameKeys).size === nameKeys.length, "duplicate brand+name products found");

  // The owner's explicit acceptance list.
  const priceOf = (slug, label) => variantsOf(slug).find((v) => v.size_label === label)?.price_pkr;
  const expect = (slug, label, price) => check(priceOf(slug, label) === price, `${slug} ${label} should be ${price}, is ${priceOf(slug, label)}`);
  expect("kilian-angels-share", "50ml", 60000);
  expect("kilian-angels-share", "100ml", 95000);
  expect("louis-vuitton-imagination", "100ml", 130000);
  expect("louis-vuitton-imagination", "200ml", 190000);
  expect("louis-vuitton-ombre-nomade", "100ml", 150000);
  expect("louis-vuitton-ombre-nomade", "200ml", 235000);
  expect("nishane-hacivat", "50ml", 40000);
  expect("nishane-hacivat", "100ml", 65000);
  expect("nishane-hundred-silent-ways", "50ml", 40000);
  expect("nishane-hundred-silent-ways", "100ml", 65000);
  expect("nishane-ani", "50ml", 40000);
  expect("nishane-ani", "100ml", 65000);
  expect("nishane-hundred-silent-ways-x", "15ml", 20000);
  expect("nishane-hundred-silent-ways-x", "100ml", 80000);
  expect("amouage-purpose", "50ml", 150000);
  expect("amouage-purpose", "100ml", 90000);
  expect("lattafa-khamrah", "100ml", 7500);
  expect("tom-ford-tobacco-vanille", "100ml", 88000);
  expect("maison-francis-kurkdjian-baccarat-rouge-540", "70ml", 90000);
  expect("maison-francis-kurkdjian-baccarat-rouge-540-extrait", "70ml", 120000);
  check(bySlug.has("amouage-interlude") && bySlug.has("amouage-interlude-black-iris"), "Interlude and Interlude Black Iris must be separate products");
  check(bySlug.get("initio-psychedelic-love")?.name === "Psychedelic Love", "Psychedelic Love name");
  check(bySlug.get("khadlaj-shiyaaka-snow")?.name === "Shiyaaka Snow", "Shiyaaka Snow name");
  check(bySlug.get("afnan-supremacy-collectors-edition")?.name === "Supremacy Collector's Edition Pour Homme", "Supremacy name");
  check(bySlug.get("afnan-9-pm-night-out")?.name === "9 PM Night Out", "9 PM Night Out name");

  return {
    failures,
    products: perfumes.length,
    variants: variants.length,
    multiSize: records.filter((r) => r.variants.length > 1).map((r) => r.entry.name),
    published: perfumes.filter((p) => p.status === "published").length,
    drafts: perfumes.filter((p) => p.status === "draft").map((p) => p.name),
  };
}

/* -------------------------------- main -------------------------------- */

const { records, problems } = buildRecords();
if (problems.length) {
  console.error("Catalogue data problems:\n - " + problems.join("\n - "));
  process.exit(1);
}
const totalVariants = records.reduce((n, r) => n + r.variants.length, 0);
console.log(`Catalogue parsed OK: ${records.length} products, ${totalVariants} variants, ${Object.keys(BRANDS).length} brands.`);

if (DRY_RUN) {
  console.log("--dry-run: nothing written.");
  process.exit(0);
}

const db = connect();
try {
  if (!VERIFY_ONLY) {
    const result = await importCatalog(db, records);
    console.log("Import:", result);
  }
  const report = await verify(db, records);
  console.log("\nVerification:");
  console.log(`  products in database : ${report.products}`);
  console.log(`  variants in database : ${report.variants}`);
  console.log(`  published / draft    : ${report.published} / ${report.drafts.length}${report.drafts.length ? " (" + report.drafts.join(", ") + ")" : ""}`);
  console.log(`  multi-size products  : ${report.multiSize.length} (${report.multiSize.join(", ")})`);
  if (report.failures.length) {
    console.error("\nFAILURES:\n - " + report.failures.join("\n - "));
    process.exit(2);
  }
  console.log("  all checks passed.");
} catch (err) {
  console.error("Import failed:", err.message);
  process.exit(1);
}
