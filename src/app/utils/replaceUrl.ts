// Updates the URL without a server round trip. Next.js keeps useSearchParams in
// sync with native history calls, unlike router.replace, which re-renders the
// server page and re-runs its queries.
export function replaceUrl(url: string) {
  if (typeof window === "undefined") return;
  const current = window.location.pathname + window.location.search;
  if (current === url) return;
  window.history.replaceState(window.history.state, "", url);
}
