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
  const totalAssets = data.length;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      {/* Donut Chart */}
      <div className="relative w-full lg:w-1/2" style={{ minHeight: 240 }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
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
                borderRadius: "4px",
                fontSize: "12px",
                color: "hsl(245, 40%, 95%)",
              }}
              itemStyle={{ color: "hsl(245, 40%, 95%)" }}
              formatter={(v) => [`${v.toFixed(1)}%`, "Allocation"]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold mono text-foreground">{totalAssets}</span>
          <span className="text-[10px] text-muted-foreground">Total assets</span>
        </div>
      </div>

      {/* Legend table */}
      <div className="w-full lg:w-1/2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 font-medium">Sector</th>
              <th className="text-right py-1.5 font-medium">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.name} className="border-b border-border last:border-0">
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-foreground">{item.name}</span>
                  </div>
                </td>
                <td className="text-right mono text-foreground">{item.value.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
