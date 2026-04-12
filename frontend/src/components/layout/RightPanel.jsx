import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import client from "@/api/client";
import { useMarketData } from "@/hooks/useMarketData";

function WatchlistWidget({ onSelectSymbol }) {
  const { stocks } = useMarketData();
  const [items, setItems] = useState([]);
  const [addSymbol, setAddSymbol] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = stocks.filter(
    (s) =>
      addSymbol &&
      (s.symbol.toLowerCase().includes(addSymbol.toLowerCase()) ||
        s.name.toLowerCase().includes(addSymbol.toLowerCase()))
  );

  async function fetchWatchlist() {
    try {
      const { data } = await client.get("/watchlist");
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWatchlist();
  }, []);

  async function handleAdd(e) {
    if (e) e.preventDefault();
    if (!addSymbol.trim()) {
      setIsAdding(false);
      return;
    }
    try {
      await client.post("/watchlist", { symbol: addSymbol.trim().toUpperCase() });
      setAddSymbol("");
      setIsAdding(false);
      fetchWatchlist();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddDirect(symbol) {
    try {
      await client.post("/watchlist", { symbol: symbol.toUpperCase() });
      setAddSymbol("");
      setIsAdding(false);
      fetchWatchlist();
    } catch (err) {
      console.error(err);
    }
  }

  async function removeItem(symbol) {
    try {
      await client.delete(`/watchlist/${symbol}`);
      setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="relative flex items-center justify-between px-3 py-2 border-b border-border h-[41px]">
        <span className="text-xs font-semibold text-foreground tracking-wide uppercase">Watchlist</span>
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 relative">
            <input
              autoFocus
              className="bg-transparent text-xs outline-none w-20 text-foreground placeholder:text-muted-foreground border-b border-primary/50 focus:border-primary transition-colors"
              placeholder="Tick..."
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value)}
            />
            <button
              type="submit"
              className="text-[10px] text-primary hover:text-primary-foreground font-medium cursor-pointer shrink-0"
            >
              Add
            </button>

            {/* Autocomplete Dropdown */}
            {filtered.length > 0 && addSymbol && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAdding(false)} />
                <div className="absolute z-50 top-full right-0 mt-1 w-48 bg-popover border border-border rounded-sm shadow-xl max-h-48 overflow-y-auto">
                  {filtered.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors cursor-pointer text-left"
                      onClick={() => handleAddDirect(s.symbol)}
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{s.symbol}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px] block">{s.name}</span>
                      </div>
                      <span className="mono font-medium">${s.price?.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_24px] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
        <span>Symbol</span>
        <span className="text-right">Last</span>
        <span className="text-right w-14">Chg%</span>
        <span></span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.symbol}
            className="grid grid-cols-[1fr_auto_auto_24px] gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors cursor-pointer group items-center"
            onClick={() => onSelectSymbol?.(item.symbol)}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{item.symbol}</span>
              <span className="text-[10px] text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="mono text-foreground text-right">{item.price?.toFixed(2)}</span>
            <span className={cn("mono text-right w-14", item.change_pct >= 0 ? "text-profit" : "text-loss")}>
              {item.change_pct >= 0 ? "+" : ""}{item.change_pct?.toFixed(2)}%
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded-sm transition-all cursor-pointer"
              onClick={(e) => { e.stopPropagation(); removeItem(item.symbol); }}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        {loading && (
          <div className="px-3 py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No symbols in watchlist
          </div>
        )}
      </div>
    </div>
  );
}

function AssetDetails({ symbol, stockData }) {
  if (!stockData) return null;

  return (
    <div className="border-t border-border">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-foreground tracking-wide uppercase">Details</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold mono text-foreground">{stockData.price?.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">USD</span>
        </div>
        <div className={cn("text-xs mono font-medium", stockData.change_pct >= 0 ? "text-profit" : "text-loss")}>
          {stockData.change_pct >= 0 ? "+" : ""}{stockData.change_pct?.toFixed(2)}%
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Volume</span>
            <span className="mono text-foreground">{stockData.volume ? (stockData.volume / 1e6).toFixed(1) + "M" : "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RSI</span>
            <span className="mono text-foreground">{stockData.rsi?.toFixed(1) || "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SMA 50</span>
            <span className="mono text-foreground">{stockData.sma_50?.toFixed(2) || "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sector</span>
            <span className="text-foreground">{stockData.sector || "--"}</span>
          </div>
        </div>

        {/* Performance pills */}
        {stockData.change_pct !== undefined && (
          <div className="pt-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Performance</span>
            <div className="flex gap-1 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-sm text-[10px] mono font-medium",
                stockData.change_pct >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
              )}>
                {stockData.change_pct >= 0 ? "+" : ""}{stockData.change_pct?.toFixed(2)}% 1D
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RightPanel({ symbol, stockData, onSelectSymbol }) {
  return (
    <div className="flex flex-col h-full w-[var(--right-panel-width)] bg-sidebar border-l border-border shrink-0">
      <WatchlistWidget onSelectSymbol={onSelectSymbol} />
      <AssetDetails symbol={symbol} stockData={stockData} />
    </div>
  );
}
