const exactPublicPaths = new Set([
  "/",
  "/login",
  "/agencias",
  "/imobiliarias",
  "/como-funciona",
  "/precos",
  "/privacidade",
  "/termos",
  "/exclusao-de-dados",
  "/api/health",
]);

const publicPathPrefixes = [
  "/auth/",
  "/book/",
  "/capture/",
  "/api/public/",
  "/api/webhooks/",
  "/api/cron/",
];

export function isPublicPath(pathname: string) {
  return (
    exactPublicPaths.has(pathname) ||
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
