import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import client from "@/api/client";
import { useMarketData } from "@/hooks/useMarketData";

export default function WatchlistPage() {
  const { stocks } = useMarketData();
  const [addSymbol, setAddSymbol] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const filtered = stocks.filter(
    (s) =>
      addSymbol &&
      (s.symbol.toLowerCase().includes(addSymbol.toLowerCase()) ||
        s.name.toLowerCase().includes(addSymbol.toLowerCase()))
  );

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
      setRefresh((r) => r + 1);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddDirect(symbol) {
    try {
      await client.post("/watchlist", { symbol: symbol.toUpperCase() });
      setAddSymbol("");
      setIsAdding(false);
      setRefresh((r) => r + 1);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="relative flex items-center justify-between h-10 px-4 border-b border-border bg-sidebar shrink-0">
        <span className="text-sm font-semibold">Watchlist</span>
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-2 relative">
            <input
              autoFocus
              placeholder="Tick..."
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value)}
              className="bg-muted/50 text-xs outline-none px-2 py-1 flex-1 rounded-sm border border-primary/50 focus:border-primary transition-colors w-40 text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" className="h-7 text-xs px-2 shrink-0">
              Add
            </Button>

            {/* Autocomplete Dropdown */}
            {filtered.length > 0 && addSymbol && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAdding(false)} />
                <div className="absolute z-50 top-full right-0 mt-1 w-56 bg-popover border border-border rounded-sm shadow-xl max-h-56 overflow-y-auto">
                  {filtered.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors cursor-pointer text-left"
                      onClick={() => handleAddDirect(s.symbol)}
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{s.symbol}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px] block">{s.name}</span>
                      </div>
                      <span className="mono font-medium">${s.price?.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </form>
        ) : (
          <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="h-7 text-xs px-2">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto">
        <WatchlistTable key={refresh} />
      </div>
    </div>
  );
}
