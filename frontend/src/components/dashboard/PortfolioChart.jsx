import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Portfolio Value by Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 18%)" />
            <XAxis
              dataKey="name"
              stroke="hsl(240, 15%, 55%)"
              tick={{ fill: "hsl(240, 15%, 55%)", fontSize: 12 }}
            />
            <YAxis
              stroke="hsl(240, 15%, 55%)"
              tick={{ fill: "hsl(240, 15%, 55%)", fontSize: 12 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240, 18%, 7%)",
                border: "1px solid hsl(240, 5%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v) => [`$${v.toLocaleString()}`, "Value"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#valueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
