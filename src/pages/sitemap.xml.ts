import type { APIRoute } from "astro";
import { entries, entryUrl } from "../content/docs";

// Public, crawlable pages only. /connect/ and /pay/ are one-time authorization flows and stay out.
const paths = ["/", "/onboarding/", "/pitch/", "/docs/", "/docs/help/", ...entries.map(entryUrl)];

export const GET: APIRoute = ({ site }) => {
  const urls = paths.map((path) => `<url><loc>${new URL(path, site).href}</loc></url>`).join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`,
    { headers: { "content-type": "application/xml" } },
  );
};
