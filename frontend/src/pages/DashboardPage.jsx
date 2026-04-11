import { usePortfolio } from "@/hooks/usePortfolio";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/common/StatCard";
import RiskGauge from "@/components/common/RiskGauge";
import HoldingsTable from "@/components/dashboard/HoldingsTable";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import AllocationPie from "@/components/dashboard/AllocationPie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { portfolio, loading } = usePortfolio();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Portfolio Value"
          value={portfolio?.total_value || 0}
          change={portfolio?.pnl_pct}
        />
        <StatCard
          label="Cash Balance"
          value={portfolio?.cash || 0}
        />
        <StatCard
          label="Total P&L"
          value={portfolio?.total_pnl || 0}
          change={portfolio?.pnl_pct}
        />
        <StatCard
          label="Holdings"
          value={portfolio?.holdings?.length || 0}
          prefix=""
          isMoney={false}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <PortfolioChart holdings={portfolio?.holdings || []} />
        </div>
        <div className="space-y-4">
          <AllocationPie sectors={portfolio?.sector_breakdown || []} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Risk Score</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <RiskGauge score={portfolio?.risk_score || 0} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Holdings table */}
      <HoldingsTable holdings={portfolio?.holdings || []} />
    </div>
  );
}
