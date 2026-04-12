import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import client from "@/api/client";
import { usePortfolio } from "@/hooks/usePortfolio";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, LineChart, Line, ComposedChart,
} from "recharts";
import {
  Target, Sparkles, AlertTriangle, Lightbulb, Zap,
  TrendingUp, TrendingDown, ArrowRight, Loader2, RefreshCw,
  Shield, ChevronRight,
} from "lucide-react";

const STOCK_UNIVERSE = [
  "AAPL","GOOGL","MSFT","AMZN","NVDA","META","TSLA","JPM","V","JNJ","PFE","XOM","DIS","NFLX","KO",
];

// ─── Ticker Selector ─────────────────────────────────────────────────────────
function TickerSelector({ selected, onChange }) {
  const available = STOCK_UNIVERSE.filter((t) => !selected.includes(t));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
        >
          {t}
          <button
            onClick={() => onChange(selected.filter((s) => s !== t))}
            className="ml-0.5 text-primary/60 hover:text-primary cursor-pointer"
          >
            ✕
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <select
          className="px-2 py-1 bg-muted border border-border rounded-sm text-xs text-foreground cursor-pointer"
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...selected, e.target.value]);
          }}
        >
          <option value="">+ Add</option>
          {available.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Objective Selector ──────────────────────────────────────────────────────
function ObjectiveSelector({ objective, onChange, targetReturn, onTargetChange }) {
  const options = [
    { value: "max_sharpe", label: "Max Sharpe", desc: "Best risk-adjusted return" },
    { value: "min_volatility", label: "Min Vol", desc: "Lowest risk portfolio" },
    { value: "efficient_return", label: "Target Return", desc: "Specify annual return" },
    { value: "hrp", label: "HRP (ML Cluster)", desc: "Hierarchical Risk Parity" },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer",
            objective === o.value
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-border/80"
          )}
        >
          {o.label}
        </button>
      ))}
      {objective === "efficient_return" && (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={(targetReturn * 100).toFixed(0)}
            onChange={(e) => onTargetChange(parseFloat(e.target.value) / 100)}
            className="w-16 px-2 py-1 bg-muted border border-border rounded-sm text-xs mono text-foreground"
          />
          <span className="text-xs text-muted-foreground">% annual</span>
        </div>
      )}
    </div>
  );
}

