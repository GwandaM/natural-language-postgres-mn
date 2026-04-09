import {
  Building2,
  DollarSign,
  Globe,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getDashboardInsights } from "@/app/actions";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { NarrativeSummary } from "@/components/dashboard/NarrativeSummary";
import { InsightChart } from "@/components/dashboard/InsightChart";
import { RankedList } from "@/components/dashboard/RankedList";
import { GeoDistribution } from "@/components/dashboard/GeoDistribution";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { FirstLoadTrigger } from "./FirstLoadTrigger";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { insights, generated_at } = await getDashboardInsights();

  // No data yet — show a trigger that fires the first generation in the browser
  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <FirstLoadTrigger />
      </div>
    );
  }

  const kpis = insights.kpis;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unicorn Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-generated insights from the CB Insights unicorn company dataset
          </p>
        </div>
        <RefreshButton generatedAt={generated_at} />
      </div>

      {/* AI Narrative */}
      <NarrativeSummary text={insights.narrative as unknown as string} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Companies"
          value={kpis.total_companies.toLocaleString()}
          icon={Building2}
        />
        <KpiCard
          label="Total Valuation"
          value={`$${kpis.total_valuation_b.toLocaleString()}B`}
          icon={DollarSign}
        />
        <KpiCard
          label="Avg Valuation"
          value={`$${kpis.avg_valuation_b}B`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Countries"
          value={kpis.total_countries.toLocaleString()}
          icon={Globe}
        />
        <KpiCard
          label="Industries"
          value={kpis.total_industries.toLocaleString()}
          icon={Layers}
        />
        <KpiCard
          label="Newest Unicorn"
          value={kpis.most_recent_company}
          sub={kpis.most_recent_date}
          icon={Zap}
        />
      </div>

      {/* Charts row 1: Industry breakdown + Year trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InsightChart
          title="Unicorns by Industry"
          caption={insights.top_industries.caption}
          data={insights.top_industries.data as unknown as Record<string, string | number>[]}
          xKey="industry"
          yKey="count"
          type="bar"
          xTickFormatter={(v) =>
            String(v).length > 14 ? String(v).slice(0, 13) + "…" : String(v)
          }
        />
        <InsightChart
          title="Unicorns Joined Per Year"
          caption={insights.unicorns_by_year.caption}
          data={insights.unicorns_by_year.data as unknown as Record<string, string | number>[]}
          xKey="year"
          yKey="count"
          type="line"
        />
      </div>

      {/* Charts row 2: Valuation by industry + Top countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InsightChart
          title="Average Valuation by Industry"
          caption={insights.valuation_by_industry.caption}
          data={insights.valuation_by_industry.data as unknown as Record<string, string | number>[]}
          xKey="industry"
          yKey="avg_valuation_b"
          type="bar"
          yTickFormatter={(v) => `$${Number(v).toFixed(1)}B`}
          xTickFormatter={(v) =>
            String(v).length > 14 ? String(v).slice(0, 13) + "…" : String(v)
          }
        />
        <InsightChart
          title="Top Countries by Count"
          caption={insights.top_countries.caption}
          data={insights.top_countries.data as unknown as Record<string, string | number>[]}
          xKey="country"
          yKey="count"
          type="bar"
          xTickFormatter={(v) =>
            String(v).length > 12 ? String(v).slice(0, 11) + "…" : String(v)
          }
        />
      </div>

      {/* Global Distribution (full width) */}
      <GeoDistribution
        data={insights.geo_distribution.data as unknown as import("@/lib/insights").GeoRow[]}
        caption={insights.geo_distribution.caption}
      />

      {/* Ranked lists row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RankedList
          title="Top Industries"
          caption={insights.top_industries.caption}
          items={(insights.top_industries.data as unknown as { industry: string; count: number }[]).map((r) => ({
            label: r.industry,
            value: r.count,
          }))}
        />
        <RankedList
          title="Top Cities"
          caption={insights.top_cities.caption}
          items={(insights.top_cities.data as unknown as { city: string; country: string; count: number }[]).map((r) => ({
            label: r.city,
            value: r.count,
            sub: r.country,
          }))}
        />
        <RankedList
          title="Top Investors"
          caption={insights.top_investors.caption}
          items={(insights.top_investors.data as unknown as { investor: string; count: number }[]).map((r) => ({
            label: r.investor,
            value: r.count,
          }))}
          valueLabel="unicorns"
        />
      </div>
    </div>
  );
}
