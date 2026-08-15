const exactPublicPaths = new Set([
  "/",
  "/login",
  "/agencias",
  "/imobiliarias",
  "/como-funciona",
  "/precos",
  "/api/health",
]);

const publicPathPrefixes = ["/auth/", "/book/", "/api/webhooks/"];

export function isPublicPath(pathname: string) {
  return (
    exactPublicPaths.has(pathname) ||
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
