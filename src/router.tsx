import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Server rendering: route loaders fill this request's query cache, the
    // cache travels to the browser with the HTML and is restored before the
    // app hydrates. Search engines (and customers) get real products, prices
    // and links in the first response instead of "Loading…".
    dehydrate: () => ({ queryState: dehydrate(queryClient) as unknown as Record<string, never> }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, (dehydrated as unknown as { queryState: DehydratedState }).queryState);
    },
  });

  return router;
};
