/**
 * Insight generation logic for the dashboard.
 *
 * TODO: When switching to a different database, update the SQL queries below
 * to match the new schema. The LLM prompts may also need updating if field
 * names or domain changes.
 */

import { sql } from "@vercel/postgres";
import { generateText } from "ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KpiData {
  total_companies: number;
  total_valuation_b: number;
  avg_valuation_b: number;
  total_countries: number;
  total_industries: number;
  most_recent_company: string;
  most_recent_date: string;
}

export interface IndustryRow {
  industry: string;
  count: number;
  total_valuation_b: number;
}

export interface CountryRow {
  country: string;
  count: number;
  total_valuation_b: number;
}

export interface CityRow {
  city: string;
  country: string;
  count: number;
}

export interface InvestorRow {
  investor: string;
  count: number;
}

export interface ValuationByIndustryRow {
  industry: string;
  avg_valuation_b: number;
}

export interface UnicornsByYearRow {
  year: number;
  count: number;
}

export interface GeoRow {
  country: string;
  count: number;
  pct: number;
}

export interface InsightPayload<T> {
  data: T;
  caption: string;
}

export interface DashboardInsights {
  kpis: KpiData;
  top_industries: InsightPayload<IndustryRow[]>;
  top_countries: InsightPayload<CountryRow[]>;
  top_cities: InsightPayload<CityRow[]>;
  top_investors: InsightPayload<InvestorRow[]>;
  valuation_by_industry: InsightPayload<ValuationByIndustryRow[]>;
  unicorns_by_year: InsightPayload<UnicornsByYearRow[]>;
  geo_distribution: InsightPayload<GeoRow[]>;
  narrative: string;
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

async function fetchKpis(): Promise<KpiData> {
  const result = await sql`
    SELECT
      COUNT(*)::int                        AS total_companies,
      ROUND(SUM(valuation)::numeric, 1)    AS total_valuation_b,
      ROUND(AVG(valuation)::numeric, 2)    AS avg_valuation_b,
      COUNT(DISTINCT country)::int         AS total_countries,
      COUNT(DISTINCT industry)::int        AS total_industries
    FROM unicorns;
  `;
  const recent = await sql`
    SELECT company, TO_CHAR(date_joined, 'Mon DD, YYYY') AS date_joined
    FROM unicorns
    ORDER BY date_joined DESC NULLS LAST
    LIMIT 1;
  `;
  const row = result.rows[0];
  return {
    total_companies: row.total_companies,
    total_valuation_b: parseFloat(row.total_valuation_b),
    avg_valuation_b: parseFloat(row.avg_valuation_b),
    total_countries: row.total_countries,
    total_industries: row.total_industries,
    most_recent_company: recent.rows[0]?.company ?? "N/A",
    most_recent_date: recent.rows[0]?.date_joined ?? "N/A",
  };
}

async function fetchTopIndustries(): Promise<IndustryRow[]> {
  const result = await sql`
    SELECT
      industry,
      COUNT(*)::int                        AS count,
      ROUND(SUM(valuation)::numeric, 1)    AS total_valuation_b
    FROM unicorns
    GROUP BY industry
    ORDER BY count DESC
    LIMIT 10;
  `;
  return result.rows.map((r) => ({
    industry: r.industry,
    count: r.count,
    total_valuation_b: parseFloat(r.total_valuation_b),
  }));
}

async function fetchTopCountries(): Promise<CountryRow[]> {
  const result = await sql`
    SELECT
      country,
      COUNT(*)::int                        AS count,
      ROUND(SUM(valuation)::numeric, 1)    AS total_valuation_b
    FROM unicorns
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10;
  `;
  return result.rows.map((r) => ({
    country: r.country,
    count: r.count,
    total_valuation_b: parseFloat(r.total_valuation_b),
  }));
}

async function fetchTopCities(): Promise<CityRow[]> {
  const result = await sql`
    SELECT
      city,
      country,
      COUNT(*)::int AS count
    FROM unicorns
    GROUP BY city, country
    ORDER BY count DESC
    LIMIT 10;
  `;
  return result.rows.map((r) => ({
    city: r.city,
    country: r.country,
    count: r.count,
  }));
}

async function fetchTopInvestors(): Promise<InvestorRow[]> {
  // select_investors is a comma-separated list — unnest and count
  const result = await sql`
    SELECT
      TRIM(investor) AS investor,
      COUNT(*)::int  AS count
    FROM unicorns,
      UNNEST(STRING_TO_ARRAY(select_investors, ',')) AS investor
    WHERE TRIM(investor) <> ''
    GROUP BY TRIM(investor)
    ORDER BY count DESC
    LIMIT 10;
  `;
  return result.rows.map((r) => ({
    investor: r.investor,
    count: r.count,
  }));
}

async function fetchValuationByIndustry(): Promise<ValuationByIndustryRow[]> {
  const result = await sql`
    SELECT
      industry,
      ROUND(AVG(valuation)::numeric, 2) AS avg_valuation_b
    FROM unicorns
    GROUP BY industry
    ORDER BY avg_valuation_b DESC;
  `;
  return result.rows.map((r) => ({
    industry: r.industry,
    avg_valuation_b: parseFloat(r.avg_valuation_b),
  }));
}

async function fetchUnicornsByYear(): Promise<UnicornsByYearRow[]> {
  const result = await sql`
    SELECT
      EXTRACT(YEAR FROM date_joined)::int AS year,
      COUNT(*)::int                       AS count
    FROM unicorns
    WHERE date_joined IS NOT NULL
    GROUP BY year
    ORDER BY year ASC;
  `;
  return result.rows.map((r) => ({ year: r.year, count: r.count }));
}

async function fetchGeoDistribution(): Promise<GeoRow[]> {
  const result = await sql`
    WITH totals AS (SELECT COUNT(*) AS grand_total FROM unicorns)
    SELECT
      u.country,
      COUNT(*)::int                                     AS count,
      ROUND((COUNT(*) * 100.0 / t.grand_total)::numeric, 1) AS pct
    FROM unicorns u, totals t
    GROUP BY u.country, t.grand_total
    ORDER BY count DESC
    LIMIT 20;
  `;
  return result.rows.map((r) => ({
    country: r.country,
    count: r.count,
    pct: parseFloat(r.pct),
  }));
}

// ---------------------------------------------------------------------------
// LLM caption helpers
// ---------------------------------------------------------------------------

async function generateCaption(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: "openai/gpt-5.4-mini",
    prompt,
    maxTokens: 120,
  });
  return text.trim();
}

