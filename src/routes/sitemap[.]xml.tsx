import { createFileRoute } from "@tanstack/react-router";
import { buildAppUrl } from "@/lib/seo";

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lastModified = new Date().toISOString();
        const urls = [
          { loc: buildAppUrl("/", request.url), changefreq: "daily", priority: "1.0" },
          { loc: buildAppUrl("/signup", request.url), changefreq: "weekly", priority: "0.9" },
        ];

        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (url) =>
              [
                "  <url>",
                `    <loc>${xmlEscape(url.loc)}</loc>`,
                `    <lastmod>${lastModified}</lastmod>`,
                `    <changefreq>${url.changefreq}</changefreq>`,
                `    <priority>${url.priority}</priority>`,
                "  </url>",
              ].join("\n"),
          ),
          "</urlset>",
        ].join("\n");

        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});