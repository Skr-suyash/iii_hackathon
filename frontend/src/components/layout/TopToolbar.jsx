import { useState, useCallback } from "react";
import { Search, Settings, Maximize2, Minimize2, BarChart3, Clock, PanelBottomOpen, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/hooks/useMarketData";

const TIMEFRAMES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"];

const INDICATOR_GROUPS = [
  {
    name: "Volume",
    items: [
      { id: "EaseOfMovement@tv-basicstudies", label: "Ease of Movement (EOM)" },
      { id: "ChaikinMoneyFlow@tv-basicstudies", label: "Chaikin Money Flow (CMF)" },
      { id: "OnBalanceVolume@tv-basicstudies", label: "On Balance Volume (OBV)" },
    ],
  },
  {
    name: "Trend",
    items: [
      { id: "MACD@tv-basicstudies", label: "MACD" },
      { id: "DirectionalMovement@tv-basicstudies", label: "Directional Movement (ADX)" },
      { id: "MASimple@tv-basicstudies", label: "Moving Average (MA)" },
    ],
  },
  {
    name: "Volatility",
    items: [
      { id: "BB@tv-basicstudies", label: "Bollinger Bands" },
      { id: "ATR@tv-basicstudies", label: "Average True Range (ATR)" },
    ],
  },
  {
    name: "Momentum",
    items: [
      { id: "RSI@tv-basicstudies", label: "Relative Strength Index (RSI)" },
      { id: "Stochastic@tv-basicstudies", label: "Stochastic Oscillator" },
      { id: "CCI@tv-basicstudies", label: "Commodity Channel Index (CCI)" },
      { id: "ChandeMO@tv-basicstudies", label: "Chande Momentum (CMO)" },
    ],
  },
];

export default function TopToolbar({
  symbol,
  onSymbolChange,
  bottomPanelOpen,
  onToggleBottomPanel,
  rightPanelOpen,
  onToggleRightPanel,
  activeTimeframe = "1D",
  onTimeframeChange,
  activeIndicators = [],
  onToggleIndicator,
}) {
  const { stocks } = useMarketData();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
  );

  const currentStock = stocks.find((s) => s.symbol === symbol);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <div className="flex items-center h-10 bg-sidebar border-b border-border px-2 shrink-0">
      {/* Symbol search */}
      <div className="relative shrink-0">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-muted transition-colors cursor-pointer"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">{symbol}</span>
          {currentStock && (
            <span className="text-xs text-muted-foreground hidden sm:inline">{currentStock.name}</span>
          )}
        </div>

        {searchOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-sm shadow-xl">
              <div className="flex items-center px-3 py-2 border-b border-border">
                <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                <input
                  autoFocus
                  className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                  placeholder="Search symbol..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.map((s) => (
                  <button
                    key={s.symbol}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors cursor-pointer",
                      s.symbol === symbol && "bg-accent"
                    )}
                    onClick={() => {
                      onSymbolChange(s.symbol);
                      setQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.symbol}</span>
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="mono">${s.price?.toFixed(2)}</span>
                      <span className={cn("mono", s.change_pct >= 0 ? "text-profit" : "text-loss")}>
                        {s.change_pct >= 0 ? "+" : ""}{s.change_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border mx-2 shrink-0" />

      {/* Current price info */}
      {currentStock && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="mono font-semibold text-sm">${currentStock.price?.toFixed(2)}</span>
          <span className={cn("mono text-xs font-medium", currentStock.change_pct >= 0 ? "text-profit" : "text-loss")}>
            {currentStock.change_pct >= 0 ? "+" : ""}{currentStock.change_pct?.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Separator */}
      <div className="w-px h-5 bg-border mx-2 shrink-0" />

      {/* Timeframes */}
      <div className="flex items-center shrink-0">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange?.(tf)}
            className={cn(
              "px-2 py-1 text-xs rounded-sm transition-colors cursor-pointer leading-none",
              activeTimeframe === tf
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Right-side toolbar items */}
      <div className="ml-auto flex items-center gap-0.5 shrink-0 relative">
        <button
          onClick={() => setIndicatorsOpen(!indicatorsOpen)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs rounded-sm transition-colors cursor-pointer",
            indicatorsOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Indicators</span>
          {activeIndicators.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {activeIndicators.length}
            </span>
          )}
        </button>

        {indicatorsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIndicatorsOpen(false)} />
            <div className="absolute z-50 top-full right-0 mt-2 w-64 bg-popover border border-border rounded-sm shadow-xl max-h-96 overflow-y-auto">
              {INDICATOR_GROUPS.map((group) => (
                <div key={group.name} className="py-2 border-b border-border last:border-0">
                  <div className="px-3 mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.name}
                    </span>
                  </div>
                  {group.items.map((ind) => {
                    const isActive = activeIndicators.includes(ind.id);
                    return (
                      <button
                        key={ind.id}
                        onClick={() => onToggleIndicator?.(ind.id)}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {ind.label}
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        <button className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors cursor-pointer">
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Alert</span>
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Toggle bottom panel */}
        {onToggleBottomPanel && (
          <button
            onClick={onToggleBottomPanel}
            className={cn(
              "p-1.5 rounded-sm transition-colors cursor-pointer",
              bottomPanelOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={bottomPanelOpen ? "Hide bottom panel" : "Show bottom panel"}
          >
            <PanelBottomOpen className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Toggle right panel */}
        {onToggleRightPanel && (
          <button
            onClick={onToggleRightPanel}
            className={cn(
              "p-1.5 rounded-sm transition-colors cursor-pointer",
              rightPanelOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={rightPanelOpen ? "Hide right panel" : "Show right panel"}
          >
            <PanelRightOpen className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors cursor-pointer">
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors cursor-pointer"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
