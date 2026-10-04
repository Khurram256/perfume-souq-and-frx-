import type { QueryClient } from "@tanstack/react-query";
import {
  allVariantsQuery,
  brandsQuery,
  categoriesQuery,
  perfumesQuery,
  promotionsQuery,
  settingsQuery,
  siteContentQuery,
  spotlightQuery,
} from "./queries";

// Loads the public catalogue into the query cache from a route loader, so the
// page is rendered on the server with real products, prices and links. Uses
// the very same query definitions as the hooks, so components need no changes.
//
// Every query is best-effort: if one fails the page still renders and that
// piece loads in the browser as it always did, rather than showing an error.
export async function prefetchCatalog(queryClient: QueryClient, opts: { spotlight?: boolean } = {}) {
  const safe = <T>(p: Promise<T>) => p.catch(() => undefined);
  const [perfumes, variants, brands] = await Promise.all([
    safe(queryClient.ensureQueryData(perfumesQuery)),
    safe(queryClient.ensureQueryData(allVariantsQuery)),
    safe(queryClient.ensureQueryData(brandsQuery)),
    safe(queryClient.ensureQueryData(promotionsQuery())),
    safe(queryClient.ensureQueryData(categoriesQuery)),
    safe(queryClient.ensureQueryData(siteContentQuery)),
    safe(queryClient.ensureQueryData(settingsQuery)),
    opts.spotlight ? safe(queryClient.ensureQueryData(spotlightQuery)) : undefined,
  ]);
  return { perfumes: perfumes ?? [], variants: variants ?? [], brands: brands ?? [] };
}