// ─── Risk Score Gauge ─────────────────────────────────────────────────────────
function RiskScorePanel({ riskData, loading }) {
  if (loading) {
    return (
      <div className="bg-[#0b0c10] border border-border rounded-sm p-6 flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!riskData) return null;

  const score = riskData.risk_score || 0;
  const getColor = (s) => {
    if (s <= 33) return "hsl(142, 71%, 45%)";
    if (s <= 66) return "hsl(38, 92%, 50%)";
    return "hsl(0, 84%, 60%)";
  };

  const radius = 50;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm p-5 flex flex-col items-center gap-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider self-start">
        ML Risk Score
      </h3>

      {/* Gauge */}
      <div className="relative">
        <svg width="140" height="85" viewBox="0 0 140 85">
          <path
            d="M 10 80 A 50 50 0 0 1 130 80"
            fill="none" stroke="hsl(240, 18%, 16%)" strokeWidth={7} strokeLinecap="round"
          />
          <path
            d="M 10 80 A 50 50 0 0 1 130 80"
            fill="none" stroke={getColor(score)} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-2xl font-bold mono" style={{ color: getColor(score) }}>{score}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            {riskData.risk_label || "N/A"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="w-full space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Diversification</span>
          <span className="mono font-semibold">{((riskData.diversification_score || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Efficient Frontier Chart ─────────────────────────────────────────────────
function FrontierChart({ frontierData, loading }) {
  if (loading) {
    return (
      <div className="bg-[#0b0c10] border border-border rounded-sm p-6 flex items-center justify-center" style={{ height: 340 }}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!frontierData || !frontierData.frontier?.length) return null;

  const frontier = frontierData.frontier.map((p) => ({
    vol: (p.volatility * 100).toFixed(1),
    ret: (p["return"] * 100).toFixed(1),
    volRaw: p.volatility * 100,
    retRaw: p["return"] * 100,
  }));

  const assets = (frontierData.individual_assets || []).map((a) => ({
    vol: a.volatility * 100,
    ret: a["return"] * 100,
    ticker: a.ticker,
  }));

  const sharpe = frontierData.max_sharpe_point
    ? { vol: frontierData.max_sharpe_point.volatility * 100, ret: frontierData.max_sharpe_point["return"] * 100 }
    : null;
  const minVol = frontierData.min_vol_point
    ? { vol: frontierData.min_vol_point.volatility * 100, ret: frontierData.min_vol_point["return"] * 100 }
    : null;

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Efficient Frontier</h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis
              type="number" dataKey="vol" name="Volatility (%)"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={{ value: "Volatility (%)", position: "bottom", fill: "rgba(255,255,255,0.3)", fontSize: 10, offset: -5 }}
            />
            <YAxis
              type="number" dataKey="ret" name="Return (%)"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={{ value: "Return (%)", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240, 18%, 7%)",
                border: "1px solid hsl(240, 5%, 18%)",
                borderRadius: "4px", fontSize: "11px",
                color: "hsl(245, 40%, 95%)",
              }}
              formatter={(v, name) => [`${Number(v).toFixed(2)}%`, name]}
            />
            {/* Frontier curve as scatter */}
            <Scatter name="Frontier" data={frontier.map((f) => ({ vol: f.volRaw, ret: f.retRaw }))} fill="none" line={{ stroke: "hsl(217, 91%, 60%)", strokeWidth: 2 }} lineType="fitting">
              {frontier.map((_, i) => (
                <Cell key={i} fill="transparent" r={0} />
              ))}
            </Scatter>
            {/* Individual assets */}
            <Scatter name="Assets" data={assets}>
              {assets.map((a, i) => (
                <Cell key={i} fill="hsl(217, 91%, 60%)" opacity={0.6} r={4} />
              ))}
            </Scatter>
            {/* Max Sharpe point */}
            {sharpe && (
              <Scatter name="Max Sharpe" data={[sharpe]} fill="hsl(38, 92%, 50%)" r={7} />
            )}
            {/* Min Vol point */}
            {minVol && (
              <Scatter name="Min Volatility" data={[minVol]} fill="hsl(142, 71%, 45%)" r={7} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        {/* Asset labels */}
        <div className="flex flex-wrap gap-2 mt-2 px-2">
          {assets.map((a) => (
            <span key={a.ticker} className="text-[10px] text-muted-foreground mono">
              {a.ticker}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cluster Scatter ──────────────────────────────────────────────────────────
function ClusterMap({ riskData, loading }) {
  if (loading || !riskData?.stock_positions?.length) return null;

  const positions = riskData.stock_positions;
  const clusters = riskData.clusters || {};
  const clusterWeights = riskData.portfolio_cluster_weights || {};

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Behavioral Cluster Map <span className="text-[10px] text-muted-foreground font-normal ml-1">(PCA 2D)</span>
        </h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis
              type="number" dataKey="x" name="PC1"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="number" dataKey="y" name="PC2"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240, 18%, 7%)",
                border: "1px solid hsl(240, 5%, 18%)",
                borderRadius: "4px", fontSize: "11px",
                color: "hsl(245, 40%, 95%)",
              }}
              formatter={(v, name, props) => {
                const p = props?.payload;
                return [p?.ticker || v, name];
              }}
              labelFormatter={() => ""}
            />
            <Scatter data={positions}>
              {positions.map((p, i) => {
                const clusterInfo = clusters[String(p.cluster)] || {};
                return (
                  <Cell
                    key={i}
                    fill={clusterInfo.color || "#666"}
                    r={p.in_portfolio ? 8 : 4}
                    stroke={p.in_portfolio ? "#fff" : "none"}
                    strokeWidth={p.in_portfolio ? 2 : 0}
                    opacity={p.in_portfolio ? 1 : 0.5}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend: cluster names + weights */}
        <div className="space-y-1.5 mt-3">
          {Object.entries(clusters).map(([cId, info]) => {
            const weight = clusterWeights[cId]?.weight || 0;
            return (
              <div key={cId} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: info.color }} />
                <span className="text-[11px] text-foreground flex-1 truncate">{info.name}</span>
                <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${weight * 100}%`, background: info.color }}
                  />
                </div>
                <span className="text-[10px] mono text-muted-foreground w-8 text-right">
                  {(weight * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Advisor Panel ────────────────────────────────────────────────────────────
function AdvisorPanel({ tickers, objective, optResult, riskData, isOptimizing }) {
  const [streamData, setStreamData] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!optResult || !riskData) return;
    if (isOptimizing) return;
    
    setLoading(true);
    setStreamData("");
    
    const abortController = new AbortController();
    const token = localStorage.getItem("novatrade_token");
    
    // Support Vercel -> Render routing
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const endpointUrl = baseUrl ? `${baseUrl}/optimize/advisor` : "/api/optimize/advisor";

    fetch(endpointUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ tickers, objective, opt_result: optResult, risk_data: riskData }),
      signal: abortController.signal
    })
    .then(async response => {
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.error) {
                setStreamData(prev => prev + "\n[Error: " + data.error + "]");
              } else if (data.content) {
                setStreamData(prev => prev + data.content);
              }
            } catch (e) {}
          }
        }
      }
    })
    .finally(() => setLoading(false))
    .catch(() => {});

    return () => abortController.abort();
  }, [optResult, riskData, isOptimizing, objective, tickers]);

  if (!optResult || !riskData) {
    return (
      <div className="bg-[#0b0c10] border border-border rounded-sm p-6 flex flex-col items-center justify-center h-full min-h-[250px] text-muted-foreground">
        <Shield className="w-8 h-8 mb-3 opacity-20" />
        <p className="text-xs">Run optimization to receive AI Analysis</p>
      </div>
    );
  }

  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Strategy Advisor</h3>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
      </div>
      <div className="p-5 flex-1 overflow-y-auto text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {streamData ? renderMarkdown(streamData) : (loading ? "Analyzing optimal weights..." : "No analysis available.")}
      </div>
    </div>
  );
}

// ─── Weights Comparison ───────────────────────────────────────────────────────
function WeightsComparison({ comparison }) {
  if (!comparison || Object.keys(comparison).length === 0) return null;

  const entries = Object.entries(comparison).sort(
    (a, b) => Math.abs(b[1].delta_pct) - Math.abs(a[1].delta_pct)
  );

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Current vs Optimal Weights
        </h3>
      </div>
      <div className="p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-2 px-4 text-left text-muted-foreground font-semibold">Symbol</th>
              <th className="py-2 px-4 text-right text-muted-foreground font-semibold">Current</th>
              <th className="py-2 px-4 text-center text-muted-foreground font-semibold w-32">Shift</th>
              <th className="py-2 px-4 text-right text-muted-foreground font-semibold">Optimal</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([symbol, data]) => {
              const delta = data.delta_pct;
              const isIncrease = delta > 0.005;
              const isDecrease = delta < -0.005;
              return (
                <tr key={symbol} className="border-b border-border/30">
                  <td className="py-2 px-4 font-semibold text-foreground">{symbol}</td>
                  <td className="py-2 px-4 text-right mono">{(data.current_pct * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden relative">
                        <div
                          className={cn(
                            "h-full rounded-full absolute",
                            isIncrease ? "bg-profit right-1/2" : isDecrease ? "bg-loss left-1/2" : "bg-muted-foreground"
                          )}
                          style={{
                            width: `${Math.min(Math.abs(delta) * 100 * 2, 50)}%`,
                            ...(isIncrease ? { left: "50%" } : { right: "50%" }),
                          }}
                        />
                      </div>
                      <span className={cn("text-[10px] mono w-10 text-right", isIncrease ? "text-profit" : isDecrease ? "text-loss" : "text-muted-foreground")}>
                        {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right mono font-semibold">{(data.optimal_pct * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Rebalance Actions ────────────────────────────────────────────────────────
function RebalanceActions({ trades, onRebalance, loading }) {
  if (!trades?.length) return null;

  return (
    <div className="bg-[#0b0c10] border border-border rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rebalance Actions</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {trades.map((t, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span className={cn(
                "px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase",
                t.action === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
              )}>
                {t.action}
              </span>
              <span className="text-xs mono font-semibold text-foreground">{t.quantity}</span>
              <span className="text-xs font-semibold text-foreground">{t.symbol}</span>
              <span className="text-[10px] text-muted-foreground ml-auto mono">
                ≈ ${(t.estimated_cost || t.estimated_proceeds || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onRebalance}
          disabled={loading}
          className={cn(
            "w-full py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer",
            loading
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Execute All Rebalance Trades
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Performance Stats ────────────────────────────────────────────────────────
function PerformanceStats({ performance }) {
  if (!performance) return null;
  const stats = [
    { label: "Expected Return", value: `${(performance.expected_annual_return * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-profit" },
    { label: "Volatility", value: `${(performance.annual_volatility * 100).toFixed(1)}%`, icon: TrendingDown, color: "text-warning" },
    { label: "Sharpe Ratio", value: performance.sharpe_ratio.toFixed(2), icon: Target, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#0b0c10] border border-border rounded-sm p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <s.icon className={cn("w-3 h-3", s.color)} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</span>
          </div>
          <p className={cn("text-lg font-bold mono", s.color)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function OptimizationPage() {
  const navigate = useNavigate();
  const { portfolio } = usePortfolio();

  // Controls
  const [tickers, setTickers] = useState([]);
  const [objective, setObjective] = useState("max_sharpe");
  const [targetReturn, setTargetReturn] = useState(0.2);

  // Results
  const [optResult, setOptResult] = useState(null);
  const [frontierData, setFrontierData] = useState(null);
  const [riskData, setRiskData] = useState(null);

  // Loading states
  const [optimizing, setOptimizing] = useState(false);
  const [loadingFrontier, setLoadingFrontier] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);

  // Pre-fill tickers from current holdings
  useEffect(() => {
    if (portfolio?.holdings?.length && tickers.length === 0) {
      setTickers(portfolio.holdings.map((h) => h.symbol));
    }
  }, [portfolio]);

  // Load risk analysis on mount
  useEffect(() => {
    loadRiskAnalysis();
  }, []);

  async function loadRiskAnalysis() {
    setLoadingRisk(true);
    try {
      const { data } = await client.get("/risk-analysis");
      setRiskData(data);
    } catch (err) {
      console.error("Risk analysis failed:", err);
    } finally {
      setLoadingRisk(false);
    }
  }

  async function runOptimization() {
    if (tickers.length < 2) return;
    setOptimizing(true);
    setLoadingFrontier(true);

    try {
      const [optRes, frontierRes] = await Promise.all([
        client.post("/optimize", {
          tickers,
          objective,
          target_return: objective === "efficient_return" ? targetReturn : undefined,
        }),
        client.post("/optimize/frontier", { tickers, n_points: 40 }),
      ]);
      setOptResult(optRes.data);
      setFrontierData(frontierRes.data);
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      setOptimizing(false);
      setLoadingFrontier(false);
    }
  }

  async function executeRebalance() {
    setRebalancing(true);
    try {
      const { data } = await client.post("/optimize/rebalance", {
        tickers,
        objective,
        target_return: objective === "efficient_return" ? targetReturn : undefined,
      });
      if (data.success) {
        alert(`Rebalance complete! ${data.trades_executed} trades executed.`);
        // Refresh
        runOptimization();
        loadRiskAnalysis();
      } else {
        alert(`Rebalance partial: ${data.trades_executed} executed, ${data.trades_failed} failed.`);
      }
    } catch (err) {
      console.error("Rebalance failed:", err);
      alert("Rebalance failed. Check console for details.");
    } finally {
      setRebalancing(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#06070a] text-foreground">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h1 className="text-base font-bold">Portfolio Optimizer & Risk Advisor</h1>
        </div>
        <button
          onClick={runOptimization}
          disabled={optimizing || tickers.length < 2}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer",
            optimizing || tickers.length < 2
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {optimizing ? "Optimizing…" : "Optimize"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Controls */}
        <div className="bg-[#0b0c10] border border-border rounded-sm p-5 space-y-4">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
              Tickers
            </label>
            <TickerSelector selected={tickers} onChange={setTickers} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
              Objective
            </label>
            <ObjectiveSelector
              objective={objective}
              onChange={setObjective}
              targetReturn={targetReturn}
              onTargetChange={setTargetReturn}
            />
          </div>
        </div>

        {/* Performance stats */}
        {optResult?.performance && <PerformanceStats performance={optResult.performance} />}

        {/* Charts row: Frontier + Risk Score */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
          <div className="lg:col-span-7">
            <FrontierChart frontierData={frontierData} loading={loadingFrontier} />
          </div>
          <div className="lg:col-span-3">
            <RiskScorePanel riskData={riskData} loading={loadingRisk} />
          </div>
        </div>

        {/* Cluster Map + Advisor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-auto min-h-[350px]">
          <ClusterMap riskData={riskData} loading={loadingRisk} />
          <AdvisorPanel
            tickers={tickers}
            objective={objective}
            optResult={optResult}
            riskData={riskData}
            isOptimizing={optimizing}
          />
        </div>

        {/* Weights comparison */}
        {optResult?.current_vs_optimal && <WeightsComparison comparison={optResult.current_vs_optimal} />}

        {/* Rebalance actions */}
        {optResult?.rebalance_trades && (
          <RebalanceActions
            trades={optResult.rebalance_trades}
            onRebalance={executeRebalance}
            loading={rebalancing}
          />
        )}
      </div>
    </div>
  );
}
