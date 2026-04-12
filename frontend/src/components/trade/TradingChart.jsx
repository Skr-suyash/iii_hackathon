import { useEffect, useRef, useState, useCallback } from "react";
import { init, dispose } from "klinecharts";
import client from "@/api/client";
import { cn } from "@/lib/utils";
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

const MAIN_PANE_INDICATORS = ["MA", "EMA", "SMA", "BOLL", "SAR"];

export default function TradingChart({ symbol, timeframe, activeIndicators = [] }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  // Track which indicator controls which pane ID
  const indicatorPaneIdsRef = useRef({});

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = init(chartContainerRef.current, { styles: CHART_STYLES });
    chartInstanceRef.current = chart;
    
    return () => {
      if (chartContainerRef.current) dispose(chartContainerRef.current);
      chartInstanceRef.current = null;
    };
  }, []);

  // Sync indicators with chart
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    // Detect indicators that were added
    const currentIndicatorsList = Object.keys(indicatorPaneIdsRef.current);
    
    // Process Additions
    activeIndicators.forEach((ind) => {
      if (!currentIndicatorsList.includes(ind)) {
        if (MAIN_PANE_INDICATORS.includes(ind)) {
          // Overlay directly on the main candle pane
          chart.createIndicator(ind, true, { id: "candle_pane" });
          indicatorPaneIdsRef.current[ind] = "candle_pane";
        } else {
          // Creates a new independent bottom pane and stores the returning ID
          const paneId = chart.createIndicator(ind);
          indicatorPaneIdsRef.current[ind] = paneId;
        }
      }
    });

    // Process Removals
    currentIndicatorsList.forEach((ind) => {
      if (!activeIndicators.includes(ind)) {
        const paneId = indicatorPaneIdsRef.current[ind];
        // If it was on candle pane, just remove the indicator string.
        // Otherwise, COMPLETELY remove the created pane.
        if (paneId === "candle_pane") {
          chart.removeIndicator("candle_pane", ind);
        } else if (paneId) {
          chart.removeIndicator(paneId);
        }
        delete indicatorPaneIdsRef.current[ind];
      }
    });

  }, [activeIndicators]);

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
    
    // Map standard app timeframes to expected backend format (yfinance lowercase strings)
    const timeMap = {
      "1D": "1d",
      "5D": "5d",
      "1M": "1mo",
      "3M": "3mo",
      "6M": "6mo",
      "YTD": "ytd",
      "1Y": "1y",
      "5Y": "5y",
      "All": "max"
    };
    const yfPeriod = timeMap[timeframe] || "6mo";

    client
      .get(`/market/${symbol}/chart`, { params: { period: yfPeriod, interval: "auto" } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.data && data.data.length > 0) {
          chart.applyNewData(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch chart data:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, timeframe]);

  // Live polling simulator for hackathon
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || !symbol) return;
    
    let cancelled = false;
    const timeMap = {
      "1D": "1d", "5D": "5d", "1M": "1mo", "3M": "3mo", "6M": "6mo",
      "YTD": "ytd", "1Y": "1y", "5Y": "5y", "All": "max"
    };
    const yfPeriod = timeMap[timeframe] || "6mo";

    const fetchLatestTick = async () => {
      if (cancelled) return;
      try {
        const { data } = await client.get(`/market/${symbol}/chart/latest`, {
          params: { period: yfPeriod, interval: "auto" }
        });
        if (data?.tick && chartInstanceRef.current) {
          chartInstanceRef.current.updateData(data.tick);
        }
      } catch (err) {
        // Fail silently
      }
    };

    // Poll every 3 seconds for live simulation ticks
    const intervalId = setInterval(fetchLatestTick, 3000);
    
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [symbol, timeframe]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a10]">
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
