const router = { replace: (path: string) => { document.body.dataset.destination = path; }, push: (path: string) => { document.body.dataset.destination = path; }, refresh: () => { document.body.dataset.refreshed = "true"; } };
export function useRouter() { return router; }
export function useSearchParams() { return new URLSearchParams(window.location.search); }
export function usePathname() { return window.location.pathname; }
