// Central SEO constants. Set NEXT_PUBLIC_SITE_URL in your environment once
// the subdomain is live (e.g. https://pcp.ftcinternational.com) — every
// piece of metadata, the sitemap, robots.txt, and the JSON-LD structured
// data below all derive from this single value, so there's one place to
// update if the domain ever changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pcp.ftcinternational.com").replace(/\/$/, "");

export const SITE_NAME = "PCP Planner by FTC International";

export const SITE_TITLE = "PCP Planner by FTC International — Preventive Control Plan Builder";

export const SITE_DESCRIPTION =
  "Build a CFIA-aligned Preventive Control Plan for your Canadian food facility: GMPs, per-product hazard analysis, CCP determination, recall planning, and an audit-ready export — all in one guided wizard from FTC International.";

export const SITE_KEYWORDS = [
  "Preventive Control Plan",
  "PCP builder",
  "CFIA",
  "Safe Food for Canadians Regulations",
  "SFCR",
  "hazard analysis",
  "HACCP",
  "critical control point",
  "CCP determination",
  "food safety plan",
  "GMP food facility",
  "food recall plan",
  "FTC International",
];
