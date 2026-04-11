import { useState, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import AllocationPie from "@/components/dashboard/AllocationPie";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Percent, ArrowDownRight, Repeat } from "lucide-react";
import client from "@/api/client";

// Compute portfolio analytics from holdings and transaction data
function computeAnalytics(portfolio, transactions) {
  const holdings = portfolio?.holdings || [];
  const totalValue = portfolio?.total_value || 0;
  const cash = portfolio?.cash || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const initialInvestment = totalValue - totalPnl;

  // ROI
  const roi = initialInvestment > 0 ? (totalPnl / initialInvestment) * 100 : 0;

  // Total Returns (same as pnl_pct)
  const totalReturns = portfolio?.pnl_pct || 0;

  // Win Rate from transactions
  const trades = transactions || [];
  const sellTrades = trades.filter((t) => t.type === "SELL");
  const winningTrades = sellTrades.filter((t) => (t.total || 0) > 0);
  const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;

  // Profit Factor
  const grossProfits = sellTrades.reduce((sum, t) => sum + (t.total > 0 ? t.total : 0), 0);
  const grossLosses = Math.abs(sellTrades.reduce((sum, t) => sum + (t.total < 0 ? t.total : 0), 0));
  const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : grossProfits > 0 ? Infinity : 0;

  // Simulated metrics (would need historical price data for true values)
  const holdingReturns = holdings.map((h) => h.pnl_pct || 0);
  const avgReturn = holdingReturns.length > 0 ? holdingReturns.reduce((a, b) => a + b, 0) / holdingReturns.length : 0;
  const variance = holdingReturns.length > 0
    ? holdingReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / holdingReturns.length
    : 0;
  const volatility = Math.sqrt(variance);

  // Sharpe Ratio (simplified: using risk-free rate of 4%)
  const riskFreeRate = 4.0;
  const sharpeRatio = volatility > 0 ? (totalReturns - riskFreeRate) / volatility : 0;

  // Max Drawdown (simplified from holdings data)
  const maxDrawdown = holdingReturns.length > 0
    ? Math.abs(Math.min(...holdingReturns, 0))
    : 0;

  // Turnover (total trades / holdings count)
  const turnover = holdings.length > 0 ? trades.length / holdings.length : 0;

  return {
    totalValue,
    cash,
    totalPnl,
    roi,
    totalReturns,
    sharpeRatio,
    maxDrawdown,
    volatility,
    winRate,
    profitFactor,
    turnover,
    holdingsCount: holdings.length,
    tradesCount: trades.length,
  };
}

function MetricCard({ label, value, suffix = "", icon: Icon, trend, description }) {
  const isPositive = typeof trend === "number" ? trend >= 0 : null;

  return (
    <div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="flex items-center justify-center w-7 h-7 rounded-sm bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold mono text-foreground">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {isPositive !== null && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs mono font-medium", isPositive ? "text-profit" : "text-loss")}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}{typeof trend === "number" ? trend.toFixed(2) : trend}%
        </div>
      )}
      {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

function TradeStatsRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm mono font-semibold", accent || "text-foreground")}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { portfolio, loading } = usePortfolio();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    client.get("/transactions?limit=500")
      .then(({ data }) => setTransactions(data.transactions || []))
      .catch(console.error);
  }, []);

  const analytics = computeAnalytics(portfolio, transactions);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center h-10 px-4 border-b border-border bg-sidebar shrink-0">
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading portfolio data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-10 px-4 border-b border-border bg-sidebar shrink-0">
        <span className="text-sm font-semibold">Portfolio Dashboard</span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground mr-1">Net Worth:</span>
            <span className="mono font-semibold text-foreground">
              ${analytics.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground mr-1">Cash:</span>
            <span className="mono font-semibold text-foreground">
              ${analytics.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tier 1: Header Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Returns"
            value={`${analytics.totalReturns >= 0 ? "+" : ""}${analytics.totalReturns.toFixed(2)}%`}
            icon={TrendingUp}
            trend={analytics.totalReturns}
            description="Cumulative gain/loss"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={analytics.sharpeRatio.toFixed(2)}
            icon={Activity}
            description={analytics.sharpeRatio > 2 ? "Excellent risk-adjusted return" : analytics.sharpeRatio > 1 ? "Good risk-adjusted return" : "Below average"}
          />
          <MetricCard
            label="Max Drawdown"
            value={`-${analytics.maxDrawdown.toFixed(2)}%`}
            icon={ArrowDownRight}
            description="Largest peak-to-valley drop"
          />
          <MetricCard
            label="ROI"
            value={`${analytics.roi >= 0 ? "+" : ""}${analytics.roi.toFixed(2)}%`}
            icon={Target}
            trend={analytics.roi}
            description="Return on investment"
          />
        </div>

        {/* Main Chart + Risk Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Equity Curve (Portfolio Chart) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Portfolio Value by Asset
              </span>
            </div>
            <div className="p-2">
              <PortfolioChart holdings={portfolio?.holdings || []} />
            </div>
          </div>

          {/* Risk Panel */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Risk Metrics
              </span>
            </div>
            <div>
              <TradeStatsRow
                label="Volatility"
                value={`${analytics.volatility.toFixed(2)}%`}
              />
              <TradeStatsRow
                label="Sharpe Ratio"
                value={analytics.sharpeRatio.toFixed(2)}
                accent={analytics.sharpeRatio > 1 ? "text-profit" : "text-loss"}
              />
              <TradeStatsRow
                label="Max Drawdown"
                value={`-${analytics.maxDrawdown.toFixed(2)}%`}
                accent="text-loss"
              />
              <TradeStatsRow
                label="Total P&L"
                value={`$${analytics.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                accent={analytics.totalPnl >= 0 ? "text-profit" : "text-loss"}
              />
              <TradeStatsRow
                label="Holdings"
                value={analytics.holdingsCount.toString()}
              />
              <TradeStatsRow
                label="Cash Balance"
                value={`$${analytics.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
            </div>
          </div>
        </div>

        {/* Allocation + Trade Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Allocation Pie */}
          <div className="lg:col-span-2 bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sector Allocation
              </span>
            </div>
            <div className="p-2">
              <AllocationPie sectors={portfolio?.sector_breakdown || []} />
            </div>
          </div>

          {/* Trade Statistics */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trade Statistics
              </span>
            </div>
            <div>
              <TradeStatsRow
                label="Win Rate"
                value={`${analytics.winRate.toFixed(1)}%`}
                accent={analytics.winRate > 50 ? "text-profit" : "text-loss"}
              />
              <TradeStatsRow
                label="Profit Factor"
                value={analytics.profitFactor === Infinity ? "--" : analytics.profitFactor.toFixed(2)}
                accent={analytics.profitFactor > 1.5 ? "text-profit" : "text-loss"}
              />
              <TradeStatsRow
                label="Turnover"
                value={analytics.turnover.toFixed(2)}
              />
              <TradeStatsRow
                label="Total Trades"
                value={analytics.tradesCount.toString()}
              />
              <TradeStatsRow
                label="Profitable"
                value={`${analytics.winRate.toFixed(0)}%`}
                accent={analytics.winRate > 50 ? "text-profit" : "text-loss"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
