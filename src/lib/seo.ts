export function resolveAppOrigin(requestUrl?: string) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return new URL(configuredBaseUrl).origin;
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}

export function buildAppUrl(path: string, requestUrl?: string) {
  return new URL(path, resolveAppOrigin(requestUrl)).toString();
}