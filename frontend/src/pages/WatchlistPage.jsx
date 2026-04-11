import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import client from "@/api/client";

export default function WatchlistPage() {
  const [addSymbol, setAddSymbol] = useState("");
  const [refresh, setRefresh] = useState(0);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addSymbol.trim()) return;
    try {
      await client.post("/watchlist", { symbol: addSymbol.trim().toUpperCase() });
      setAddSymbol("");
      setRefresh((r) => r + 1);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border bg-sidebar shrink-0">
        <span className="text-sm font-semibold">Watchlist</span>
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            placeholder="Add symbol (e.g. MSFT)"
            value={addSymbol}
            onChange={(e) => setAddSymbol(e.target.value)}
            className="bg-muted/50 text-xs outline-none px-2 py-1 rounded-sm border border-border focus:border-primary transition-colors w-40 text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" className="h-7 text-xs px-2">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </form>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto">
        <WatchlistTable key={refresh} />
      </div>
    </div>
  );
}
