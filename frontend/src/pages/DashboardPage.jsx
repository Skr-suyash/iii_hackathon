import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, Rectangle
} from "recharts";
import client from "@/api/client";
import { TrendingUp, Activity, TrendingDown, Target, ArrowDownRight } from "lucide-react";

// --- Analytics computation ---
function computeAnalytics(portfolio, transactions) {
  const holdings = portfolio?.holdings || [];
  const totalValue = portfolio?.total_value || 0;
  const cash = portfolio?.cash || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const initialInvestment = totalValue - totalPnl;
  const roi = initialInvestment > 0 ? (totalPnl / initialInvestment) * 100 : 0;
  const totalReturns = portfolio?.pnl_pct || 0;

  const trades = transactions || [];
  const sellTrades = trades.filter((t) => t.type === "SELL");
  const winningTrades = sellTrades.filter((t) => (t.total || 0) > 0);
  const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;

  const grossProfits = sellTrades.reduce((sum, t) => sum + (t.total > 0 ? t.total : 0), 0);
  const grossLosses = Math.abs(sellTrades.reduce((sum, t) => sum + (t.total < 0 ? t.total : 0), 0));
  const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : grossProfits > 0 ? Infinity : 0;

  const holdingReturns = holdings.map((h) => h.pnl_pct || 0);
  const avgReturn = holdingReturns.length > 0 ? holdingReturns.reduce((a, b) => a + b, 0) / holdingReturns.length : 0;
  const variance = holdingReturns.length > 0
    ? holdingReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / holdingReturns.length : 0;
  const volatility = Math.sqrt(variance);
  const riskFreeRate = 4.0;
  const sharpeRatio = volatility > 0 ? (totalReturns - riskFreeRate) / volatility : 0;
  const sortino = volatility > 0 ? (totalReturns - riskFreeRate) / (volatility * 0.7) : 0; // simplified
  const beta = 1.0 + (totalReturns / 100) * 0.3; // simplified
  const maxDrawdown = holdingReturns.length > 0 ? Math.abs(Math.min(...holdingReturns, 0)) : 0;
  const turnover = holdings.length > 0 ? trades.length / holdings.length : 0;

  const unrealizedGain = holdings.reduce((sum, h) => sum + (h.pnl || 0), 0);
  const realizedGain = totalPnl - unrealizedGain;

  return {
    totalValue, cash, totalPnl, roi, totalReturns, sharpeRatio, sortino, beta,
    maxDrawdown, volatility, winRate, profitFactor, turnover,
    holdingsCount: holdings.length, tradesCount: trades.length,
    unrealizedGain, realizedGain,
    unrealizedPct: initialInvestment > 0 ? (unrealizedGain / initialInvestment) * 100 : 0,
  };
}