// ---------------------------------------------------------------------------
// Main export: generate all insights
// ---------------------------------------------------------------------------

export async function generateAllInsights(): Promise<DashboardInsights> {
  // Run all SQL queries in parallel
  const [
    kpis,
    topIndustries,
    topCountries,
    topCities,
    topInvestors,
    valuationByIndustry,
    unicornsByYear,
    geoDistribution,
  ] = await Promise.all([
    fetchKpis(),
    fetchTopIndustries(),
    fetchTopCountries(),
    fetchTopCities(),
    fetchTopInvestors(),
    fetchValuationByIndustry(),
    fetchUnicornsByYear(),
    fetchGeoDistribution(),
  ]);

  // Generate LLM captions in parallel
  const [
    industriesCaption,
    countriesCaption,
    citiesCaption,
    investorsCaption,
    valuationCaption,
    yearCaption,
    geoCaption,
    narrative,
  ] = await Promise.all([
    generateCaption(
      `Given this data about unicorn companies by industry: ${JSON.stringify(topIndustries)}. Write one sentence explaining the most notable insight.`
    ),
    generateCaption(
      `Given this data about unicorn companies by country: ${JSON.stringify(topCountries)}. Write one sentence explaining the most notable insight.`
    ),
    generateCaption(
      `Given this data about unicorn companies by city: ${JSON.stringify(topCities)}. Write one sentence explaining the most notable insight.`
    ),
    generateCaption(
      `Given this data about the top investors backing unicorn companies: ${JSON.stringify(topInvestors)}. Write one sentence explaining the most notable insight.`
    ),
    generateCaption(
      `Given this data about average valuation by industry for unicorn companies: ${JSON.stringify(valuationByIndustry)}. Write one sentence explaining the most notable insight.`
    ),
    generateCaption(
      `Given this data about the number of unicorn companies joining each year: ${JSON.stringify(unicornsByYear)}. Write one sentence explaining the most notable trend.`
    ),
    generateCaption(
      `Given this global distribution of unicorn companies by country: ${JSON.stringify(geoDistribution)}. Write one sentence explaining the geographic concentration.`
    ),
    generateCaption(
      `You are a data analyst writing for an executive dashboard. Here is a summary of the unicorn company dataset: ${JSON.stringify({ kpis, topIndustries: topIndustries.slice(0, 5), topCountries: topCountries.slice(0, 5), recentTrend: unicornsByYear.slice(-5) })}. Write 3-4 sentences of key insights in plain English. Be specific with numbers.`
    ),
  ]);

  return {
    kpis,
    top_industries: { data: topIndustries, caption: industriesCaption },
    top_countries: { data: topCountries, caption: countriesCaption },
    top_cities: { data: topCities, caption: citiesCaption },
    top_investors: { data: topInvestors, caption: investorsCaption },
    valuation_by_industry: { data: valuationByIndustry, caption: valuationCaption },
    unicorns_by_year: { data: unicornsByYear, caption: yearCaption },
    geo_distribution: { data: geoDistribution, caption: geoCaption },
    narrative,
  };
}
