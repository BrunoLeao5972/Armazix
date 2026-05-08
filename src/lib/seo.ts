import { getAppBaseUrl } from "./env";

export function resolveAppOrigin(requestUrl?: string) {
  try {
    const configuredBaseUrl = getAppBaseUrl();
    if (configuredBaseUrl) {
      return new URL(configuredBaseUrl).origin;
    }
  } catch {
    // Fallback se getAppBaseUrl falhar
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}

export function buildAppUrl(path: string, requestUrl?: string) {
  return new URL(path, resolveAppOrigin(requestUrl)).toString();
}