// --- Stat Card matching screenshot 2 ---
function StatCard({ label, mainValue, trendPct, subLabel, icon: Icon, iconBg, valueColor }) {
  const isPositive = trendPct >= 0;
  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm p-4 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        {Icon && (
          <div className={cn("flex items-center justify-center w-6 h-6 rounded-sm", iconBg)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div>
        <p className={cn("text-2xl font-bold mono", valueColor || "text-foreground")}>{mainValue}</p>
        <div className="mt-1 flex items-center gap-2">
          {trendPct !== undefined && (
            <div className={cn("flex items-center text-xs font-semibold mono", isPositive ? "text-profit" : "text-loss")}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? "+" : ""}{trendPct.toFixed(2)}%
            </div>
          )}
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
      </div>
    </div>
  );
}

// --- Risk Metrics Table (matching screenshot 1 side panel) ---
function RiskMetricsTable({ analytics, portfolio }) {
  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Metrics</h2>
      </div>
      <div className="p-0">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Volatility</td>
              <td className="py-2.5 px-4 text-right mono font-semibold text-foreground">{analytics.volatility.toFixed(2)}%</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Beta</td>
              <td className="py-2.5 px-4 text-right mono font-semibold text-foreground">{analytics.beta.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Sharpe Ratio</td>
              <td className={cn("py-2.5 px-4 text-right mono font-semibold", analytics.sharpeRatio >= 0 ? "text-foreground" : "text-loss")}>
                {analytics.sharpeRatio.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Sortino Ratio</td>
              <td className={cn("py-2.5 px-4 text-right mono font-semibold", analytics.sortino >= 0 ? "text-foreground" : "text-loss")}>
                {analytics.sortino.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Max Drawdown</td>
              <td className="py-2.5 px-4 text-right mono font-semibold text-loss">-{analytics.maxDrawdown.toFixed(2)}%</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Total P&L</td>
              <td className={cn("py-2.5 px-4 text-right mono font-semibold", analytics.totalPnl >= 0 ? "text-profit" : "text-loss")}>
                {analytics.totalPnl >= 0 ? "+" : ""}${Math.abs(analytics.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2.5 px-4 text-muted-foreground">Holdings</td>
              <td className="py-2.5 px-4 text-right mono font-bold text-foreground">{analytics.holdingsCount}</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-muted-foreground">Cash Balance</td>
              <td className="py-2.5 px-4 text-right mono font-bold text-foreground">
                ${analytics.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {portfolio?.risk_score !== undefined && (
              <tr className="border-t border-border/50">
                <td className="py-2.5 px-4 text-muted-foreground">ML Risk Score</td>
                <td className={cn("py-2.5 px-4 text-right mono font-bold",
                  portfolio.risk_score > 66 ? "text-loss" :
                  portfolio.risk_score > 33 ? "text-warning" : "text-profit"
                )}>
                  {portfolio.risk_score}/100
                </td>
              </tr>
            )}
            {portfolio?.diversification_score !== undefined && (
              <tr className="border-t border-border/50">
                <td className="py-2.5 px-4 text-muted-foreground">Diversification</td>
                <td className="py-2.5 px-4 text-right mono font-bold text-foreground">
                  {(portfolio.diversification_score * 100).toFixed(0)}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Holdings Performance Bar ---
function HoldingsPerformanceBar({ holdings }) {
  if (!holdings || holdings.length === 0) return null;
  const sorted = [...holdings].sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0));
  const maxPct = Math.max(...sorted.map((h) => Math.abs(h.pnl_pct || 0)), 1);

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden mt-4">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Holdings Performance</h2>
      </div>
      <div className="p-4 space-y-3">
        {sorted.map((h) => {
          const pct = h.pnl_pct || 0;
          const width = Math.max(2, (Math.abs(pct) / maxPct) * 100);
          const isPositive = pct >= 0;
          const symbolStr = h.symbol || "?";
          return (
            <div key={h.symbol || Math.random()} className="flex items-center gap-3">
              <div className="w-14 shrink-0 flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{
                    backgroundColor: `hsl(${[...symbolStr].reduce((s, c) => s + c.charCodeAt(0), 0) % 360}, 50%, 20%)`,
                    color: `hsl(${[...symbolStr].reduce((s, c) => s + c.charCodeAt(0), 0) % 360}, 70%, 70%)`,
                  }}
                >
                  {symbolStr.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-foreground truncate">{symbolStr}</span>
              </div>
              <div className="flex-1 relative h-2 bg-muted/30 rounded-sm overflow-hidden">
                <div
                  className={cn(
                    "absolute top-0 h-full rounded-sm",
                    isPositive ? "left-0 bg-gradient-to-r from-profit/80 to-profit/40" : "right-0 bg-gradient-to-l from-loss/80 to-loss/40"
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={cn("text-xs mono font-medium w-14 text-right shrink-0", isPositive ? "text-profit" : "text-loss")}>
                {isPositive ? "+" : ""}{pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Daily Gainers / Losers ---
function GainersLosers({ holdings }) {
  if (!holdings || holdings.length === 0) return null;
  const sorted = [...holdings].sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0));
  const gainers = sorted.filter((h) => (h.pnl_pct || 0) > 0).slice(0, 5);
  const losers = sorted.filter((h) => (h.pnl_pct || 0) < 0).reverse().slice(0, 5);
  const maxGain = Math.max(...gainers.map((h) => Math.abs(h.pnl_pct || 0)), 1);
  const maxLoss = Math.max(...losers.map((h) => Math.abs(h.pnl_pct || 0)), 1);

  function renderBars(items, max, isGainer) {
    return items.map((h) => {
      const pct = Math.abs(h.pnl_pct || 0);
      const width = Math.max(5, (pct / max) * 100);
      const symbolStr = h.symbol || "?";
      return (
        <div key={h.symbol || Math.random()} className="flex items-center gap-2 py-1.5">
          <div
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{
              backgroundColor: `hsl(${[...symbolStr].reduce((s, c) => s + c.charCodeAt(0), 0) % 360}, 50%, 20%)`,
              color: `hsl(${[...symbolStr].reduce((s, c) => s + c.charCodeAt(0), 0) % 360}, 70%, 70%)`,
            }}
          >
            {symbolStr.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground w-12 shrink-0">{symbolStr}</span>
          <div className="flex-1 h-2 bg-muted/20 rounded-sm overflow-hidden">
            <div
              className={cn("h-full rounded-sm", isGainer ? "bg-profit/60" : "bg-loss/60")}
              style={{ width: `${width}%` }}
            />
          </div>
          <span className={cn("text-xs mono font-medium w-14 text-right shrink-0", isGainer ? "text-profit" : "text-loss")}>
            {isGainer ? "+" : "-"}{pct.toFixed(2)}%
          </span>
        </div>
      );
    });
  }

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Movers</h2>
      </div>
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="flex-1 p-4">
          <h3 className="text-[10px] uppercase font-semibold text-muted-foreground mb-3 tracking-wider">Top Gainers</h3>
          {gainers.length > 0 ? (
            <div className="flex flex-col gap-1">{renderBars(gainers, maxGain, true)}</div>
          ) : (
            <p className="text-xs text-muted-foreground">No gainers today</p>
          )}
        </div>
        <div className="flex-1 p-4">
          <h3 className="text-[10px] uppercase font-semibold text-muted-foreground mb-3 tracking-wider">Top Losers</h3>
          {losers.length > 0 ? (
            <div className="flex flex-col gap-1">{renderBars(losers, maxLoss, false)}</div>
          ) : (
            <p className="text-xs text-muted-foreground">No losers today</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Portfolio Change Chart (matching screenshot 1) ---
function PortfolioChangeChart({ holdings }) {
  if (!holdings || holdings.length === 0) return null;
  const chartData = holdings.map((h) => ({
    name: h.symbol,
    value: h.value || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(240, 18%, 7%)",
            border: "1px solid hsl(240, 5%, 18%)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "hsl(245, 40%, 95%)",
          }}
          itemStyle={{ color: "hsl(245, 40%, 95%)" }}
          formatter={(v) => [`$${v.toLocaleString()}`, "Value"]}
        />
        <Area
          isAnimationActive={false}
          type="linear"
          dataKey="value"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
          fill="url(#portfolioGrad)"
          dot={false}
          activeDot={{ r: 4, stroke: "hsl(217, 91%, 60%)", strokeWidth: 2, fill: "hsl(240, 18%, 7%)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Profitability Bar Chart ---
function ProfitabilityChart({ holdings }) {
  if (!holdings || holdings.length === 0) return null;
  const data = holdings.map((h) => ({
    name: h.symbol,
    pnl: h.pnl_pct || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(240, 18%, 7%)",
            border: "1px solid hsl(240, 5%, 18%)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "hsl(245, 40%, 95%)",
          }}
          itemStyle={{ color: "hsl(245, 40%, 95%)" }}
          formatter={(v) => [`${v.toFixed(2)}%`, "P&L"]}
          cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <Bar
          dataKey="pnl"
          radius={[2, 2, 0, 0]}
          activeBar={<Rectangle fill="rgba(34, 139, 225, 0.78)" stroke="rgba(155, 143, 143, 0.48)" />}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? "hsl(217, 91%, 55%)" : "hsl(217, 91%, 35%)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ====================== MAIN COMPONENT ======================
export default function DashboardPage() {
  const { portfolio, loading } = usePortfolio();
  const [transactions, setTransactions] = useState([]);
  const [chartMode, setChartMode] = useState("value"); // "value" or "profit"
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/transactions?limit=500")
      .then(({ data }) => setTransactions(data.transactions || []))
      .catch(console.error);
  }, []);

  const analytics = computeAnalytics(portfolio, transactions);
  const holdings = portfolio?.holdings || [];

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#06070a]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <span className="text-sm font-semibold">Portfolio Dashboard</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading portfolio data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#06070a] text-foreground">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
        <h1 className="text-base font-bold text-foreground">Portfolio Dashboard</h1>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground mr-2">Net Worth:</span>
            <span className="font-bold mono">${analytics.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-muted-foreground mr-2">Cash:</span>
            <span className="font-bold mono">${analytics.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Top Stat Cards (Matching screenshot 2) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Returns"
            mainValue={`${analytics.totalReturns >= 0 ? "+" : ""}${analytics.totalReturns.toFixed(2)}%`}
            trendPct={analytics.totalReturns}
            subLabel="Cumulative gain/loss"
            icon={TrendingUp}
            iconBg="bg-primary/20 text-primary"
          />
          <StatCard
            label="Sharpe Ratio"
            mainValue={analytics.sharpeRatio.toFixed(2)}
            subLabel={analytics.sharpeRatio > 1 ? "Above average" : "Below average"}
            icon={Activity}
            iconBg="bg-primary/20 text-primary"
            valueColor={analytics.sharpeRatio < 0 ? "text-loss" : "text-foreground"}
          />
          <StatCard
            label="Max Drawdown"
            mainValue={`-${analytics.maxDrawdown.toFixed(2)}%`}
            subLabel="Largest peak-to-valley drop"
            icon={ArrowDownRight}
            iconBg="bg-primary/20 text-primary"
            valueColor="text-loss"
          />
          <StatCard
            label="ROI"
            mainValue={`${analytics.roi >= 0 ? "+" : ""}${analytics.roi.toFixed(2)}%`}
            trendPct={analytics.roi}
            subLabel="Return on investment"
            icon={Target}
            iconBg="bg-primary/20 text-primary"
          />
        </div>

        {/* 70/30 Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
          {/* LEFT 70% */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Chart Area */}
            <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {chartMode === "value" ? "Portfolio Value by Asset" : "Portfolio Profitability"}
                </h2>
                <div className="flex items-center gap-1 bg-[#06070a] p-0.5 rounded-sm border border-border">
                  <button
                    onClick={() => setChartMode("value")}
                    className={cn("px-3 py-1 text-[10px] uppercase font-bold rounded-sm transition-colors", chartMode === "value" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => setChartMode("profit")}
                    className={cn("px-3 py-1 text-[10px] uppercase font-bold rounded-sm transition-colors", chartMode === "profit" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    P&L
                  </button>
                </div>
              </div>
              <div className="p-4">
                {chartMode === "value" ? (
                  <PortfolioChangeChart holdings={holdings} />
                ) : (
                  <ProfitabilityChart holdings={holdings} />
                )}
              </div>
            </div>

            {/* Daily Gainers/Losers (Side by side inside a single container) */}
            <GainersLosers holdings={holdings} />
          </div>

          {/* RIGHT 30% */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Risk Metrics Table */}
            <RiskMetricsTable analytics={analytics} portfolio={portfolio} />
            
            {/* Holdings Performance */}
            <HoldingsPerformanceBar holdings={holdings} />

            {/* Advisor Alert */}
            {portfolio?.top_advice?.[0] && (
              <div className="bg-warning/5 border border-warning/20 rounded-sm p-3 mt-4">
                <p className="text-xs font-semibold text-warning">⚠️ {portfolio.top_advice[0].title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{portfolio.top_advice[0].message}</p>
                <button
                  onClick={() => navigate("/optimize")}
                  className="text-xs text-primary font-semibold mt-2 hover:underline cursor-pointer"
                >
                  View Optimization →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
