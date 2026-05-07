import { createFileRoute } from "@tanstack/react-router";
import { buildAppUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const sitemapUrl = buildAppUrl("/sitemap.xml", request.url);
        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          `Sitemap: ${sitemapUrl}`,
        ].join("\n");

        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});