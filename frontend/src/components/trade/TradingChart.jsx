import { useEffect, useRef } from "react";

// Map our timeframe labels to TradingView intervals
const INTERVAL_MAP = {
  "1D": "D",
  "5D": "5",      // 5 minute for intraday 5-day view
  "1M": "D",
  "3M": "D",
  "6M": "W",
  "YTD": "D",
  "1Y": "W",
  "5Y": "M",
  "All": "M",
};

// Map timeframes to date range (for range property)
const RANGE_MAP = {
  "1D": "1D",
  "5D": "5D",
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "YTD": "YTD",
  "1Y": "12M",
  "5Y": "60M",
  "All": "ALL",
};

export default function TradingChart({ symbol, timeframe = "1D", activeIndicators = [] }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;

    // Clean up previous widget
    containerRef.current.innerHTML = "";

    const interval = INTERVAL_MAP[timeframe] || "D";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: "Asia/Kolkata",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0a0a10",
          enable_publishing: false,
          allow_symbol_change: false,
          hide_top_toolbar: true,
          hide_legend: false,
          save_image: false,
          container_id: "tv-chart-container",
          range: RANGE_MAP[timeframe] || "1D",
          studies: activeIndicators,
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#22c55e",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "paneProperties.background": "#0a0a10",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.04)",
            "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.04)",
            "scalesProperties.textColor": "rgba(255,255,255,0.5)",
          },
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [symbol, timeframe, activeIndicators]);

  return (
    <div
      id="tv-chart-container"
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
