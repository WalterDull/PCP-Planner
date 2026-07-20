import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing under /dashboard, /plans, or /api should ever be indexed —
        // it's private, per-user facility/food-safety data behind auth, not
        // public content search engines should crawl or cache.
        disallow: ["/dashboard", "/plans", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
