import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(217, 91%, 60%)",  // blue
  "hsl(142, 71%, 45%)",  // green
  "hsl(38, 92%, 50%)",   // amber
  "hsl(0, 84%, 60%)",    // red
  "hsl(280, 65%, 60%)",  // purple
  "hsl(190, 80%, 50%)",  // cyan
];

export default function AllocationPie({ sectors = [] }) {
  if (sectors.length === 0) return null;

  const data = sectors.map((s) => ({ name: s.sector, value: s.pct }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sector Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(240, 18%, 7%)",
                border: "1px solid hsl(240, 5%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v) => [`${v.toFixed(1)}%`, "Allocation"]}
            />
            <Legend
              formatter={(value) => <span style={{ color: "hsl(245, 40%, 95%)", fontSize: "12px" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
