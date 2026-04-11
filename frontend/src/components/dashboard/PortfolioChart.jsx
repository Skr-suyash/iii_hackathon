import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PortfolioChart({ holdings = [] }) {
  // Generate a simple portfolio value chart from holdings data
  const chartData = holdings.map((h) => ({
    name: h.symbol,
    value: h.value || 0,
    cost: (h.avg_price || 0) * (h.quantity || 0),
  }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
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
          type="linear"
          isAnimationActive={false}
          dataKey="value"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
          fill="url(#valueGrad)"
          dot={false}
          activeDot={{ r: 4, stroke: "hsl(217, 91%, 60%)", strokeWidth: 2, fill: "hsl(240, 18%, 7%)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
