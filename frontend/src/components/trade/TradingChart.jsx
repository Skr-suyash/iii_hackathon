import { useEffect, useRef, useState, useCallback } from "react";
import { init, dispose } from "klinecharts";
import client from "@/api/client";
import { cn } from "@/lib/utils";
const PERIODS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];
const INDICATOR_LIST = [
  { label: "VOL", name: "VOL", isStack: false },
  { label: "MA", name: "MA", isStack: true, paneId: "candle_pane" },
  { label: "MACD", name: "MACD", isStack: false },
  { label: "RSI", name: "RSI", isStack: false },
  { label: "BOLL", name: "BOLL", isStack: true, paneId: "candle_pane" },
];
const CHART_STYLES = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      color: "rgba(45, 45, 61, 0.4)",
      style: "dashed",
      dashValue: [3, 3],
    },
    vertical: {
      show: true,
      color: "rgba(45, 45, 61, 0.25)",
      style: "dashed",
      dashValue: [3, 3],
    },
  },
  candle: {
    type: "candle_solid",
    bar: {
      upColor: "#22c55e",
      downColor: "#ef4444",
      noChangeColor: "#888888",
      upBorderColor: "#22c55e",
      downBorderColor: "#ef4444",
      upWickColor: "#22c55e",
      downWickColor: "#ef4444",
    },
    priceMark: {
      show: true,
      high: { show: true, color: "#9ca3af", textSize: 10 },
      low: { show: true, color: "#9ca3af", textSize: 10 },
      last: {
        show: true,
        upColor: "#22c55e",
        downColor: "#ef4444",
        noChangeColor: "#888888",
        line: { show: true, style: "dash", dashValue: [4, 4], size: 1 },
        text: {
          show: true, size: 10,
          paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2,
          color: "#ffffff",
        },
      },
    },
    tooltip: {
      showRule: "always",
      labels: ["T: ", "O: ", "C: ", "H: ", "L: ", "V: "],
      text: {
        size: 11, color: "#d1d5db",
        marginLeft: 8, marginTop: 4, marginRight: 6, marginBottom: 0,
      },
    },
  },
  indicator: {
    lastValueMark: { show: true },
    tooltip: { text: { size: 11, color: "#d1d5db" } },
  },
  xAxis: {
    show: true,
    axisLine: { show: true, color: "#2d2d3d" },
    tickLine: { show: true, color: "#2d2d3d" },
    tickText: { show: true, color: "#6b7280", size: 10 },
  },
  yAxis: {
    show: true,
    axisLine: { show: true, color: "#2d2d3d" },
    tickLine: { show: true, color: "#2d2d3d" },
    tickText: { show: true, color: "#6b7280", size: 10 },
  },
  separator: {
    size: 1, color: "#2d2d3d",
    activeBackgroundColor: "rgba(79, 70, 229, 0.3)",
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: { show: true, style: "dash", dashValue: [4, 2], size: 1, color: "rgba(79, 70, 229, 0.5)" },
      text: {
        show: true, color: "#e5e7eb", size: 10,
        borderColor: "#4f46e5", borderSize: 1, backgroundColor: "#4f46e5",
        paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2,
      },
    },
    vertical: {
      show: true,
      line: { show: true, style: "dash", dashValue: [4, 2], size: 1, color: "rgba(79, 70, 229, 0.5)" },
      text: {
        show: true, color: "#e5e7eb", size: 10,
        borderColor: "#4f46e5", borderSize: 1, backgroundColor: "#4f46e5",
        paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2,
      },
    },
  },
};
export default function TradingChart({ symbol }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [period, setPeriod] = useState("6mo");
  const [loading, setLoading] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState(["VOL", "MA"]);
  const indicatorPaneIdsRef = useRef({});
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = init(chartContainerRef.current, { styles: CHART_STYLES });
    chartInstanceRef.current = chart;
    if (chart) {
      const volPaneId = chart.createIndicator("VOL");
      indicatorPaneIdsRef.current["VOL"] = volPaneId;
      chart.createIndicator("MA", true, { id: "candle_pane" });
      indicatorPaneIdsRef.current["MA"] = "candle_pane";
    }
    return () => {
      if (chartContainerRef.current) dispose(chartContainerRef.current);
      chartInstanceRef.current = null;
    };
  }, []);
  // Resize observer
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver(() => chartInstanceRef.current?.resize?.());
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);
  // Fetch data when symbol or period changes
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || !symbol) return;
    let cancelled = false;
    setLoading(true);
    client
      .get(`/market/${symbol}/chart`, { params: { period, interval: "auto" } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.data && data.data.length > 0) {
          chart.applyNewData(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch chart data:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, period]);
  // Toggle indicator
  const toggleIndicator = useCallback((ind) => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    setActiveIndicators((prev) => {
      const isActive = prev.includes(ind.name);
      if (isActive) {
        const paneId = indicatorPaneIdsRef.current[ind.name];
        if (ind.paneId === "candle_pane") {
          chart.removeIndicator("candle_pane", ind.name);
        } else if (paneId) {
          chart.removeIndicator(paneId, ind.name);
        }
        delete indicatorPaneIdsRef.current[ind.name];
        return prev.filter((n) => n !== ind.name);
      } else {
        if (ind.paneId === "candle_pane") {
          chart.createIndicator(ind.name, true, { id: "candle_pane" });
          indicatorPaneIdsRef.current[ind.name] = "candle_pane";
        } else {
          const paneId = chart.createIndicator(ind.name);
          indicatorPaneIdsRef.current[ind.name] = paneId;
        }
        return [...prev, ind.name];
      }
    });
  }, []);
  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a10]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-sidebar shrink-0 gap-2">
        <div className="flex items-center gap-0.5">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-sm transition-all duration-150",
                period === p.value
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-muted-foreground mr-1.5 uppercase tracking-wider hidden sm:inline">
            Indicators
          </span>
          {INDICATOR_LIST.map((ind) => (
            <button key={ind.name} onClick={() => toggleIndicator(ind)}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-sm transition-all duration-150",
                activeIndicators.includes(ind.name)
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}>{ind.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div ref={chartContainerRef}
          style={{ width: "100%", height: "100%", backgroundColor: "#0a0a10" }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a10]/80 z-10 pointer-events-none">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading chart data…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
