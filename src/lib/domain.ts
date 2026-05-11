const PLATFORM_DOMAIN = "armazix.com.br";
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "app"]);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function getStoreSlugFromHostname(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  const suffix = `.${PLATFORM_DOMAIN}`;

  if (!host.endsWith(suffix)) return null;

  const subdomain = host.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

export function getStoreSlugFromWindowHost(): string | null {
  if (typeof window === "undefined") return null;
  return getStoreSlugFromHostname(window.location.hostname);
}

export function getPublicStoreUrl(slug: string): string {
  if (typeof window === "undefined") {
    return `https://${slug}.${PLATFORM_DOMAIN}`;
  }

  const { protocol, hostname, port } = window.location;
  const host = normalizeHostname(hostname);
  const hasPort = port ? `:${port}` : "";

  if (
    host === PLATFORM_DOMAIN ||
    host === `www.${PLATFORM_DOMAIN}` ||
    getStoreSlugFromHostname(host)
  ) {
    return `${protocol}//${host}${hasPort}/loja/${slug}`;
  }

  if (LOCAL_HOSTS.has(host)) {
    return `${protocol}//${host}${hasPort}/loja/${slug}`;
  }

  return `${protocol}//${host}${hasPort}/loja/${slug}`;
}
